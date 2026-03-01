use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path};
use glob::Pattern;
use ignore::{DirEntry, WalkBuilder};
use regex::Regex;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;
use tauri::AppHandle;

const DEFAULT_CONTEXT_WINDOW: i64 = 128_000;
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProposalRequest {
    chat_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RejectProposalRequest {
    chat_id: i64,
    message_id: i64,
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
struct LatestAssistantMessageRecord {
    id: i64,
    content: String,
    approval_state: Option<String>,
}

#[derive(Debug)]
struct ProposalChatRecord {
    app_path: String,
    chat_context_json: Option<String>,
}

#[derive(Debug)]
struct MessageContentRecord {
    content: String,
}

#[derive(Debug, Clone)]
struct ExtractedFile {
    path: String,
    content: String,
}

#[derive(Debug)]
pub(crate) struct WriteTag {
    pub(crate) path: String,
    pub(crate) content: String,
    pub(crate) description: Option<String>,
}

#[derive(Debug)]
pub(crate) struct RenameTag {
    pub(crate) from: String,
    pub(crate) to: String,
}

#[derive(Debug)]
pub(crate) struct SqlQueryTag {
    pub(crate) content: String,
    pub(crate) description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalResultDto {
    proposal: ProposalDto,
    chat_id: i64,
    message_id: i64,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum ProposalDto {
    Code(CodeProposalDto),
    Action(ActionProposalDto),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityRiskDto {
    r#type: String,
    title: String,
    description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeDto {
    name: String,
    path: String,
    summary: String,
    r#type: String,
    is_server_function: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlQueryDto {
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodeProposalDto {
    r#type: String,
    title: String,
    security_risks: Vec<SecurityRiskDto>,
    files_changed: Vec<FileChangeDto>,
    packages_added: Vec<String>,
    sql_queries: Vec<SqlQueryDto>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionDto {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionProposalDto {
    r#type: String,
    actions: Vec<ActionDto>,
}

fn estimate_tokens(text: &str) -> i64 {
    let length = text.chars().count() as i64;
    (length + 3) / 4
}

fn unescape_xml_attr(value: &str) -> String {
    value
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&amp;", "&")
}

fn unescape_xml_content(value: &str) -> String {
    value
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
}

fn normalize_slashes(value: &str) -> String {
    value.replace('\\', "/")
}

fn trim_code_fences(content: &str) -> String {
    let mut lines = content.lines().collect::<Vec<_>>();
    if lines
        .first()
        .is_some_and(|line| line.trim_start().starts_with("```"))
    {
        lines.remove(0);
    }
    if lines
        .last()
        .is_some_and(|line| line.trim_start().starts_with("```"))
    {
        lines.pop();
    }
    lines.join("\n")
}

fn parse_attribute(attributes: &str, name: &str) -> Option<String> {
    let pattern = format!(r#"{name}="([^"]+)""#);
    let regex = Regex::new(&pattern).expect("attribute regex must compile");
    regex
        .captures(attributes)
        .and_then(|captures| captures.get(1))
        .map(|capture| unescape_xml_attr(capture.as_str()))
}

pub(crate) fn parse_write_tags(content: &str) -> Vec<WriteTag> {
    let regex = Regex::new(r#"(?si)<dyad-write([^>]*)>(.*?)</dyad-write>"#)
        .expect("write regex must compile");

    regex
        .captures_iter(content)
        .filter_map(|captures| {
            let attributes = captures
                .get(1)
                .map(|capture| capture.as_str())
                .unwrap_or("");
            let path = parse_attribute(attributes, "path")?;
            let description = parse_attribute(attributes, "description");
            let raw_content = captures
                .get(2)
                .map(|capture| capture.as_str().trim())
                .unwrap_or("");

            Some(WriteTag {
                path: normalize_slashes(&path),
                content: trim_code_fences(&unescape_xml_content(raw_content)),
                description,
            })
        })
        .collect()
}

pub(crate) fn parse_search_replace_tags(content: &str) -> Vec<WriteTag> {
    let regex = Regex::new(r#"(?si)<dyad-search-replace([^>]*)>(.*?)</dyad-search-replace>"#)
        .expect("search replace regex must compile");

    regex
        .captures_iter(content)
        .filter_map(|captures| {
            let attributes = captures
                .get(1)
                .map(|capture| capture.as_str())
                .unwrap_or("");
            let path = parse_attribute(attributes, "path")?;
            let description = parse_attribute(attributes, "description");
            let raw_content = captures
                .get(2)
                .map(|capture| capture.as_str().trim())
                .unwrap_or("");

            Some(WriteTag {
                path: normalize_slashes(&path),
                content: trim_code_fences(&unescape_xml_content(raw_content)),
                description,
            })
        })
        .collect()
}

pub(crate) fn parse_rename_tags(content: &str) -> Vec<RenameTag> {
    let regex =
        Regex::new(r#"(?si)<dyad-rename\s+from="([^"]+)"\s+to="([^"]+)"[^>]*>.*?</dyad-rename>"#)
            .expect("rename regex must compile");

    regex
        .captures_iter(content)
        .filter_map(|captures| {
            let from = captures
                .get(1)
                .map(|capture| unescape_xml_attr(capture.as_str()))?;
            let to = captures
                .get(2)
                .map(|capture| unescape_xml_attr(capture.as_str()))?;
            Some(RenameTag {
                from: normalize_slashes(&from),
                to: normalize_slashes(&to),
            })
        })
        .collect()
}

pub(crate) fn parse_delete_tags(content: &str) -> Vec<String> {
    let regex = Regex::new(r#"(?si)<dyad-delete\s+path="([^"]+)"[^>]*>.*?</dyad-delete>"#)
        .expect("delete regex must compile");

    regex
        .captures_iter(content)
        .filter_map(|captures| {
            captures
                .get(1)
                .map(|capture| normalize_slashes(&unescape_xml_attr(capture.as_str())))
        })
        .collect()
}

pub(crate) fn parse_dependency_tags(content: &str) -> Vec<String> {
    let regex =
        Regex::new(r#"(?si)<dyad-add-dependency\s+packages="([^"]+)">[^<]*</dyad-add-dependency>"#)
            .expect("dependency regex must compile");

    let mut packages = Vec::new();
    for captures in regex.captures_iter(content) {
        if let Some(value) = captures.get(1) {
            packages.extend(
                unescape_xml_attr(value.as_str())
                    .split_whitespace()
                    .filter(|segment| !segment.is_empty())
                    .map(str::to_string),
            );
        }
    }
    packages
}

pub(crate) fn parse_chat_summary(content: &str) -> Option<String> {
    let regex = Regex::new(r#"(?si)<dyad-chat-summary>(.*?)</dyad-chat-summary>"#)
        .expect("chat summary regex must compile");

    regex
        .captures(content)
        .and_then(|captures| captures.get(1))
        .map(|capture| unescape_xml_content(capture.as_str().trim()))
        .filter(|value| !value.is_empty())
}

pub(crate) fn parse_sql_queries(content: &str) -> Vec<SqlQueryTag> {
    let regex = Regex::new(r#"(?si)<dyad-execute-sql([^>]*)>(.*?)</dyad-execute-sql>"#)
        .expect("sql regex must compile");

    regex
        .captures_iter(content)
        .map(|captures| {
            let attributes = captures
                .get(1)
                .map(|capture| capture.as_str())
                .unwrap_or("");
            let description = parse_attribute(attributes, "description");
            let raw_content = captures
                .get(2)
                .map(|capture| capture.as_str().trim())
                .unwrap_or("");

            SqlQueryTag {
                content: trim_code_fences(&unescape_xml_content(raw_content)),
                description,
            }
        })
        .collect()
}

fn parse_command_tags(content: &str) -> Vec<String> {
    let regex = Regex::new(r#"(?si)<dyad-command\s+type="([^"]+)"[^>]*></dyad-command>"#)
        .expect("command regex must compile");

    regex
        .captures_iter(content)
        .filter_map(|captures| captures.get(1))
        .map(|capture| unescape_xml_attr(capture.as_str()))
        .collect()
}

fn basename(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| path.to_string())
}

fn is_server_function(path: &str) -> bool {
    path.starts_with("supabase/functions/") && !path.starts_with("supabase/functions/_shared/")
}

fn parse_chat_context(raw: Option<&str>) -> ChatContext {
    raw.and_then(|value| serde_json::from_str::<ChatContext>(value).ok())
        .unwrap_or_default()
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

fn should_omit_file_contents(normalized_relative_path: &str) -> bool {
    if ALWAYS_OMITTED_FILES
        .iter()
        .any(|pattern| normalized_relative_path.contains(pattern))
    {
        return true;
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

fn collect_codebase_files(app_path: &Path, chat_context: &ChatContext) -> Vec<ExtractedFile> {
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
        let normalized_relative_path = normalize_slashes(&relative.to_string_lossy());

        if has_explicit_context
            && !matches_any_pattern(&normalized_relative_path, &include_patterns)
            && !matches_any_pattern(&normalized_relative_path, &auto_patterns)
        {
            continue;
        }

        if matches_any_pattern(&normalized_relative_path, &exclude_patterns) {
            continue;
        }

        let content = if should_omit_file_contents(&normalized_relative_path) {
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

fn query_latest_assistant_message(
    app: &AppHandle,
    chat_id: i64,
) -> Result<Option<LatestAssistantMessageRecord>, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT id, content, approval_state
             FROM messages
             WHERE chat_id = ?1 AND role = 'assistant'
             ORDER BY created_at DESC, id DESC
             LIMIT 1",
            params![chat_id],
            |row| {
                Ok(LatestAssistantMessageRecord {
                    id: row.get(0)?,
                    content: row.get(1)?,
                    approval_state: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load latest assistant message: {error}"))
}

fn query_proposal_chat_record(
    app: &AppHandle,
    chat_id: i64,
) -> Result<Option<ProposalChatRecord>, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT a.path, a.chat_context
             FROM chats c
             JOIN apps a ON a.id = c.app_id
             WHERE c.id = ?1",
            params![chat_id],
            |row| {
                Ok(ProposalChatRecord {
                    app_path: row.get(0)?,
                    chat_context_json: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load proposal chat record: {error}"))
}

fn query_chat_messages(app: &AppHandle, chat_id: i64) -> Result<Vec<MessageContentRecord>, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT content
             FROM messages
             WHERE chat_id = ?1
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| format!("failed to prepare proposal message query: {error}"))?;

    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok(MessageContentRecord {
                content: row.get(0)?,
            })
        })
        .map_err(|error| format!("failed to execute proposal message query: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode proposal messages: {error}"))
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

fn build_code_proposal(
    message_content: &str,
    latest_message: &LatestAssistantMessageRecord,
    chat_id: i64,
) -> Option<ProposalResultDto> {
    if latest_message.approval_state.is_some() {
        return None;
    }

    let proposal_title = parse_chat_summary(message_content);
    let write_tags = parse_write_tags(message_content);
    let search_replace_tags = parse_search_replace_tags(message_content);
    let rename_tags = parse_rename_tags(message_content);
    let delete_tags = parse_delete_tags(message_content);
    let sql_queries = parse_sql_queries(message_content);
    let packages_added = parse_dependency_tags(message_content);

    let mut files_changed = write_tags
        .iter()
        .chain(search_replace_tags.iter())
        .map(|tag| FileChangeDto {
            name: basename(&tag.path),
            path: tag.path.clone(),
            summary: tag
                .description
                .clone()
                .unwrap_or_else(|| "(no change summary found)".to_string()),
            r#type: "write".to_string(),
            is_server_function: is_server_function(&tag.path),
        })
        .collect::<Vec<_>>();

    files_changed.extend(rename_tags.iter().map(|tag| FileChangeDto {
        name: basename(&tag.to),
        path: tag.to.clone(),
        summary: format!("Rename from {} to {}", tag.from, tag.to),
        r#type: "rename".to_string(),
        is_server_function: is_server_function(&tag.to),
    }));

    files_changed.extend(delete_tags.iter().map(|tag| FileChangeDto {
        name: basename(tag),
        path: tag.clone(),
        summary: "Delete file".to_string(),
        r#type: "delete".to_string(),
        is_server_function: is_server_function(tag),
    }));

    if files_changed.is_empty() && packages_added.is_empty() && sql_queries.is_empty() {
        return None;
    }

    Some(ProposalResultDto {
        proposal: ProposalDto::Code(CodeProposalDto {
            r#type: "code-proposal".to_string(),
            title: proposal_title.unwrap_or_else(|| "Proposed File Changes".to_string()),
            security_risks: Vec::new(),
            files_changed,
            packages_added,
            sql_queries: sql_queries
                .into_iter()
                .map(|query| SqlQueryDto {
                    content: query.content,
                    description: query.description,
                })
                .collect(),
        }),
        chat_id,
        message_id: latest_message.id,
    })
}

fn build_action_proposal(
    app: &AppHandle,
    latest_message: &LatestAssistantMessageRecord,
    chat_id: i64,
) -> Result<ProposalResultDto, String> {
    let mut actions = Vec::new();
    let write_tags = parse_write_tags(&latest_message.content);
    let refactor_target = write_tags.iter().fold(None, |largest, tag| {
        let line_count = tag.content.lines().count();
        if line_count > 500 {
            match largest {
                Some((_, largest_line_count)) if largest_line_count >= line_count => largest,
                _ => Some((tag.path.clone(), line_count)),
            }
        } else {
            largest
        }
    });

    if let Some((path, _)) = refactor_target {
        actions.push(ActionDto {
            id: "refactor-file".to_string(),
            path: Some(path),
        });
    }

    if write_tags.is_empty() && latest_message.content.contains("```") {
        actions.push(ActionDto {
            id: "write-code-properly".to_string(),
            path: None,
        });
    }

    let command_tags = parse_command_tags(&latest_message.content);
    if command_tags.iter().any(|tag| tag == "rebuild") {
        actions.push(ActionDto {
            id: "rebuild".to_string(),
            path: None,
        });
    }
    if command_tags.iter().any(|tag| tag == "restart") {
        actions.push(ActionDto {
            id: "restart".to_string(),
            path: None,
        });
    }
    if command_tags.iter().any(|tag| tag == "refresh") {
        actions.push(ActionDto {
            id: "refresh".to_string(),
            path: None,
        });
    }

    let messages = query_chat_messages(app, chat_id)?;
    let chat =
        query_proposal_chat_record(app, chat_id)?.ok_or_else(|| "Chat not found".to_string())?;
    let app_path = resolve_workspace_app_path(&chat.app_path)?;
    let chat_context = parse_chat_context(chat.chat_context_json.as_deref());
    let message_history = messages
        .iter()
        .map(|message| message.content.as_str())
        .collect::<String>();
    let message_history_tokens = estimate_tokens(&message_history);
    let codebase_tokens = estimate_tokens(&format_codebase(&collect_codebase_files(
        &app_path,
        &chat_context,
    )));
    let context_window = resolve_context_window(app, &read_settings(app)?)?.min(100_000);

    if message_history_tokens + codebase_tokens > (context_window * 8) / 10 || messages.len() > 10 {
        actions.push(ActionDto {
            id: "summarize-in-new-chat".to_string(),
            path: None,
        });
    }

    actions.push(ActionDto {
        id: "keep-going".to_string(),
        path: None,
    });

    Ok(ProposalResultDto {
        proposal: ProposalDto::Action(ActionProposalDto {
            r#type: "action-proposal".to_string(),
            actions,
        }),
        chat_id,
        message_id: latest_message.id,
    })
}

#[tauri::command]
pub fn get_proposal(
    app: AppHandle,
    request: GetProposalRequest,
) -> Result<Option<ProposalResultDto>, String> {
    let latest_message = query_latest_assistant_message(&app, request.chat_id)?;
    let Some(latest_message) = latest_message else {
        return Ok(None);
    };

    if let Some(code_proposal) =
        build_code_proposal(&latest_message.content, &latest_message, request.chat_id)
    {
        return Ok(Some(code_proposal));
    }

    Ok(Some(build_action_proposal(
        &app,
        &latest_message,
        request.chat_id,
    )?))
}

#[tauri::command]
pub fn reject_proposal(app: AppHandle, request: RejectProposalRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    let rows_affected = connection
        .execute(
            "UPDATE messages
             SET approval_state = 'rejected'
             WHERE id = ?1 AND chat_id = ?2 AND role = 'assistant'",
            params![request.message_id, request.chat_id],
        )
        .map_err(|error| format!("failed to reject proposal: {error}"))?;

    if rows_affected == 0 {
        return Err("Assistant message not found".to_string());
    }

    Ok(())
}
