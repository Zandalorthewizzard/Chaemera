use crate::sqlite_support::{open_db, resolve_workspace_app_path, timestamp_to_rfc3339};
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use glob::Pattern;
use ignore::{DirEntry, WalkBuilder};
use rusqlite::params;
use serde_json::{json, Map, Value};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Manager};

const SESSION_DEBUG_SCHEMA_VERSION: i64 = 2;
const MAX_FILE_SIZE_BYTES: u64 = 1_000 * 1_024;
const OMITTED_FILE_CONTENT: &str = "// File contents excluded from context";
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

#[derive(Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatContext {
    #[serde(default)]
    context_paths: Vec<GlobPath>,
    #[serde(default)]
    smart_context_auto_includes: Vec<GlobPath>,
    #[serde(default)]
    exclude_paths: Vec<GlobPath>,
}

#[derive(Debug, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GlobPath {
    glob_path: String,
}

#[derive(Debug)]
struct AppRecord {
    id: i64,
    name: String,
    path: String,
    created_at: i64,
    updated_at: i64,
    github_org: Option<String>,
    github_repo: Option<String>,
    github_branch: Option<String>,
    supabase_project_id: Option<String>,
    supabase_organization_slug: Option<String>,
    neon_project_id: Option<String>,
    vercel_project_id: Option<String>,
    vercel_project_name: Option<String>,
    vercel_deployment_url: Option<String>,
    install_command: Option<String>,
    start_command: Option<String>,
    chat_context_json: Option<String>,
    theme_id: Option<String>,
}

#[derive(Debug)]
struct ChatRecord {
    id: i64,
    app_id: i64,
    title: Option<String>,
    initial_commit_hash: Option<String>,
    created_at: i64,
}

#[derive(Debug)]
struct MessageRecord {
    id: i64,
    role: String,
    content: String,
    created_at: i64,
    ai_messages_json: Option<String>,
    model: Option<String>,
    max_tokens_used: Option<i64>,
    approval_state: Option<String>,
    source_commit_hash: Option<String>,
    commit_hash: Option<String>,
    request_id: Option<String>,
}

#[derive(Debug)]
struct CustomProviderRecord {
    id: String,
    name: String,
    api_base_url: String,
    env_var_name: Option<String>,
}

#[derive(Debug)]
struct CustomModelRecord {
    id: i64,
    display_name: String,
    api_name: String,
    builtin_provider_id: Option<String>,
    custom_provider_id: Option<String>,
    max_output_tokens: Option<i64>,
    context_window: Option<i64>,
}

#[derive(Debug)]
struct McpServerRecord {
    id: i64,
    name: String,
    transport: String,
    command: Option<String>,
    args_json: Option<String>,
    url: Option<String>,
    enabled: bool,
}

#[derive(Debug, Clone)]
struct ExtractedFile {
    path: String,
    content: String,
}

fn parse_chat_context(raw: Option<&str>) -> ChatContext {
    raw.and_then(|value| serde_json::from_str::<ChatContext>(value).ok())
        .unwrap_or_default()
}

fn run_command_with_app_path(app: &AppHandle, program: &str, args: &[&str]) -> Option<String> {
    refresh_process_path(app);
    let output = Command::new(program)
        .args(args)
        .env("PATH", effective_path_value(app))
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        None
    } else {
        Some(stdout)
    }
}

fn get_settings_string(settings: &Value, key: &str) -> Option<String> {
    settings
        .get(key)
        .and_then(Value::as_str)
        .map(ToOwned::to_owned)
}

fn get_settings_bool(settings: &Value, key: &str) -> Option<bool> {
    settings.get(key).and_then(Value::as_bool)
}

fn get_settings_number(settings: &Value, key: &str) -> Option<i64> {
    settings.get(key).and_then(Value::as_i64)
}

