use crate::sqlite_support::{
    open_db, resolve_workspace_app_path, resolve_workspace_app_path_by_id,
};
use crate::wave_y_domains::get_language_model_provider_env_var_names;
use glob::glob;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const ENV_FILE_NAME: &str = ".env.local";
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
const EXCLUDED_FILES: &[&str] = &["pnpm-lock.yaml", "package-lock.json"];
const ALWAYS_INCLUDE_FILES: &[&str] = &[".gitignore"];
const ALWAYS_OMITTED_FILES: &[&str] = &[".env", ".env.local"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIdRequest {
    app_id: i64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvVarDto {
    key: String,
    value: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppEnvVarsRequest {
    app_id: i64,
    env_vars: Vec<EnvVarDto>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobPathDto {
    glob_path: String,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatContextDto {
    #[serde(default)]
    context_paths: Vec<GlobPathDto>,
    #[serde(default)]
    smart_context_auto_includes: Vec<GlobPathDto>,
    #[serde(default)]
    exclude_paths: Vec<GlobPathDto>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetContextPathsRequest {
    app_id: i64,
    chat_context: ChatContextDto,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPathResultDto {
    glob_path: String,
    files: i64,
    tokens: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPathResultsDto {
    context_paths: Vec<ContextPathResultDto>,
    smart_context_auto_includes: Vec<ContextPathResultDto>,
    exclude_paths: Vec<ContextPathResultDto>,
}

#[derive(Debug)]
struct AppContextRecord {
    raw_path: String,
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

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn create_full_glob_path(app_path: &Path, glob_path: &str) -> String {
    format!(
        "{}/{}",
        normalize_path(app_path),
        glob_path.replace('\\', "/")
    )
}

fn load_app_context_record(app: &AppHandle, app_id: i64) -> Result<AppContextRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT path, chat_context FROM apps WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(AppContextRecord {
                    raw_path: row.get(0)?,
                    chat_context_json: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query app context: {error}"))?
        .ok_or_else(|| "App not found".to_string())
}

fn parse_chat_context(raw: Option<&str>) -> ChatContextDto {
    raw.and_then(|value| serde_json::from_str::<ChatContextDto>(value).ok())
        .unwrap_or_default()
}

fn env_file_path(app_path: &Path) -> PathBuf {
    app_path.join(ENV_FILE_NAME)
}

fn parse_env_file(content: &str) -> Vec<EnvVarDto> {
    let mut env_vars = Vec::new();

    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let Some(equal_index) = trimmed.find('=') else {
            continue;
        };
        if equal_index == 0 {
            continue;
        }

        let key = trimmed[..equal_index].trim().to_string();
        let value = trimmed[equal_index + 1..].trim();
        let clean_value = if let Some(stripped) = value.strip_prefix('"') {
            let mut parsed = String::new();
            let mut escaped = false;
            for character in stripped.chars() {
                if escaped {
                    parsed.push(character);
                    escaped = false;
                    continue;
                }
                match character {
                    '\\' => escaped = true,
                    '"' => break,
                    _ => parsed.push(character),
                }
            }
            parsed
        } else if let Some(stripped) = value.strip_prefix('\'') {
            stripped
                .split_once('\'')
                .map(|(parsed, _)| parsed.to_string())
                .unwrap_or_else(|| stripped.to_string())
        } else {
            value.to_string()
        };

        env_vars.push(EnvVarDto {
            key,
            value: clean_value,
        });
    }

    env_vars
}

fn needs_quotes(value: &str) -> bool {
    value.chars().any(|character| {
        character.is_whitespace() || matches!(character, '#' | '"' | '\'' | '=' | '&' | '?')
    })
}

fn serialize_env_file(env_vars: &[EnvVarDto]) -> String {
    env_vars
        .iter()
        .map(|env_var| {
            let quoted_value = if needs_quotes(&env_var.value) {
                format!("\"{}\"", env_var.value.replace('"', "\\\""))
            } else {
                env_var.value.clone()
            };
            format!("{}={}", env_var.key, quoted_value)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn should_skip_relative_path(relative_path: &str) -> bool {
    relative_path
        .split('/')
        .any(|segment| segment == "node_modules")
}

fn should_include_file(path: &Path) -> bool {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    !EXCLUDED_FILES.contains(&file_name)
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

fn should_omit_file_contents(relative_path: &str) -> bool {
    ALWAYS_OMITTED_FILES
        .iter()
        .any(|pattern| relative_path.contains(pattern))
}

fn collect_matching_files(app_path: &Path, glob_path: &str) -> Vec<ExtractedFile> {
    if !app_path.exists() {
        return Vec::new();
    }

    let Ok(paths) = glob(&create_full_glob_path(app_path, glob_path)) else {
        return Vec::new();
    };

    let mut files = Vec::new();
    for entry in paths.flatten() {
        if !entry.is_file() || !should_include_file(&entry) {
            continue;
        }

        let Ok(relative) = entry.strip_prefix(app_path) else {
            continue;
        };
        let normalized_relative_path = normalize_path(relative);
        if should_skip_relative_path(&normalized_relative_path) {
            continue;
        }

        let Ok(metadata) = entry.metadata() else {
            continue;
        };
        if metadata.len() > MAX_FILE_SIZE_BYTES {
            continue;
        }

        let content = if should_omit_file_contents(&normalized_relative_path)
            || !can_read_file_contents(&entry)
        {
            OMITTED_FILE_CONTENT.to_string()
        } else {
            fs::read_to_string(&entry).unwrap_or_else(|_| "// Error reading file".to_string())
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

fn summarize_glob_path(app_path: &Path, glob_path: &GlobPathDto) -> ContextPathResultDto {
    let files = collect_matching_files(app_path, &glob_path.glob_path);
    let formatted_output = format_codebase(&files);
    ContextPathResultDto {
        glob_path: glob_path.glob_path.clone(),
        files: files.len() as i64,
        tokens: estimate_tokens(&formatted_output),
    }
}

#[tauri::command]
pub fn get_env_vars(app: AppHandle) -> Result<Value, String> {
    let mut env_var_names = get_language_model_provider_env_var_names(&app)?;
    env_var_names.sort();
    env_var_names.dedup();

    let mut env_vars = serde_json::Map::new();
    for env_var_name in env_var_names {
        if let Ok(value) = std::env::var(&env_var_name) {
            env_vars.insert(env_var_name, Value::String(value));
        }
    }

    Ok(Value::Object(env_vars))
}

#[tauri::command]
pub fn get_app_env_vars(app: AppHandle, request: AppIdRequest) -> Result<Vec<EnvVarDto>, String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let env_file_path = env_file_path(&app_path);
    if !env_file_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&env_file_path)
        .map_err(|error| format!("failed to read env file: {error}"))?;
    Ok(parse_env_file(&content))
}

#[tauri::command]
pub fn set_app_env_vars(app: AppHandle, request: SetAppEnvVarsRequest) -> Result<(), String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let env_file_path = env_file_path(&app_path);
    let serialized = serialize_env_file(&request.env_vars);
    fs::write(env_file_path, serialized)
        .map_err(|error| format!("failed to write env file: {error}"))
}

#[tauri::command]
pub fn get_context_paths(
    app: AppHandle,
    request: AppIdRequest,
) -> Result<ContextPathResultsDto, String> {
    let record = load_app_context_record(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&record.raw_path)?;
    let chat_context = parse_chat_context(record.chat_context_json.as_deref());

    Ok(ContextPathResultsDto {
        context_paths: chat_context
            .context_paths
            .iter()
            .map(|glob_path| summarize_glob_path(&app_path, glob_path))
            .collect(),
        smart_context_auto_includes: chat_context
            .smart_context_auto_includes
            .iter()
            .map(|glob_path| summarize_glob_path(&app_path, glob_path))
            .collect(),
        exclude_paths: chat_context
            .exclude_paths
            .iter()
            .map(|glob_path| summarize_glob_path(&app_path, glob_path))
            .collect(),
    })
}

#[tauri::command]
pub fn set_context_paths(app: AppHandle, request: SetContextPathsRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    let chat_context = serde_json::to_string(&request.chat_context)
        .map_err(|error| format!("failed to serialize chat context: {error}"))?;

    let updated = connection
        .execute(
            "UPDATE apps SET chat_context = ?1 WHERE id = ?2",
            params![chat_context, request.app_id],
        )
        .map_err(|error| format!("failed to update chat context: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}
