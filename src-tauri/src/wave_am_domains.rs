use crate::sqlite_support::{now_unix_timestamp, open_db, resolve_workspace_app_path, run_git};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::json;
use tauri::AppHandle;

const REVERT_COMMIT_MESSAGE_PREFIX: &str = "Reverted all changes back to version";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentChatMessageIdRequest {
    chat_id: i64,
    message_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevertVersionRequest {
    app_id: i64,
    previous_version_id: String,
    current_chat_message_id: Option<CurrentChatMessageIdRequest>,
}

#[derive(Debug)]
struct AppRecord {
    raw_path: String,
    supabase_project_id: Option<String>,
    neon_project_id: Option<String>,
    neon_development_branch_id: Option<String>,
}

#[derive(Debug)]
struct VersionRecord {
    neon_db_timestamp: Option<String>,
}

#[derive(Debug)]
struct MessageAnchor {
    id: i64,
    chat_id: i64,
}

fn read_app_record(app: &AppHandle, app_id: i64) -> Result<AppRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT path, supabase_project_id, neon_project_id, neon_development_branch_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(AppRecord {
                    raw_path: row.get(0)?,
                    supabase_project_id: row.get(1)?,
                    neon_project_id: row.get(2)?,
                    neon_development_branch_id: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query app: {error}"))?
        .ok_or_else(|| "App not found".to_string())
}

fn read_version_record(
    app: &AppHandle,
    app_id: i64,
    commit_hash: &str,
) -> Result<Option<VersionRecord>, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT neon_db_timestamp
             FROM versions
             WHERE app_id = ?1 AND commit_hash = ?2",
            params![app_id, commit_hash],
            |row| {
                Ok(VersionRecord {
                    neon_db_timestamp: row.get(0)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query version record: {error}"))
}

fn read_message_anchor_by_commit(
    app: &AppHandle,
    commit_hash: &str,
) -> Result<Option<MessageAnchor>, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT id, chat_id
             FROM messages
             WHERE commit_hash = ?1
             ORDER BY id DESC
             LIMIT 1",
            params![commit_hash],
            |row| {
                Ok(MessageAnchor {
                    id: row.get(0)?,
                    chat_id: row.get(1)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query revert anchor message: {error}"))
}

fn ensure_clean_workspace(app_path: &std::path::Path) -> Result<(), String> {
    let status = run_git(app_path, &["status", "--porcelain"])?;
    if status.trim().is_empty() {
        return Ok(());
    }

    Err("Cannot revert: working tree has uncommitted changes.".to_string())
}

fn stage_revert(app_path: &std::path::Path, target_oid: &str) -> Result<(), String> {
    let current_commit = run_git(app_path, &["rev-parse", "HEAD"])?;
    if current_commit == target_oid {
        return Ok(());
    }

    ensure_clean_workspace(app_path)?;
    run_git(app_path, &["reset", "--hard", target_oid])?;
    run_git(app_path, &["reset", "--soft", &current_commit]).map(|_| ())
}

fn commit_revert_if_needed(
    app_path: &std::path::Path,
    previous_version_id: &str,
) -> Result<(), String> {
    let status = run_git(app_path, &["status", "--porcelain"])?;
    if status.trim().is_empty() {
        return Ok(());
    }

    run_git(
        app_path,
        &[
            "-c",
            "user.name=[chaemera]",
            "-c",
            "user.email=git@chaemera.local",
            "commit",
            "-m",
            &format!("{REVERT_COMMIT_MESSAGE_PREFIX} {previous_version_id}"),
        ],
    )
    .map(|_| ())
}

fn delete_messages_after_anchor(
    app: &AppHandle,
    current_chat_message_id: Option<&CurrentChatMessageIdRequest>,
    previous_version_id: &str,
) -> Result<(), String> {
    let connection = open_db(app)?;

    if let Some(anchor) = current_chat_message_id {
        connection
            .execute(
                "DELETE FROM messages
                 WHERE chat_id = ?1 AND id >= ?2",
                params![anchor.chat_id, anchor.message_id],
            )
            .map_err(|error| format!("failed to delete reverted chat messages: {error}"))?;
        return Ok(());
    }

    let Some(anchor) = read_message_anchor_by_commit(app, previous_version_id)? else {
        return Ok(());
    };

    connection
        .execute(
            "DELETE FROM messages
             WHERE chat_id = ?1 AND id > ?2",
            params![anchor.chat_id, anchor.id],
        )
        .map_err(|error| format!("failed to delete messages after version anchor: {error}"))?;

    Ok(())
}

fn store_neon_timestamp_best_effort(
    app: &AppHandle,
    app_id: i64,
    app_path: &std::path::Path,
    neon_project_id: Option<&str>,
    neon_development_branch_id: Option<&str>,
) -> Result<(), String> {
    if neon_project_id.is_none() || neon_development_branch_id.is_none() {
        return Ok(());
    }

    let commit_hash = run_git(app_path, &["rev-parse", "HEAD"])?;
    let connection = open_db(app)?;
    let unix_now = now_unix_timestamp();
    let best_effort_timestamp = crate::sqlite_support::timestamp_to_rfc3339(unix_now);

    let existing_version_id = connection
        .query_row(
            "SELECT id
             FROM versions
             WHERE app_id = ?1 AND commit_hash = ?2",
            params![app_id, commit_hash],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("failed to query existing version record: {error}"))?;

    if let Some(version_id) = existing_version_id {
        connection
            .execute(
                "UPDATE versions
                 SET neon_db_timestamp = ?1,
                     updated_at = ?2
                 WHERE id = ?3",
                params![best_effort_timestamp, unix_now, version_id],
            )
            .map_err(|error| format!("failed to update current version Neon timestamp: {error}"))?;
    } else {
        connection
            .execute(
                "INSERT INTO versions (app_id, commit_hash, neon_db_timestamp, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![app_id, commit_hash, best_effort_timestamp, unix_now, unix_now],
            )
            .map_err(|error| format!("failed to insert current version Neon timestamp: {error}"))?;
    }

    Ok(())
}

#[tauri::command]
pub fn revert_version(
    app: AppHandle,
    request: RevertVersionRequest,
) -> Result<serde_json::Value, String> {
    let previous_version_id = request.previous_version_id.trim();
    if previous_version_id.is_empty() {
        return Err("previousVersionId is required".to_string());
    }

    let app_record = read_app_record(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.raw_path)?;

    run_git(&app_path, &["checkout", "main"]).map(|_| ())?;

    store_neon_timestamp_best_effort(
        &app,
        request.app_id,
        &app_path,
        app_record.neon_project_id.as_deref(),
        app_record.neon_development_branch_id.as_deref(),
    )?;

    stage_revert(&app_path, previous_version_id)?;
    commit_revert_if_needed(&app_path, previous_version_id)?;
    delete_messages_after_anchor(
        &app,
        request.current_chat_message_id.as_ref(),
        previous_version_id,
    )?;

    let mut warnings = Vec::new();

    if app_record
        .neon_project_id
        .as_deref()
        .zip(app_record.neon_development_branch_id.as_deref())
        .is_some()
    {
        if read_version_record(&app, request.app_id, previous_version_id)?
            .and_then(|version| version.neon_db_timestamp)
            .is_some()
        {
            warnings.push(
                "Database restore for Neon-linked apps is not yet fully implemented in the Tauri path; code was reverted but database state may still require manual restore.".to_string(),
            );
        }
    }

    if app_record.supabase_project_id.is_some() {
        warnings.push(
            "Supabase edge function redeploy after revert is not yet implemented in the Tauri path; review deployed functions manually if this app uses Supabase functions.".to_string(),
        );
    }

    if warnings.is_empty() {
        return Ok(json!({
            "successMessage": "Restored version",
        }));
    }

    Ok(json!({
        "warningMessage": warnings.join(" "),
    }))
}