fn sanitize_settings_for_debug(settings: &Value) -> Value {
    let mut provider_setup_status = Map::new();
    if let Some(provider_settings) = settings.get("providerSettings").and_then(Value::as_object) {
        for (provider, provider_setting) in provider_settings {
            let has_api_key = provider_setting
                .get("apiKey")
                .and_then(Value::as_object)
                .and_then(|api_key| api_key.get("value"))
                .and_then(Value::as_str)
                .is_some_and(|value| !value.is_empty());
            provider_setup_status.insert(provider.clone(), Value::Bool(has_api_key));
        }
    }

    json!({
        "selectedModel": {
            "name": settings
                .get("selectedModel")
                .and_then(|value| value.get("name"))
                .and_then(Value::as_str)
                .unwrap_or("auto"),
            "provider": settings
                .get("selectedModel")
                .and_then(|value| value.get("provider"))
                .and_then(Value::as_str)
                .unwrap_or("auto"),
            "customModelId": settings
                .get("selectedModel")
                .and_then(|value| value.get("customModelId"))
                .and_then(Value::as_i64),
        },
        "selectedChatMode": get_settings_string(settings, "selectedChatMode"),
        "defaultChatMode": get_settings_string(settings, "defaultChatMode"),
        "autoApproveChanges": get_settings_bool(settings, "autoApproveChanges"),
        "thinkingBudget": get_settings_string(settings, "thinkingBudget"),
        "maxChatTurnsInContext": get_settings_number(settings, "maxChatTurnsInContext"),
        "enableAutoFixProblems": get_settings_bool(settings, "enableAutoFixProblems"),
        "enableNativeGit": get_settings_bool(settings, "enableNativeGit"),
        "enableAutoUpdate": settings
            .get("enableAutoUpdate")
            .and_then(Value::as_bool)
            .unwrap_or(true),
        "releaseChannel": get_settings_string(settings, "releaseChannel").unwrap_or_else(|| "stable".to_string()),
        "runtimeMode2": get_settings_string(settings, "runtimeMode2"),
        "zoomLevel": get_settings_string(settings, "zoomLevel"),
        "previewDeviceMode": get_settings_string(settings, "previewDeviceMode"),
        "enableTurboEditsV2": get_settings_bool(settings, "enableTurboEditsV2"),
        "turboEditsMode": get_settings_string(settings, "turboEditsMode"),
        "enableSmartFilesContextMode": get_settings_bool(settings, "enableSmartFilesContextMode"),
        "enableWebSearch": get_settings_bool(settings, "enableWebSearch"),
        "smartContextOption": get_settings_string(settings, "smartContextOption"),
        "enableSupabaseWriteSqlMigration": get_settings_bool(settings, "enableSupabaseWriteSqlMigration"),
        "agentToolConsents": settings.get("agentToolConsents").cloned(),
        "experiments": settings
            .get("experiments")
            .and_then(Value::as_object)
            .map(|object| {
                let mut filtered = Map::new();
                for (key, value) in object {
                    if let Some(boolean) = value.as_bool() {
                        filtered.insert(key.clone(), Value::Bool(boolean));
                    }
                }
                Value::Object(filtered)
            }),
        "customNodePath": settings.get("customNodePath").cloned().unwrap_or(Value::Null),
        "providerSetupStatus": Value::Object(provider_setup_status),
    })
}

