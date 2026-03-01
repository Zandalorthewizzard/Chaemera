use crate::sqlite_support::{open_db, timestamp_to_rfc3339};
use rusqlite::{params, Row};
use serde::Serialize;
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSearchResultDto {
    id: i64,
    name: String,
    created_at: String,
    matched_chat_title: Option<String>,
    matched_chat_message: Option<String>,
}

fn read_app_search_result(row: &Row<'_>) -> Result<AppSearchResultDto, rusqlite::Error> {
    let created_at: i64 = row.get("created_at")?;

    Ok(AppSearchResultDto {
        id: row.get("id")?,
        name: row.get("name")?,
        created_at: timestamp_to_rfc3339(created_at),
        matched_chat_title: row.get("matched_chat_title")?,
        matched_chat_message: row.get("matched_chat_message")?,
    })
}

fn escape_like_pattern(query: &str) -> String {
    query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

#[tauri::command]
pub fn search_app(app: AppHandle, query: String) -> Result<Vec<AppSearchResultDto>, String> {
    let trimmed_query = query.trim();
    if trimmed_query.is_empty() {
        return Ok(Vec::new());
    }

    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let pattern = format!("%{}%", escape_like_pattern(trimmed_query));

    let mut app_name_statement = connection
        .prepare(
            "SELECT apps.id, apps.name, apps.created_at,
                    NULL AS matched_chat_title,
                    NULL AS matched_chat_message
             FROM apps
             WHERE apps.name LIKE ?1 ESCAPE '\\'
             ORDER BY apps.created_at DESC",
        )
        .map_err(|error| format!("failed to prepare app-name search query: {error}"))?;

    let app_name_results = app_name_statement
        .query_map(params![pattern.clone()], read_app_search_result)
        .map_err(|error| format!("failed to execute app-name search query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode app-name search results: {error}"))?;

    let mut chat_title_statement = connection
        .prepare(
            "SELECT apps.id, apps.name, apps.created_at,
                    chats.title AS matched_chat_title,
                    NULL AS matched_chat_message
             FROM apps
             INNER JOIN chats ON apps.id = chats.app_id
             WHERE chats.title LIKE ?1 ESCAPE '\\'
             ORDER BY apps.created_at DESC",
        )
        .map_err(|error| format!("failed to prepare chat-title app search query: {error}"))?;

    let chat_title_results = chat_title_statement
        .query_map(params![pattern.clone()], read_app_search_result)
        .map_err(|error| format!("failed to execute chat-title app search query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode chat-title app search results: {error}"))?;

    let mut message_statement = connection
        .prepare(
            "SELECT apps.id, apps.name, apps.created_at,
                    chats.title AS matched_chat_title,
                    messages.content AS matched_chat_message
             FROM apps
             INNER JOIN chats ON apps.id = chats.app_id
             INNER JOIN messages ON chats.id = messages.chat_id
             WHERE messages.content LIKE ?1 ESCAPE '\\'
             ORDER BY apps.created_at DESC",
        )
        .map_err(|error| format!("failed to prepare message app search query: {error}"))?;

    let message_results = message_statement
        .query_map(params![pattern], read_app_search_result)
        .map_err(|error| format!("failed to execute message app search query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode message app search results: {error}"))?;

    let mut deduped = HashMap::<i64, AppSearchResultDto>::new();
    for result in app_name_results
        .into_iter()
        .chain(chat_title_results)
        .chain(message_results)
    {
        deduped.insert(result.id, result);
    }

    let mut results = deduped.into_values().collect::<Vec<_>>();
    results.sort_by(|left, right| right.created_at.cmp(&left.created_at));
    Ok(results)
}
