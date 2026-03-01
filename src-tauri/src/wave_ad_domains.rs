use crate::core_domains::read_settings;
use crate::sqlite_support::{
    copy_dir_recursive, dyad_apps_base_directory, now_unix_timestamp, open_db, run_git,
};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";
const INIT_COMMIT_MESSAGE: &str = "Init Chaemera app";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportAppRequest {
    path: String,
    app_name: String,
    install_command: Option<String>,
    start_command: Option<String>,
    skip_copy: Option<bool>,
}

fn trim_required(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{field_name} is required"));
    }
    Ok(trimmed.to_string())
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value.and_then(|candidate| {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn app_exists_with_name(connection: &rusqlite::Connection, app_name: &str) -> Result<bool, String> {
    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM apps WHERE name = ?1 LIMIT 1",
            params![app_name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to check app name conflict: {error}"))?;
    Ok(existing.is_some())
}

fn git_author_email(app: &AppHandle) -> String {
    read_settings(app)
        .ok()
        .and_then(|settings| {
            settings
                .get("githubUser")
                .and_then(|value| value.get("email"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| DEFAULT_GIT_AUTHOR_EMAIL.to_string())
}

fn ensure_git_repo(app: &AppHandle, repo_path: &Path) -> Result<(), String> {
    if repo_path.join(".git").exists() {
        return Ok(());
    }

    let author_email = git_author_email(app);
    run_git(repo_path, &["init", "-b", "main"])?;
    run_git(repo_path, &["add", "--", "."])?;
    run_git(
        repo_path,
        &[
            "-c",
            &format!("user.name={DEFAULT_GIT_AUTHOR_NAME}"),
            "-c",
            &format!("user.email={author_email}"),
            "commit",
            "-m",
            INIT_COMMIT_MESSAGE,
        ],
    )?;
    Ok(())
}

#[tauri::command]
pub fn import_app(app: AppHandle, request: ImportAppRequest) -> Result<Value, String> {
    let source_path = PathBuf::from(trim_required(&request.path, "Path")?);
    let app_name = trim_required(&request.app_name, "App name")?;
    let skip_copy = request.skip_copy.unwrap_or(false);

    if !source_path.exists() {
        return Err("Source folder does not exist".to_string());
    }

    let connection = open_db(&app)?;
    if app_exists_with_name(&connection, &app_name)? {
        return Err("An app with this name already exists".to_string());
    }

    let target_path = if skip_copy {
        source_path.clone()
    } else {
        dyad_apps_base_directory()?.join(&app_name)
    };

    if !skip_copy && target_path.exists() {
        return Err("An app with this name already exists".to_string());
    }

    if !skip_copy {
        copy_dir_recursive(&source_path, &target_path, Default::default())?;
    }

    ensure_git_repo(&app, &target_path)?;

    let created_at = now_unix_timestamp();
    let stored_path = if skip_copy {
        target_path.to_string_lossy().to_string()
    } else {
        app_name.clone()
    };
    let install_command = trim_optional(request.install_command);
    let start_command = trim_optional(request.start_command);

    connection
        .execute(
            "INSERT INTO apps (
                name,
                path,
                created_at,
                updated_at,
                install_command,
                start_command
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                app_name.as_str(),
                stored_path.as_str(),
                created_at,
                created_at,
                install_command.as_deref(),
                start_command.as_deref(),
            ],
        )
        .map_err(|error| format!("failed to create imported app record: {error}"))?;
    let app_id = connection.last_insert_rowid();

    connection
        .execute(
            "INSERT INTO chats (app_id, created_at) VALUES (?1, ?2)",
            params![app_id, created_at],
        )
        .map_err(|error| format!("failed to create initial chat: {error}"))?;
    let chat_id = connection.last_insert_rowid();

    Ok(json!({
        "appId": app_id,
        "chatId": chat_id,
    }))
}
