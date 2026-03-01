use crate::sqlite_support::{
    now_unix_timestamp, open_db, resolve_workspace_app_path, run_git, timestamp_to_rfc3339,
};
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::json;
use std::io::{Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";
const MIGRATION_COMMIT_MESSAGE: &str = "[chaemera] Generate database migration file";
const DRIZZLE_PROMPT_TEXT: &str = "created or renamed from another";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortalMigrateCreateRequest {
    app_id: i64,
}

#[derive(Debug)]
struct PortalAppRecord {
    raw_path: String,
    neon_project_id: Option<String>,
    neon_development_branch_id: Option<String>,
}

fn read_portal_app(app: &AppHandle, app_id: i64) -> Result<PortalAppRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT path, neon_project_id, neon_development_branch_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(PortalAppRecord {
                    raw_path: row.get(0)?,
                    neon_project_id: row.get(1)?,
                    neon_development_branch_id: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query portal app: {error}"))?
        .ok_or_else(|| format!("App with id {app_id} not found"))
}

fn git_author_email(app: &AppHandle) -> String {
    crate::core_domains::read_settings(app)
        .ok()
        .and_then(|settings| {
            settings
                .get("githubUser")
                .and_then(|value| value.get("email"))
                .and_then(|value| value.as_str())
                .map(str::to_string)
        })
        .unwrap_or_else(|| DEFAULT_GIT_AUTHOR_EMAIL.to_string())
}

fn build_shell_command(command: &str) -> Command {
    if cfg!(target_os = "windows") {
        let mut shell = Command::new("cmd");
        shell.args(["/C", command]);
        shell
    } else {
        let mut shell = Command::new("sh");
        shell.args(["-lc", command]);
        shell
    }
}

fn run_portal_migration(app: &AppHandle, app_id: i64, app_path: &Path) -> Result<String, String> {
    refresh_process_path(app);
    let mut process = build_shell_command("npm run migrate:create -- --skip-empty");
    process
        .current_dir(app_path)
        .env("PATH", effective_path_value(app))
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = process
        .spawn()
        .map_err(|error| format!("failed to spawn migrate:create for app {app_id}: {error}"))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "failed to capture migrate:create stdout".to_string())?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "failed to capture migrate:create stderr".to_string())?;
    let stdin = child.stdin.take().map(|stdin| Arc::new(Mutex::new(stdin)));

    let stdout_buffer = Arc::new(Mutex::new(String::new()));
    let stderr_buffer = Arc::new(Mutex::new(String::new()));

    let stdout_handle = {
        let stdout_buffer = stdout_buffer.clone();
        let stdin = stdin.clone();
        thread::spawn(move || {
            let mut reader = stdout;
            let mut prompt_acknowledged = false;
            let mut bytes = [0_u8; 1024];
            loop {
                let read = match reader.read(&mut bytes) {
                    Ok(0) => break,
                    Ok(read) => read,
                    Err(_) => break,
                };

                let chunk = String::from_utf8_lossy(&bytes[..read]).to_string();
                let mut buffer = match stdout_buffer.lock() {
                    Ok(buffer) => buffer,
                    Err(_) => break,
                };
                buffer.push_str(&chunk);

                if !prompt_acknowledged && buffer.contains(DRIZZLE_PROMPT_TEXT) {
                    if let Some(stdin) = stdin.as_ref() {
                        if let Ok(mut stdin) = stdin.lock() {
                            let _ = stdin.write_all(b"\r\n");
                            let _ = stdin.flush();
                        }
                    }
                    prompt_acknowledged = true;
                }
            }
        })
    };

    let stderr_handle = {
        let stderr_buffer = stderr_buffer.clone();
        thread::spawn(move || {
            let mut reader = stderr;
            let mut bytes = [0_u8; 1024];
            loop {
                let read = match reader.read(&mut bytes) {
                    Ok(0) => break,
                    Ok(read) => read,
                    Err(_) => break,
                };

                let chunk = String::from_utf8_lossy(&bytes[..read]).to_string();
                let mut buffer = match stderr_buffer.lock() {
                    Ok(buffer) => buffer,
                    Err(_) => break,
                };
                buffer.push_str(&chunk);
            }
        })
    };

    let output = child
        .wait()
        .map_err(|error| format!("failed waiting for migrate:create for app {app_id}: {error}"))?;

    let _ = stdout_handle.join();
    let _ = stderr_handle.join();

    let stdout = stdout_buffer
        .lock()
        .map_err(|_| "stdout buffer mutex poisoned".to_string())?
        .clone();
    let stderr = stderr_buffer
        .lock()
        .map_err(|_| "stderr buffer mutex poisoned".to_string())?
        .clone();
    let combined_output = if stderr.trim().is_empty() {
        stdout.clone()
    } else {
        format!("{stdout}\n\nErrors/Warnings:\n{stderr}")
    };

    if output.success() {
        if stdout.contains("Migration created at") {
            Ok(combined_output)
        } else {
            Err("No migration was created because no changes were found.".to_string())
        }
    } else {
        Err(format!(
            "Migration creation failed (exit code {})\n\n{}",
            output.code().unwrap_or(-1),
            combined_output
        ))
    }
}

fn store_neon_timestamp_best_effort(
    app: &AppHandle,
    app_id: i64,
    app_path: &Path,
    neon_project_id: Option<&str>,
    neon_development_branch_id: Option<&str>,
) -> Result<(), String> {
    if neon_project_id.is_none() || neon_development_branch_id.is_none() {
        return Ok(());
    }

    let commit_hash = run_git(app_path, &["rev-parse", "HEAD"])?;
    let connection = open_db(app)?;
    let unix_now = now_unix_timestamp();
    let best_effort_timestamp = timestamp_to_rfc3339(unix_now);

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
            .map_err(|error| {
                format!("failed to update Neon timestamp for current version: {error}")
            })?;
    } else {
        connection
            .execute(
                "INSERT INTO versions (app_id, commit_hash, neon_db_timestamp, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![app_id, commit_hash, best_effort_timestamp, unix_now, unix_now],
            )
            .map_err(|error| format!("failed to insert Neon timestamp for current version: {error}"))?;
    }

    Ok(())
}

fn stage_and_commit_portal_changes(app: &AppHandle, app_path: &Path) -> Result<(), String> {
    run_git(app_path, &["add", "--all"])?;
    let status = run_git(app_path, &["status", "--porcelain"])?;
    if status.trim().is_empty() {
        return Ok(());
    }

    let author_email = git_author_email(app);
    run_git(
        app_path,
        &[
            "-c",
            &format!("user.name={DEFAULT_GIT_AUTHOR_NAME}"),
            "-c",
            &format!("user.email={author_email}"),
            "commit",
            "-m",
            MIGRATION_COMMIT_MESSAGE,
        ],
    )
    .map(|_| ())
}

#[tauri::command]
pub fn portal_migrate_create(
    app: AppHandle,
    request: PortalMigrateCreateRequest,
) -> Result<serde_json::Value, String> {
    let app_record = read_portal_app(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.raw_path)?;

    let migration_output = run_portal_migration(&app, request.app_id, &app_path)?;

    store_neon_timestamp_best_effort(
        &app,
        request.app_id,
        &app_path,
        app_record.neon_project_id.as_deref(),
        app_record.neon_development_branch_id.as_deref(),
    )?;

    stage_and_commit_portal_changes(&app, &app_path)?;

    Ok(json!({
        "output": migration_output,
    }))
}
