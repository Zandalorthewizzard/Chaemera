use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path};
use glob::Pattern;
use ignore::{DirEntry, WalkBuilder};
use regex::Regex;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use tauri::AppHandle;

const DEFAULT_CONTEXT_WINDOW: i64 = 128_000;
const MAX_FILE_SIZE_BYTES: u64 = 1_000 * 1_024;
const OMITTED_FILE_CONTENT: &str = "// File contents excluded from context";
const BUILD_SYSTEM_PROMPT_TEMPLATE: &str = include_str!("../prompt_assets/build_system_prompt.txt");
const ASK_MODE_SYSTEM_PROMPT_TEMPLATE: &str =
    include_str!("../prompt_assets/ask_mode_system_prompt.txt");
const PLAN_MODE_SYSTEM_PROMPT_TEMPLATE: &str =
    include_str!("../prompt_assets/plan_mode_system_prompt.txt");
const DEFAULT_AI_RULES: &str = include_str!("../prompt_assets/default_ai_rules.txt");
const SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT: &str =
    include_str!("../prompt_assets/supabase_not_available_system_prompt.txt");
const SUPABASE_AVAILABLE_SYSTEM_PROMPT_TEMPLATE: &str =
    include_str!("../prompt_assets/supabase_available_system_prompt.txt");
const TURBO_EDITS_V2_SYSTEM_PROMPT: &str =
    include_str!("../prompt_assets/turbo_edits_v2_system_prompt.txt");