fn strip_images_from_ai_messages_json(raw_json: Option<&str>) -> Value {
    let Some(raw_json) = raw_json else {
        return Value::Null;
    };
    let Ok(mut value) = serde_json::from_str::<Value>(raw_json) else {
        return Value::Null;
    };

    let Some(messages) = value.get_mut("messages").and_then(Value::as_array_mut) else {
        return value;
    };

    for message in messages {
        let Some(content) = message.get_mut("content").and_then(Value::as_array_mut) else {
            continue;
        };
        for part in content {
            let part_type = part.get("type").and_then(Value::as_str);
            match part_type {
                Some("image") => {
                    if let Some(image) = part.get("image").and_then(Value::as_str) {
                        let image_len = image.len();
                        if image_len > 200 {
                            if let Some(map) = part.as_object_mut() {
                                map.insert(
                                    "_strippedByteLength".to_string(),
                                    Value::Number(serde_json::Number::from(image_len as u64)),
                                );
                                map.insert(
                                    "image".to_string(),
                                    Value::String("[stripped]".to_string()),
                                );
                            }
                        }
                    }
                }
                Some("file") => {
                    if let Some(data) = part.get("data").and_then(Value::as_str) {
                        let data_len = data.len();
                        if data_len > 200 {
                            if let Some(map) = part.as_object_mut() {
                                map.insert(
                                    "_strippedByteLength".to_string(),
                                    Value::Number(serde_json::Number::from(data_len as u64)),
                                );
                                map.insert(
                                    "data".to_string(),
                                    Value::String("[stripped]".to_string()),
                                );
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    value
}

fn app_log_contents(app: &AppHandle, lines_of_logs: usize) -> String {
    let Ok(log_dir) = app.path().app_log_dir() else {
        return String::new();
    };

    let Ok(entries) = fs::read_dir(log_dir) else {
        return String::new();
    };

    let mut newest_file = None;
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        let Ok(modified) = metadata.modified() else {
            continue;
        };
        match &newest_file {
            Some((current_modified, _)) if &modified <= current_modified => {}
            _ => newest_file = Some((modified, path)),
        }
    }

    let Some((_, log_path)) = newest_file else {
        return String::new();
    };

    let Ok(content) = fs::read_to_string(log_path) else {
        return String::new();
    };

    content
        .lines()
        .rev()
        .take(lines_of_logs)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join("\n")
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

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
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

        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if metadata.len() > MAX_FILE_SIZE_BYTES {
            continue;
        }

        let Ok(relative) = path.strip_prefix(app_path) else {
            continue;
        };
        let normalized_relative_path = normalize_path(relative);

        if has_explicit_context
            && !matches_any_pattern(&normalized_relative_path, &include_patterns)
            && !(smart_context_enabled
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

fn format_codebase(files: &[ExtractedFile]) -> String {
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

fn query_chat_record(app: &AppHandle, chat_id: i64) -> Result<ChatRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT id, app_id, title, initial_commit_hash, created_at
             FROM chats
             WHERE id = ?1",
            params![chat_id],
            |row| {
                Ok(ChatRecord {
                    id: row.get(0)?,
                    app_id: row.get(1)?,
                    title: row.get(2)?,
                    initial_commit_hash: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )
        .map_err(|error| format!("failed to load chat: {error}"))
}

fn query_app_record(app: &AppHandle, app_id: i64) -> Result<AppRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT id, name, path, created_at, updated_at, github_org, github_repo, github_branch,
                    supabase_project_id, supabase_organization_slug, neon_project_id,
                    vercel_project_id, vercel_project_name, vercel_deployment_url,
                    install_command, start_command, chat_context, theme_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(AppRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    path: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    github_org: row.get(5)?,
                    github_repo: row.get(6)?,
                    github_branch: row.get(7)?,
                    supabase_project_id: row.get(8)?,
                    supabase_organization_slug: row.get(9)?,
                    neon_project_id: row.get(10)?,
                    vercel_project_id: row.get(11)?,
                    vercel_project_name: row.get(12)?,
                    vercel_deployment_url: row.get(13)?,
                    install_command: row.get(14)?,
                    start_command: row.get(15)?,
                    chat_context_json: row.get(16)?,
                    theme_id: row.get(17)?,
                })
            },
        )
        .map_err(|error| format!("failed to load app: {error}"))
}

fn query_messages(app: &AppHandle, chat_id: i64) -> Result<Vec<MessageRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, role, content, created_at, ai_messages_json, model, max_tokens_used,
                    approval_state, source_commit_hash, commit_hash, request_id
             FROM messages
             WHERE chat_id = ?1
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| format!("failed to prepare chat message query: {error}"))?;

    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok(MessageRecord {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                ai_messages_json: row.get(4)?,
                model: row.get(5)?,
                max_tokens_used: row.get(6)?,
                approval_state: row.get(7)?,
                source_commit_hash: row.get(8)?,
                commit_hash: row.get(9)?,
                request_id: row.get(10)?,
            })
        })
        .map_err(|error| format!("failed to execute chat message query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode chat messages: {error}"))
}

fn query_custom_providers(app: &AppHandle) -> Result<Vec<CustomProviderRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, api_base_url, env_var_name
             FROM language_model_providers
             ORDER BY name ASC",
        )
        .map_err(|error| format!("failed to prepare custom providers query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(CustomProviderRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                api_base_url: row.get(2)?,
                env_var_name: row.get(3)?,
            })
        })
        .map_err(|error| format!("failed to execute custom providers query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode custom providers: {error}"))
}

