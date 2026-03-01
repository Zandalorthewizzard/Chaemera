use crate::sqlite_support::{
    now_unix_timestamp, open_db, resolve_workspace_app_path, run_git, timestamp_to_rfc3339,
};
use rusqlite::{params, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateChatRequest {
    chat_id: i64,
    title: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchChatsRequest {
    app_id: i64,
    query: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MessageDto {
    id: i64,
    role: String,
    content: String,
    approval_state: Option<String>,
    commit_hash: Option<String>,
    source_commit_hash: Option<String>,
    db_timestamp: Option<String>,
    created_at: Option<String>,
    request_id: Option<String>,
    total_tokens: Option<i64>,
    model: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatDto {
    id: i64,
    title: String,
    messages: Vec<MessageDto>,
    initial_commit_hash: Option<String>,
    db_timestamp: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatSummaryDto {
    id: i64,
    app_id: i64,
    title: Option<String>,
    created_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatSearchResultDto {
    id: i64,
    app_id: i64,
    title: Option<String>,
    created_at: String,
    matched_message_content: Option<String>,
}

#[derive(Debug)]
struct ChatRecord {
    id: i64,
    title: Option<String>,
    initial_commit_hash: Option<String>,
}

fn read_message(row: &Row<'_>) -> Result<MessageDto, rusqlite::Error> {
    let created_at: Option<i64> = row.get("created_at")?;

    Ok(MessageDto {
        id: row.get("id")?,
        role: row.get("role")?,
        content: row.get("content")?,
        approval_state: row.get("approval_state")?,
        commit_hash: row.get("commit_hash")?,
        source_commit_hash: row.get("source_commit_hash")?,
        db_timestamp: None,
        created_at: created_at.map(timestamp_to_rfc3339),
        request_id: row.get("request_id")?,
        total_tokens: row.get("max_tokens_used")?,
        model: row.get("model")?,
    })
}

fn read_chat_summary(row: &Row<'_>) -> Result<ChatSummaryDto, rusqlite::Error> {
    let created_at: i64 = row.get("created_at")?;

    Ok(ChatSummaryDto {
        id: row.get("id")?,
        app_id: row.get("app_id")?,
        title: row.get("title")?,
        created_at: timestamp_to_rfc3339(created_at),
    })
}

fn read_chat_search_result(row: &Row<'_>) -> Result<ChatSearchResultDto, rusqlite::Error> {
    let created_at: i64 = row.get("created_at")?;

    Ok(ChatSearchResultDto {
        id: row.get("id")?,
        app_id: row.get("app_id")?,
        title: row.get("title")?,
        created_at: timestamp_to_rfc3339(created_at),
        matched_message_content: row.get("matched_message_content")?,
    })
}

fn read_chat_record(row: &Row<'_>) -> Result<ChatRecord, rusqlite::Error> {
    Ok(ChatRecord {
        id: row.get("id")?,
        title: row.get("title")?,
        initial_commit_hash: row.get("initial_commit_hash")?,
    })
}

fn resolve_initial_commit_hash(app: &AppHandle, app_id: i64) -> Result<Option<String>, String> {
    let connection = open_db(app)?;
    let app_path: Option<String> = connection
        .query_row(
            "SELECT path FROM apps WHERE id = ?1",
            params![app_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to resolve app path for chat creation: {error}"))?;

    let app_path = app_path.ok_or_else(|| "App not found".to_string())?;
    let resolved_path = resolve_workspace_app_path(&app_path)?;
    if !resolved_path.join(".git").exists() {
        return Ok(None);
    }

    match run_git(&resolved_path, &["rev-parse", "HEAD"]) {
        Ok(commit_hash) if !commit_hash.is_empty() => Ok(Some(commit_hash)),
        Ok(_) => Ok(None),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn get_chat(app: AppHandle, chat_id: i64) -> Result<ChatDto, String> {
    let connection = open_db(&app)?;
    let chat = connection
        .query_row(
            "SELECT id, title, initial_commit_hash
             FROM chats
             WHERE id = ?1",
            params![chat_id],
            read_chat_record,
        )
        .optional()
        .map_err(|error| format!("failed to load chat: {error}"))?
        .ok_or_else(|| "Chat not found".to_string())?;

    let mut statement = connection
        .prepare(
            "SELECT id, role, content, approval_state, commit_hash, source_commit_hash, created_at, request_id, max_tokens_used, model
             FROM messages
             WHERE chat_id = ?1
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| format!("failed to prepare chat messages query: {error}"))?;

    let messages = statement
        .query_map(params![chat_id], read_message)
        .map_err(|error| format!("failed to execute chat messages query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode chat messages: {error}"))?;

    Ok(ChatDto {
        id: chat.id,
        title: chat.title.unwrap_or_default(),
        messages,
        initial_commit_hash: chat.initial_commit_hash,
        db_timestamp: None,
    })
}

#[tauri::command]
pub fn get_chats(app: AppHandle, app_id: Option<i64>) -> Result<Vec<ChatSummaryDto>, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let query = if app_id.is_some() {
        "SELECT id, app_id, title, created_at FROM chats WHERE app_id = ?1 ORDER BY created_at DESC"
    } else {
        "SELECT id, app_id, title, created_at FROM chats ORDER BY created_at DESC"
    };

    let mut statement = connection
        .prepare(query)
        .map_err(|error| format!("failed to prepare chat list query: {error}"))?;

    let chats = if let Some(app_id) = app_id {
        statement
            .query_map(params![app_id], read_chat_summary)
            .map_err(|error| format!("failed to execute filtered chat list query: {error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("failed to decode filtered chat list: {error}"))?
    } else {
        statement
            .query_map([], read_chat_summary)
            .map_err(|error| format!("failed to execute chat list query: {error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("failed to decode chat list: {error}"))?
    };

    Ok(chats)
}

#[tauri::command]
pub fn create_chat(app: AppHandle, app_id: i64) -> Result<i64, String> {
    let connection = open_db(&app)?;
    let initial_commit_hash = resolve_initial_commit_hash(&app, app_id)?;

    connection
        .execute(
            "INSERT INTO chats (app_id, title, initial_commit_hash, created_at)
             VALUES (?1, NULL, ?2, ?3)",
            params![app_id, initial_commit_hash, now_unix_timestamp()],
        )
        .map_err(|error| format!("failed to create chat: {error}"))?;

    Ok(connection.last_insert_rowid())
}

#[tauri::command]
pub fn update_chat(app: AppHandle, request: UpdateChatRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE chats SET title = ?1 WHERE id = ?2",
            params![request.title, request.chat_id],
        )
        .map_err(|error| format!("failed to update chat: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn delete_chat(app: AppHandle, chat_id: i64) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute("DELETE FROM chats WHERE id = ?1", params![chat_id])
        .map_err(|error| format!("failed to delete chat: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn delete_messages(app: AppHandle, chat_id: i64) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute("DELETE FROM messages WHERE chat_id = ?1", params![chat_id])
        .map_err(|error| format!("failed to delete chat messages: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn search_chats(
    app: AppHandle,
    request: SearchChatsRequest,
) -> Result<Vec<ChatSearchResultDto>, String> {
    let query = request.query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(Vec::new()),
        Err(error) => return Err(error),
    };

    let pattern = format!("%{query}%");

    let mut title_statement = connection
        .prepare(
            "SELECT id, app_id, title, created_at, NULL AS matched_message_content
             FROM chats
             WHERE app_id = ?1 AND title LIKE ?2
             ORDER BY created_at DESC
             LIMIT 10",
        )
        .map_err(|error| format!("failed to prepare title chat search query: {error}"))?;

    let title_results = title_statement
        .query_map(
            params![request.app_id, pattern.clone()],
            read_chat_search_result,
        )
        .map_err(|error| format!("failed to execute title chat search query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode title chat search results: {error}"))?;

    let mut message_statement = connection
        .prepare(
            "SELECT chats.id, chats.app_id, chats.title, chats.created_at, messages.content AS matched_message_content
             FROM messages
             INNER JOIN chats ON messages.chat_id = chats.id
             WHERE chats.app_id = ?1 AND messages.content LIKE ?2
             ORDER BY chats.created_at DESC
             LIMIT 10",
        )
        .map_err(|error| format!("failed to prepare message chat search query: {error}"))?;

    let message_results = message_statement
        .query_map(params![request.app_id, pattern], read_chat_search_result)
        .map_err(|error| format!("failed to execute message chat search query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode message chat search results: {error}"))?;

    let mut deduped = HashMap::<i64, ChatSearchResultDto>::new();
    for result in title_results.into_iter().chain(message_results) {
        deduped.entry(result.id).or_insert(result);
    }

    let mut unique_results = deduped.into_values().collect::<Vec<_>>();
    unique_results.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(unique_results)
}
