use crate::sqlite_support::{now_unix_timestamp, open_db, timestamp_to_rfc3339};
use rusqlite::{params, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAppThemeRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppThemeRequest {
    app_id: i64,
    theme_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomThemeRequest {
    name: String,
    description: Option<String>,
    prompt: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCustomThemeRequest {
    id: i64,
    name: Option<String>,
    description: Option<String>,
    prompt: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCustomThemeRequest {
    id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePromptRequest {
    title: String,
    description: Option<String>,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePromptRequest {
    id: i64,
    title: Option<String>,
    description: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomThemeDto {
    id: i64,
    name: String,
    description: Option<String>,
    prompt: String,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptDto {
    id: i64,
    title: String,
    description: Option<String>,
    content: String,
    created_at: String,
    updated_at: String,
}

fn read_custom_theme(row: &Row<'_>) -> Result<CustomThemeDto, rusqlite::Error> {
    let created_at: i64 = row.get("created_at")?;
    let updated_at: i64 = row.get("updated_at")?;

    Ok(CustomThemeDto {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        prompt: row.get("prompt")?,
        created_at: timestamp_to_rfc3339(created_at),
        updated_at: timestamp_to_rfc3339(updated_at),
    })
}

fn read_prompt(row: &Row<'_>) -> Result<PromptDto, rusqlite::Error> {
    let created_at: i64 = row.get("created_at")?;
    let updated_at: i64 = row.get("updated_at")?;

    Ok(PromptDto {
        id: row.get("id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        content: row.get("content")?,
        created_at: timestamp_to_rfc3339(created_at),
        updated_at: timestamp_to_rfc3339(updated_at),
    })
}

#[tauri::command]
pub fn get_app_theme(
    app: AppHandle,
    request: GetAppThemeRequest,
) -> Result<Option<String>, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(None),
        Err(error) => return Err(error),
    };

    let theme_id: Option<String> = connection
        .query_row(
            "SELECT theme_id FROM apps WHERE id = ?1",
            params![request.app_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to read app theme: {error}"))?
        .flatten();

    Ok(theme_id)
}

#[tauri::command]
pub fn set_app_theme(app: AppHandle, request: SetAppThemeRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE apps SET theme_id = ?1 WHERE id = ?2",
            params![request.theme_id, request.app_id],
        )
        .map_err(|error| format!("failed to set app theme: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn get_custom_themes(app: AppHandle) -> Result<Vec<CustomThemeDto>, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let mut statement = connection
        .prepare(
            "SELECT id, name, description, prompt, created_at, updated_at
             FROM custom_themes
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare custom theme query: {error}"))?;

    let themes = statement
        .query_map([], read_custom_theme)
        .map_err(|error| format!("failed to execute custom theme query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode custom theme rows: {error}"))?;

    Ok(themes)
}

#[tauri::command]
pub fn create_custom_theme(
    app: AppHandle,
    request: CreateCustomThemeRequest,
) -> Result<CustomThemeDto, String> {
    let connection = open_db(&app)?;
    let now = now_unix_timestamp();

    connection
        .execute(
            "INSERT INTO custom_themes (name, description, prompt, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![request.name, request.description, request.prompt, now, now],
        )
        .map_err(|error| format!("failed to create custom theme: {error}"))?;

    let theme_id = connection.last_insert_rowid();
    connection
        .query_row(
            "SELECT id, name, description, prompt, created_at, updated_at
             FROM custom_themes
             WHERE id = ?1",
            params![theme_id],
            read_custom_theme,
        )
        .map_err(|error| format!("failed to load created custom theme: {error}"))
}

#[tauri::command]
pub fn update_custom_theme(
    app: AppHandle,
    request: UpdateCustomThemeRequest,
) -> Result<CustomThemeDto, String> {
    let connection = open_db(&app)?;
    let existing = connection
        .query_row(
            "SELECT id, name, description, prompt, created_at, updated_at
             FROM custom_themes
             WHERE id = ?1",
            params![request.id],
            read_custom_theme,
        )
        .optional()
        .map_err(|error| format!("failed to load custom theme: {error}"))?
        .ok_or_else(|| format!("Custom theme not found: {}", request.id))?;

    connection
        .execute(
            "UPDATE custom_themes
             SET name = ?1, description = ?2, prompt = ?3, updated_at = ?4
             WHERE id = ?5",
            params![
                request.name.unwrap_or(existing.name),
                request.description.or(existing.description),
                request.prompt.unwrap_or(existing.prompt),
                now_unix_timestamp(),
                request.id
            ],
        )
        .map_err(|error| format!("failed to update custom theme: {error}"))?;

    connection
        .query_row(
            "SELECT id, name, description, prompt, created_at, updated_at
             FROM custom_themes
             WHERE id = ?1",
            params![request.id],
            read_custom_theme,
        )
        .map_err(|error| format!("failed to load updated custom theme: {error}"))
}

#[tauri::command]
pub fn delete_custom_theme(
    app: AppHandle,
    request: DeleteCustomThemeRequest,
) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "DELETE FROM custom_themes WHERE id = ?1",
            params![request.id],
        )
        .map_err(|error| format!("failed to delete custom theme: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn prompts_list(app: AppHandle) -> Result<Vec<PromptDto>, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let mut statement = connection
        .prepare(
            "SELECT id, title, description, content, created_at, updated_at
             FROM prompts
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare prompt query: {error}"))?;

    let prompts = statement
        .query_map([], read_prompt)
        .map_err(|error| format!("failed to execute prompt query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode prompt rows: {error}"))?;

    Ok(prompts)
}

#[tauri::command]
pub fn prompts_create(app: AppHandle, request: CreatePromptRequest) -> Result<PromptDto, String> {
    if request.title.is_empty() || request.content.is_empty() {
        return Err("Title and content are required".to_string());
    }

    let connection = open_db(&app)?;
    let now = now_unix_timestamp();
    connection
        .execute(
            "INSERT INTO prompts (title, description, content, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                request.title,
                request.description,
                request.content,
                now,
                now
            ],
        )
        .map_err(|error| format!("failed to create prompt: {error}"))?;

    let prompt_id = connection.last_insert_rowid();
    connection
        .query_row(
            "SELECT id, title, description, content, created_at, updated_at
             FROM prompts
             WHERE id = ?1",
            params![prompt_id],
            read_prompt,
        )
        .map_err(|error| format!("failed to load created prompt: {error}"))
}

#[tauri::command]
pub fn prompts_update(app: AppHandle, request: UpdatePromptRequest) -> Result<(), String> {
    if request.id == 0 {
        return Err("Prompt id is required".to_string());
    }

    let connection = open_db(&app)?;
    let existing = connection
        .query_row(
            "SELECT id, title, description, content, created_at, updated_at
             FROM prompts
             WHERE id = ?1",
            params![request.id],
            read_prompt,
        )
        .optional()
        .map_err(|error| format!("failed to load prompt: {error}"))?
        .ok_or_else(|| "Prompt not found".to_string())?;

    connection
        .execute(
            "UPDATE prompts
             SET title = ?1, description = ?2, content = ?3, updated_at = ?4
             WHERE id = ?5",
            params![
                request.title.unwrap_or(existing.title),
                request.description.or(existing.description),
                request.content.unwrap_or(existing.content),
                now_unix_timestamp(),
                request.id
            ],
        )
        .map_err(|error| format!("failed to update prompt: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn prompts_delete(app: AppHandle, prompt_id: i64) -> Result<(), String> {
    if prompt_id == 0 {
        return Err("Prompt id is required".to_string());
    }

    let connection = open_db(&app)?;
    connection
        .execute("DELETE FROM prompts WHERE id = ?1", params![prompt_id])
        .map_err(|error| format!("failed to delete prompt: {error}"))?;
    Ok(())
}