fn query_custom_models(app: &AppHandle) -> Result<Vec<CustomModelRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, display_name, api_name, builtin_provider_id, custom_provider_id,
                    max_output_tokens, context_window
             FROM language_models
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare custom models query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(CustomModelRecord {
                id: row.get(0)?,
                display_name: row.get(1)?,
                api_name: row.get(2)?,
                builtin_provider_id: row.get(3)?,
                custom_provider_id: row.get(4)?,
                max_output_tokens: row.get(5)?,
                context_window: row.get(6)?,
            })
        })
        .map_err(|error| format!("failed to execute custom models query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode custom models: {error}"))
}

fn query_mcp_servers(app: &AppHandle) -> Result<Vec<McpServerRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, transport, command, args, url, enabled
             FROM mcp_servers
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare mcp servers query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            let enabled = row
                .get::<_, Option<i64>>(6)?
                .is_some_and(|value| value != 0);
            Ok(McpServerRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                transport: row.get(2)?,
                command: row.get(3)?,
                args_json: row.get(4)?,
                url: row.get(5)?,
                enabled,
            })
        })
        .map_err(|error| format!("failed to execute mcp servers query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode mcp servers: {error}"))
}

#[tauri::command]
pub fn get_session_debug_bundle(app: AppHandle, chat_id: i64) -> Result<Value, String> {
    let settings = crate::core_domains::read_settings(&app)?;
    let chat = query_chat_record(&app, chat_id)?;
    let app_record = query_app_record(&app, chat.app_id)?;
    let messages = query_messages(&app, chat_id)?;
    let custom_providers = query_custom_providers(&app)?;
    let custom_models = query_custom_models(&app)?;
    let mcp_servers = query_mcp_servers(&app)?;

    let node_version = run_command_with_app_path(&app, "node", &["--version"]);
    let pnpm_version = run_command_with_app_path(&app, "pnpm", &["--version"]);
    let node_path = if cfg!(target_os = "windows") {
        run_command_with_app_path(&app, "where", &["node"])
    } else {
        run_command_with_app_path(&app, "which", &["node"])
    };

    let telemetry_opted_out = settings
        .get("telemetryConsent")
        .and_then(Value::as_str)
        .is_some_and(|value| value == "opted_out");
    let telemetry_id = if telemetry_opted_out {
        Value::Null
    } else {
        Value::String(
            settings
                .get("telemetryUserId")
                .and_then(Value::as_str)
                .unwrap_or("unknown")
                .to_string(),
        )
    };

    let resolved_app_path = resolve_workspace_app_path(&app_record.path)?;
    let chat_context = parse_chat_context(app_record.chat_context_json.as_deref());
    let smart_context_enabled = settings
        .get("enableSmartFilesContextMode")
        .and_then(Value::as_bool)
        .unwrap_or(false);

    let codebase = if resolved_app_path.exists() {
        format_codebase(&collect_codebase_files(
            &resolved_app_path,
            &chat_context,
            smart_context_enabled,
        ))
    } else {
        format!(
            "# Error: Directory {} does not exist or is not accessible",
            resolved_app_path.to_string_lossy()
        )
    };

    let bundle = json!({
        "schemaVersion": SESSION_DEBUG_SCHEMA_VERSION,
        "exportedAt": time::OffsetDateTime::now_utc()
            .format(&time::format_description::well_known::Rfc3339)
            .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string()),
        "system": {
            "dyadVersion": app.package_info().version.to_string(),
            "platform": std::env::consts::OS,
            "architecture": std::env::consts::ARCH,
            "nodeVersion": node_version,
            "pnpmVersion": pnpm_version,
            "nodePath": node_path,
            "electronVersion": "tauri-2",
            "telemetryId": telemetry_id,
        },
        "settings": sanitize_settings_for_debug(&settings),
        "app": {
            "id": app_record.id,
            "name": app_record.name,
            "path": app_record.path,
            "createdAt": timestamp_to_rfc3339(app_record.created_at),
            "updatedAt": timestamp_to_rfc3339(app_record.updated_at),
            "githubOrg": app_record.github_org,
            "githubRepo": app_record.github_repo,
            "githubBranch": app_record.github_branch,
            "supabaseProjectId": app_record.supabase_project_id,
            "supabaseOrganizationSlug": app_record.supabase_organization_slug,
            "neonProjectId": app_record.neon_project_id,
            "vercelProjectId": app_record.vercel_project_id,
            "vercelProjectName": app_record.vercel_project_name,
            "vercelDeploymentUrl": app_record.vercel_deployment_url,
            "installCommand": app_record.install_command,
            "startCommand": app_record.start_command,
            "chatContext": app_record
                .chat_context_json
                .as_deref()
                .and_then(|value| serde_json::from_str::<Value>(value).ok()),
            "themeId": app_record.theme_id,
        },
        "chat": {
            "id": chat.id,
            "appId": chat.app_id,
            "title": chat.title,
            "initialCommitHash": chat.initial_commit_hash,
            "createdAt": timestamp_to_rfc3339(chat.created_at),
            "messages": messages
                .into_iter()
                .map(|message| {
                    json!({
                        "id": message.id,
                        "role": message.role,
                        "content": message.content,
                        "createdAt": timestamp_to_rfc3339(message.created_at),
                        "aiMessagesJson": strip_images_from_ai_messages_json(message.ai_messages_json.as_deref()),
                        "model": message.model,
                        "totalTokens": message.max_tokens_used,
                        "approvalState": message.approval_state,
                        "sourceCommitHash": message.source_commit_hash,
                        "commitHash": message.commit_hash,
                        "requestId": message.request_id,
                    })
                })
                .collect::<Vec<_>>(),
        },
        "providers": {
            "customProviders": custom_providers
                .into_iter()
                .map(|provider| {
                    json!({
                        "id": provider.id,
                        "name": provider.name,
                        "hasApiBaseUrl": !provider.api_base_url.is_empty(),
                        "envVarName": provider.env_var_name,
                    })
                })
                .collect::<Vec<_>>(),
            "customModels": custom_models
                .into_iter()
                .map(|model| {
                    json!({
                        "id": model.id,
                        "displayName": model.display_name,
                        "apiName": model.api_name,
                        "builtinProviderId": model.builtin_provider_id,
                        "customProviderId": model.custom_provider_id,
                        "maxOutputTokens": model.max_output_tokens,
                        "contextWindow": model.context_window,
                    })
                })
                .collect::<Vec<_>>(),
        },
        "mcpServers": mcp_servers
            .into_iter()
            .map(|server| {
                let args = server
                    .args_json
                    .as_deref()
                    .and_then(|value| serde_json::from_str::<Value>(value).ok())
                    .unwrap_or(Value::Null);
                json!({
                    "id": server.id,
                    "name": server.name,
                    "transport": server.transport,
                    "command": server.command,
                    "args": args,
                    "url": server.url,
                    "enabled": server.enabled,
                })
            })
            .collect::<Vec<_>>(),
        "codebase": codebase,
        "logs": app_log_contents(&app, 1_000),
    });

    Ok(bundle)
}