const DEFAULT_THEME_PROMPT: &str = include_str!("../prompt_assets/default_theme_prompt.txt");
const ALLOWED_EXTENSIONS: &[&str] = &[
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
    ".css",
    ".html",
    ".md",
    ".astro",
    ".vue",
    ".svelte",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".yml",
    ".yaml",
    ".xml",
    ".plist",
    ".entitlements",
    ".kt",
    ".java",
    ".gradle",
    ".swift",
    ".py",
    ".php",
];
const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".venv",
    "venv",
];
const EXCLUDED_FILES: &[&str] = &["pnpm-lock.yaml", "package-lock.json"];
const ALWAYS_INCLUDE_FILES: &[&str] = &[".gitignore"];
const ALWAYS_OMITTED_FILES: &[&str] = &[".env", ".env.local"];
const OMITTED_FILES: &[&str] = &[
    ".env",
    ".env.local",
    "src/components/ui",
    "eslint.config",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tsconfig.base.json",
    "components.json",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenCountRequest {
    chat_id: i64,
    input: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatContext {
    #[serde(default)]
    context_paths: Vec<GlobPath>,
    #[serde(default)]
    smart_context_auto_includes: Vec<GlobPath>,
    #[serde(default)]
    exclude_paths: Vec<GlobPath>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GlobPath {
    glob_path: String,
}

#[derive(Debug)]
struct ChatAppRecord {
    app_id: i64,
    app_path: String,
    theme_id: Option<String>,
    chat_context_json: Option<String>,
    supabase_project_id: Option<String>,
    supabase_organization_slug: Option<String>,
    neon_project_id: Option<String>,
}

#[derive(Debug)]
struct MessageRecord {
    role: String,
    content: String,
    max_tokens_used: Option<i64>,
}

#[derive(Debug)]
struct MentionedAppRecord {
    name: String,
    path: String,
    chat_context_json: Option<String>,
}

#[derive(Debug, Clone)]
struct ExtractedFile {
    path: String,
    content: String,
}

fn estimate_tokens(text: &str) -> i64 {
    let length = text.chars().count() as i64;
    (length + 3) / 4
}

fn parse_chat_context(raw: Option<&str>) -> ChatContext {
    raw.and_then(|value| serde_json::from_str::<ChatContext>(value).ok())
        .unwrap_or_default()
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn should_walk_entry(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    !entry
        .file_name()
        .to_str()
        .is_some_and(|name| EXCLUDED_DIRS.contains(&name))
}

fn should_include_file(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    !EXCLUDED_FILES.contains(&file_name)
}

fn should_omit_file_contents(normalized_relative_path: &str, smart_context_enabled: bool) -> bool {
    if ALWAYS_OMITTED_FILES
        .iter()
        .any(|pattern| normalized_relative_path.contains(pattern))
    {
        return true;
    }

    if smart_context_enabled {
        return false;
    }

    OMITTED_FILES
        .iter()
        .any(|pattern| normalized_relative_path.contains(pattern))
}

fn can_read_file_contents(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    if ALWAYS_INCLUDE_FILES.contains(&file_name) {
        return true;
    }

    path.extension()
        .and_then(|value| value.to_str())
        .map(|extension| format!(".{}", extension.to_lowercase()))
        .is_some_and(|extension| ALLOWED_EXTENSIONS.contains(&extension.as_str()))
}

fn parse_glob_patterns(patterns: &[GlobPath]) -> Vec<Pattern> {
    patterns
        .iter()
        .filter_map(|pattern| Pattern::new(&pattern.glob_path).ok())
        .collect()
}

fn matches_any_pattern(path: &str, patterns: &[Pattern]) -> bool {
    patterns.iter().any(|pattern| pattern.matches(path))
}

fn collect_codebase_files(
    app_path: &Path,
    chat_context: &ChatContext,
    smart_context_enabled: bool,
) -> Vec<ExtractedFile> {
    if !app_path.exists() {
        return Vec::new();
    }

    let include_patterns = parse_glob_patterns(&chat_context.context_paths);
    let auto_patterns = parse_glob_patterns(&chat_context.smart_context_auto_includes);
    let exclude_patterns = parse_glob_patterns(&chat_context.exclude_paths);
    let has_explicit_context = !include_patterns.is_empty();
    let allow_auto_includes = smart_context_enabled && !auto_patterns.is_empty();
    let mut files = Vec::new();
    let mut builder = WalkBuilder::new(app_path);
    builder.hidden(false);
    builder.filter_entry(should_walk_entry);

    for entry in builder.build().filter_map(Result::ok) {
        if !entry
            .file_type()
            .is_some_and(|file_type| file_type.is_file())
        {
            continue;
        }

        let path = entry.path();
        if !should_include_file(path) {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        if metadata.len() > MAX_FILE_SIZE_BYTES {
            continue;
        }

        let relative = match path.strip_prefix(app_path) {
            Ok(relative) => relative,
            Err(_) => continue,
        };
        let normalized_relative_path = normalize_path(relative);

        if has_explicit_context
            && !matches_any_pattern(&normalized_relative_path, &include_patterns)
            && !(allow_auto_includes
                && matches_any_pattern(&normalized_relative_path, &auto_patterns))
        {
            continue;
        }

        if matches_any_pattern(&normalized_relative_path, &exclude_patterns) {
            continue;
        }

        let content = if should_omit_file_contents(&normalized_relative_path, smart_context_enabled)
        {
            OMITTED_FILE_CONTENT.to_string()
        } else if !can_read_file_contents(path) {
            OMITTED_FILE_CONTENT.to_string()
        } else {
            fs::read_to_string(path).unwrap_or_else(|_| "// Error reading file".to_string())
        };

        files.push(ExtractedFile {
            path: normalized_relative_path,
            content,
        });
    }

    files.sort_by(|left, right| left.path.cmp(&right.path));
    files
}

fn format_codebase(files: &[ExtractedFile], smart_context_enabled: bool) -> String {
    if smart_context_enabled {
        return files
            .iter()
            .map(|file| format!("<dyad-file={}>{}</dyad-file>", file.path, file.content))
            .collect::<Vec<_>>()
            .join("\n\n");
    }

    files
        .iter()
        .map(|file| {
            format!(
                "<dyad-file path=\"{}\">\n{}\n</dyad-file>\n\n",
                file.path, file.content
            )
        })
        .collect::<String>()
}

fn read_ai_rules(app_path: &Path) -> String {
    fs::read_to_string(app_path.join("AI_RULES.md"))
        .unwrap_or_else(|_| DEFAULT_AI_RULES.to_string())
}

fn resolve_theme_prompt(app: &AppHandle, theme_id: Option<&str>) -> Result<String, String> {
    let Some(theme_id) = theme_id.map(str::trim).filter(|value| !value.is_empty()) else {
        return Ok(String::new());
    };

    if theme_id == "default" {
        return Ok(DEFAULT_THEME_PROMPT.to_string());
    }

    if let Some(id) = theme_id.strip_prefix("custom:") {
        let Ok(custom_theme_id) = id.parse::<i64>() else {
            return Ok(String::new());
        };
        let connection = open_db(app)?;
        let prompt = connection
            .query_row(
                "SELECT prompt FROM custom_themes WHERE id = ?1",
                params![custom_theme_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("failed to query custom theme prompt: {error}"))?;

        return Ok(prompt.unwrap_or_default());
    }

    Ok(String::new())
}

fn is_turbo_edits_v2_enabled(settings: &Value) -> bool {
    settings
        .get("enableDyadPro")
        .and_then(Value::as_bool)
        .unwrap_or(false)
        && settings
            .get("enableProLazyEditsMode")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        && settings
            .get("proLazyEditsMode")
            .and_then(Value::as_str)
            .is_some_and(|mode| mode == "v2")
}

fn get_selected_chat_mode(settings: &Value) -> &str {
    match settings
        .get("selectedChatMode")
        .and_then(Value::as_str)
        .unwrap_or("build")
    {
        "local-agent" => "build",
        mode => mode,
    }
}

fn build_system_prompt(settings: &Value, ai_rules: &str, theme_prompt: &str) -> String {
    let chat_mode = get_selected_chat_mode(settings);
    let mut prompt = match chat_mode {
        "ask" => ASK_MODE_SYSTEM_PROMPT_TEMPLATE.to_string(),
        "plan" => PLAN_MODE_SYSTEM_PROMPT_TEMPLATE.to_string(),
        _ => {
            let mut build_prompt = BUILD_SYSTEM_PROMPT_TEMPLATE.to_string();
            if is_turbo_edits_v2_enabled(settings) {
                build_prompt.push_str("\n\n");
                build_prompt.push_str(TURBO_EDITS_V2_SYSTEM_PROMPT);
            }
            build_prompt
        }
    };

    prompt = prompt.replace("[[AI_RULES]]", ai_rules);
    if !theme_prompt.is_empty() {
        prompt.push_str("\n\n");
        prompt.push_str(theme_prompt);
    }

    prompt
}

fn get_supabase_context(project_id: &str, organization_slug: Option<&str>) -> String {
    if is_test_build() {
        if project_id == "test-branch-project-id" {
            return "1234".repeat(200_000);
        }
        return "[[TEST_BUILD_SUPABASE_CONTEXT]]".to_string();
    }

    let organization_block = organization_slug
        .filter(|value| !value.is_empty())
        .map(|value| format!("\n## Organization\n{value}"))
        .unwrap_or_default();

    format!(
        "# Supabase Context\n\n## Supabase Project ID\n{}{}\n",
        project_id, organization_block
    )
}

fn is_test_build() -> bool {
    std::env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn build_supabase_client_code(project_id: &str) -> String {
    let publishable_key = if is_test_build() {
        "test-publishable-key"
    } else {
        "[[SUPABASE_PUBLISHABLE_KEY]]"
    };

    format!(
        r#"
// This file is automatically generated. Do not edit it directly.
import {{ createClient }} from '@supabase/supabase-js';

const SUPABASE_URL = "https://{project_id}.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "{publishable_key}";

// Import the supabase client like this:
// import {{ supabase }} from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);"#
    )
}

fn build_supabase_available_system_prompt(project_id: &str) -> String {
    SUPABASE_AVAILABLE_SYSTEM_PROMPT_TEMPLATE.replace(
        "[[SUPABASE_CLIENT_CODE]]",
        &build_supabase_client_code(project_id),
    )
}

fn parse_app_mentions(input: &str) -> Vec<String> {
    let regex = Regex::new(r"@app:([a-zA-Z0-9_-]+)").expect("mention regex");
    let mut seen = HashSet::new();
    let mut mentions = Vec::new();

    for capture in regex.captures_iter(input) {
        if let Some(app_name) = capture.get(1).map(|value| value.as_str().to_string()) {
            let key = app_name.to_lowercase();
            if seen.insert(key) {
                mentions.push(app_name);
            }
        }
    }

    mentions
}

fn query_chat_app_record(app: &AppHandle, chat_id: i64) -> Result<ChatAppRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT
                a.id,
                a.path,
                a.theme_id,
                a.chat_context,
                a.supabase_project_id,
                a.supabase_organization_slug,
                a.neon_project_id
             FROM chats c
             JOIN apps a ON a.id = c.app_id
             WHERE c.id = ?1",
            params![chat_id],
            |row| {
                Ok(ChatAppRecord {
                    app_id: row.get(0)?,
                    app_path: row.get(1)?,
                    theme_id: row.get(2)?,
                    chat_context_json: row.get(3)?,
                    supabase_project_id: row.get(4)?,
                    supabase_organization_slug: row.get(5)?,
                    neon_project_id: row.get(6)?,
                })
            },
        )
        .map_err(|error| format!("failed to load chat app record: {error}"))
}

fn query_messages(app: &AppHandle, chat_id: i64) -> Result<Vec<MessageRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT role, content, max_tokens_used
             FROM messages
             WHERE chat_id = ?1
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| format!("failed to prepare message query: {error}"))?;

    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok(MessageRecord {
                role: row.get(0)?,
                content: row.get(1)?,
                max_tokens_used: row.get(2)?,
            })
        })
        .map_err(|error| format!("failed to execute message query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode messages: {error}"))
}

fn query_mentioned_apps(
    app: &AppHandle,
    mentioned_app_names: &[String],
    exclude_app_id: i64,
) -> Result<Vec<MentionedAppRecord>, String> {
    if mentioned_app_names.is_empty() {
        return Ok(Vec::new());
    }

    let lookup = mentioned_app_names
        .iter()
        .map(|name| name.to_lowercase())
        .collect::<HashSet<_>>();

    let connection = open_db(app)?;
    let mut statement = connection
        .prepare("SELECT id, name, path, chat_context FROM apps WHERE id != ?1")
        .map_err(|error| format!("failed to prepare mentioned apps query: {error}"))?;

    let rows = statement
        .query_map(params![exclude_app_id], |row| {
            Ok(MentionedAppRecord {
                name: row.get(1)?,
                path: row.get(2)?,
                chat_context_json: row.get(3)?,
            })
        })
        .map_err(|error| format!("failed to execute mentioned apps query: {error}"))?;

    let mut apps = Vec::new();
    for row in rows {
        let record = row.map_err(|error| format!("failed to decode mentioned app: {error}"))?;
        if lookup.contains(&record.name.to_lowercase()) {
            apps.push(record);
        }
    }
    Ok(apps)
}

fn resolve_context_window(app: &AppHandle, settings: &Value) -> Result<i64, String> {
    let selected_model = settings.get("selectedModel").unwrap_or(&Value::Null);
    let custom_model_id = selected_model.get("customModelId").and_then(Value::as_i64);
    let provider = selected_model
        .get("provider")
        .and_then(Value::as_str)
        .unwrap_or("");
    let model_name = selected_model
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("");

    let connection = match open_db(app) {
        Ok(connection) => connection,
        Err(_) => return Ok(DEFAULT_CONTEXT_WINDOW),
    };

    if let Some(custom_model_id) = custom_model_id {
        let context_window = connection
            .query_row(
                "SELECT context_window FROM language_models WHERE id = ?1",
                params![custom_model_id],
                |row| row.get::<_, Option<i64>>(0),
            )
            .optional()
            .map_err(|error| format!("failed to query custom model context window: {error}"))?
            .flatten();

        if let Some(context_window) = context_window {
            return Ok(context_window);
        }
    }

    let context_window = connection
        .query_row(
            "SELECT context_window
             FROM language_models
             WHERE (builtin_provider_id = ?1 OR custom_provider_id = ?1)
               AND api_name = ?2
             LIMIT 1",
            params![provider, model_name],
            |row| row.get::<_, Option<i64>>(0),
        )
        .optional()
        .map_err(|error| format!("failed to query model context window: {error}"))?
        .flatten();

    Ok(context_window.unwrap_or(DEFAULT_CONTEXT_WINDOW))
}

#[tauri::command]
pub fn chat_count_tokens(app: AppHandle, request: TokenCountRequest) -> Result<Value, String> {
    let settings = read_settings(&app)?;
    let chat = query_chat_app_record(&app, request.chat_id)?;
    let messages = query_messages(&app, request.chat_id)?;
    let app_path = resolve_workspace_app_path(&chat.app_path)?;
    let chat_context = parse_chat_context(chat.chat_context_json.as_deref());
    let smart_context_enabled = settings
        .get("enableDyadPro")
        .and_then(Value::as_bool)
        .unwrap_or(false)
        && settings
            .get("enableProSmartFilesContextMode")
            .and_then(Value::as_bool)
            .unwrap_or(false);

    let message_history = messages
        .iter()
        .map(|message| message.content.as_str())
        .collect::<String>();
    let message_history_tokens = estimate_tokens(&message_history);
    let input_tokens = estimate_tokens(&request.input);

    let ai_rules = read_ai_rules(&app_path);
    let theme_prompt = resolve_theme_prompt(&app, chat.theme_id.as_deref())?;
    let mut system_prompt = build_system_prompt(&settings, &ai_rules, &theme_prompt);
    let supabase_context = if let Some(project_id) = chat.supabase_project_id.as_deref() {
        system_prompt.push_str("\n\n");
        system_prompt.push_str(&build_supabase_available_system_prompt(project_id));
        get_supabase_context(project_id, chat.supabase_organization_slug.as_deref())
    } else if chat.neon_project_id.is_none() {
        system_prompt.push_str("\n\n");
        system_prompt.push_str(SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT);
        String::new()
    } else {
        String::new()
    };
    let system_prompt_tokens = estimate_tokens(&format!("{}{}", system_prompt, supabase_context));

    let codebase_files = collect_codebase_files(&app_path, &chat_context, smart_context_enabled);
    let codebase_tokens = estimate_tokens(&format_codebase(&codebase_files, smart_context_enabled));

    let mentioned_app_names = parse_app_mentions(&request.input);
    let mentioned_apps = query_mentioned_apps(&app, &mentioned_app_names, chat.app_id)?;
    let mut mentioned_apps_content = String::new();
    for mentioned_app in mentioned_apps {
        let mentioned_app_path = match resolve_workspace_app_path(&mentioned_app.path) {
            Ok(path) => path,
            Err(_) => continue,
        };
        let mentioned_context = parse_chat_context(mentioned_app.chat_context_json.as_deref());
        let formatted_output = format_codebase(
            &collect_codebase_files(
                &mentioned_app_path,
                &mentioned_context,
                smart_context_enabled,
            ),
            false,
        );
        if !formatted_output.is_empty() {
            mentioned_apps_content.push_str(&format!(
                "\n\n=== Referenced App: {} ===\n{}",
                mentioned_app.name, formatted_output
            ));
        }
    }
    let mentioned_apps_tokens = estimate_tokens(&mentioned_apps_content);

    let actual_max_tokens = messages
        .iter()
        .rev()
        .find(|message| message.role == "assistant")
        .and_then(|message| message.max_tokens_used);
    let estimated_total_tokens = message_history_tokens
        + input_tokens
        + system_prompt_tokens
        + codebase_tokens
        + mentioned_apps_tokens;

    Ok(json!({
        "estimatedTotalTokens": estimated_total_tokens,
        "actualMaxTokens": actual_max_tokens,
        "messageHistoryTokens": message_history_tokens,
        "codebaseTokens": codebase_tokens,
        "mentionedAppsTokens": mentioned_apps_tokens,
        "inputTokens": input_tokens,
        "systemPromptTokens": system_prompt_tokens,
        "contextWindow": resolve_context_window(&app, &settings)?,
    }))
}
