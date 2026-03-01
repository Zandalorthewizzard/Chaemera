use crate::core_domains::read_settings;
use crate::sqlite_support::{
    copy_dir_recursive, dyad_apps_base_directory, normalize_path, now_unix_timestamp, open_db,
    resolve_workspace_app_path, run_git, timestamp_to_rfc3339, CopyDirOptions,
};
use crate::wave_b_domains::get_templates;
use crate::wave_f_domains::{clear_logs_for_app, stop_app_by_id};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

const INIT_COMMIT_MESSAGE: &str = "Init Chaemera app";
const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";

#[derive(Debug, Clone)]
struct AppRecord {
    path: String,
    install_command: Option<String>,
    start_command: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAppRequest {
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAppRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyAppRequest {
    app_id: i64,
    new_app_name: String,
    with_history: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameAppRequest {
    app_id: i64,
    app_name: String,
    app_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeAppLocationRequest {
    app_id: i64,
    parent_directory: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameBranchRequest {
    app_id: i64,
    old_branch_name: String,
    new_branch_name: String,
}

fn read_app_record(connection: &rusqlite::Connection, app_id: i64) -> Result<AppRecord, String> {
    connection
        .query_row(
            "SELECT path, install_command, start_command FROM apps WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(AppRecord {
                    path: row.get("path")?,
                    install_command: row.get("install_command")?,
                    start_command: row.get("start_command")?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to load app: {error}"))?
        .ok_or_else(|| "App not found".to_string())
}

fn trim_required(value: &str, field_name: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{field_name} is required"));
    }
    Ok(trimmed.to_string())
}

fn app_base_json(
    id: i64,
    name: &str,
    path: &str,
    created_at: i64,
    updated_at: i64,
    install_command: Option<&str>,
    start_command: Option<&str>,
    resolved_path: &Path,
) -> Value {
    json!({
        "id": id,
        "name": name,
        "path": path,
        "createdAt": timestamp_to_rfc3339(created_at),
        "updatedAt": timestamp_to_rfc3339(updated_at),
        "githubOrg": Value::Null,
        "githubRepo": Value::Null,
        "githubBranch": Value::Null,
        "supabaseProjectId": Value::Null,
        "supabaseParentProjectId": Value::Null,
        "supabaseOrganizationSlug": Value::Null,
        "neonProjectId": Value::Null,
        "neonDevelopmentBranchId": Value::Null,
        "neonPreviewBranchId": Value::Null,
        "vercelProjectId": Value::Null,
        "vercelProjectName": Value::Null,
        "vercelDeploymentUrl": Value::Null,
        "vercelTeamId": Value::Null,
        "installCommand": install_command,
        "startCommand": start_command,
        "isFavorite": false,
        "resolvedPath": normalize_path(&resolved_path.to_string_lossy()),
    })
}

fn app_exists_with_name(
    connection: &rusqlite::Connection,
    app_name: &str,
    exclude_app_id: Option<i64>,
) -> Result<bool, String> {
    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM apps WHERE name = ?1 LIMIT 1",
            params![app_name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to check app name conflict: {error}"))?;

    Ok(match (existing, exclude_app_id) {
        (Some(found_id), Some(excluded_id)) => found_id != excluded_id,
        (Some(_), None) => true,
        _ => false,
    })
}

fn app_exists_with_resolved_path(
    connection: &rusqlite::Connection,
    candidate: &Path,
    exclude_app_id: Option<i64>,
) -> Result<bool, String> {
    let mut statement = connection
        .prepare("SELECT id, path FROM apps")
        .map_err(|error| format!("failed to prepare path conflict query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| format!("failed to execute path conflict query: {error}"))?;

    for row in rows {
        let (existing_id, existing_path) =
            row.map_err(|error| format!("failed to decode path conflict row: {error}"))?;
        if exclude_app_id.is_some_and(|excluded_id| excluded_id == existing_id) {
            continue;
        }

        let resolved_existing = resolve_workspace_app_path(&existing_path)?;
        if resolved_existing == candidate {
            return Ok(true);
        }
    }

    Ok(false)
}

fn validate_relative_folder_name(folder_name: &str) -> Result<(), String> {
    if PathBuf::from(folder_name).is_absolute() {
        return Err(
            "Absolute paths are not allowed when renaming an app folder. Please use a relative folder name only. To change the storage location, use the 'Change location' button.".to_string(),
        );
    }

    let has_invalid_chars = folder_name.chars().any(|character| {
        matches!(
            character,
            '<' | '>' | ':' | '"' | '|' | '?' | '*' | '/' | '\\'
        ) || character.is_control()
    });

    if has_invalid_chars {
        return Err(format!(
            "App path \"{folder_name}\" contains characters that are not allowed in folder names: < > : \" | ? * / \\\\ or control characters. Please use a different path."
        ));
    }

    Ok(())
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

fn git_commit_initial(app: &AppHandle, repo_path: &Path) -> Result<String, String> {
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
    run_git(repo_path, &["rev-parse", "HEAD"])
}

fn validate_template_repo_url(url: &str) -> Result<(), String> {
    let parsed =
        reqwest::Url::parse(url).map_err(|error| format!("invalid template url: {error}"))?;
    if parsed.scheme() != "https" {
        return Err("Template repository URL must use HTTPS.".to_string());
    }
    if parsed.host_str() != Some("github.com") {
        return Err("Template repository URL must be hosted on github.com.".to_string());
    }
    Ok(())
}

fn find_template_repo_url(template_id: &str) -> Result<Option<String>, String> {
    let templates = get_templates()?;
    let list = templates
        .as_array()
        .ok_or_else(|| "templates payload is not an array".to_string())?;

    for template in list {
        let Some(id) = template.get("id").and_then(Value::as_str) else {
            continue;
        };
        if id != template_id {
            continue;
        }

        return Ok(template
            .get("githubUrl")
            .and_then(Value::as_str)
            .map(str::to_string));
    }

    Ok(None)
}

fn materialize_template(app: &AppHandle, destination: &Path) -> Result<(), String> {
    let selected_template_id = read_settings(app)
        .ok()
        .and_then(|settings| {
            settings
                .get("selectedTemplateId")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| "react".to_string());

    if selected_template_id == "react" {
        let scaffold = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
            .join("scaffold");
        copy_dir_recursive(
            &scaffold,
            destination,
            CopyDirOptions {
                exclude_node_modules: true,
                exclude_git: false,
            },
        )?;
        return Ok(());
    }

    let repo_url = find_template_repo_url(&selected_template_id)?
        .ok_or_else(|| format!("Template '{selected_template_id}' is not available"))?;
    validate_template_repo_url(&repo_url)?;

    let parent = destination
        .parent()
        .ok_or_else(|| "failed to resolve template destination parent".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create template destination parent: {error}"))?;

    let status = Command::new("git")
        .args(["clone", "--depth", "1", "--single-branch", &repo_url])
        .arg(destination)
        .status()
        .map_err(|error| format!("failed to spawn git clone: {error}"))?;

    if !status.success() {
        return Err(format!(
            "failed to clone template repository for '{selected_template_id}'"
        ));
    }

    let git_dir = destination.join(".git");
    if git_dir.exists() {
        fs::remove_dir_all(git_dir)
            .map_err(|error| format!("failed to remove cloned template git metadata: {error}"))?;
    }

    Ok(())
}

fn stop_app_if_running(app_id: i64) {
    let _ = stop_app_by_id(app_id);
}

#[tauri::command]
pub fn create_app(app: AppHandle, request: CreateAppRequest) -> Result<Value, String> {
    let app_name = trim_required(&request.name, "App name")?;
    let full_app_path = dyad_apps_base_directory()?.join(&app_name);
    if full_app_path.exists() {
        return Err(format!(
            "App already exists at: {}",
            full_app_path.to_string_lossy()
        ));
    }

    let connection = open_db(&app)?;
    if app_exists_with_name(&connection, &app_name, None)? {
        return Err(format!("An app with the name '{app_name}' already exists"));
    }

    materialize_template(&app, &full_app_path)?;

    let init_commit_hash = match git_commit_initial(&app, &full_app_path) {
        Ok(hash) => hash,
        Err(error) => {
            let _ = fs::remove_dir_all(&full_app_path);
            return Err(error);
        }
    };

    let created_at = now_unix_timestamp();
    let result = (|| -> Result<Value, String> {
        connection
            .execute(
                "INSERT INTO apps (name, path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![app_name.as_str(), app_name.as_str(), created_at, created_at],
            )
            .map_err(|error| format!("failed to create app record: {error}"))?;
        let app_id = connection.last_insert_rowid();

        connection
            .execute(
                "INSERT INTO chats (app_id, initial_commit_hash, created_at) VALUES (?1, ?2, ?3)",
                params![app_id, init_commit_hash, created_at],
            )
            .map_err(|error| format!("failed to create initial chat: {error}"))?;
        let chat_id = connection.last_insert_rowid();

        Ok(json!({
            "app": app_base_json(
                app_id,
                &app_name,
                &app_name,
                created_at,
                created_at,
                None,
                None,
                &full_app_path,
            ),
            "chatId": chat_id,
        }))
    })();

    if result.is_err() {
        let _ = fs::remove_dir_all(&full_app_path);
    }

    result
}

#[tauri::command]
pub fn copy_app(app: AppHandle, request: CopyAppRequest) -> Result<Value, String> {
    let new_app_name = trim_required(&request.new_app_name, "New app name")?;
    let connection = open_db(&app)?;
    if app_exists_with_name(&connection, &new_app_name, None)? {
        return Err(format!("An app named \"{new_app_name}\" already exists."));
    }

    let original_app = read_app_record(&connection, request.app_id)
        .map_err(|_| "Original app not found.".to_string())?;
    let original_app_path = resolve_workspace_app_path(&original_app.path)?;
    let new_app_path = dyad_apps_base_directory()?.join(&new_app_name);

    if new_app_path.exists() {
        return Err(format!(
            "App already exists at: {}",
            new_app_path.to_string_lossy()
        ));
    }

    copy_dir_recursive(
        &original_app_path,
        &new_app_path,
        CopyDirOptions {
            exclude_node_modules: true,
            exclude_git: !request.with_history,
        },
    )
    .map_err(|error| format!("Failed to copy app directory. {error}"))?;

    if !request.with_history {
        if let Err(error) = git_commit_initial(&app, &new_app_path) {
            let _ = fs::remove_dir_all(&new_app_path);
            return Err(error);
        }
    }

    let created_at = now_unix_timestamp();
    let install_command = original_app.install_command.clone();
    let start_command = original_app.start_command.clone();
    let result = (|| -> Result<Value, String> {
        connection
            .execute(
                "INSERT INTO apps (
                    name,
                    path,
                    created_at,
                    updated_at,
                    supabase_project_id,
                    github_org,
                    github_repo,
                    install_command,
                    start_command
                 ) VALUES (?1, ?2, ?3, ?4, NULL, NULL, NULL, ?5, ?6)",
                params![
                    new_app_name.as_str(),
                    new_app_name.as_str(),
                    created_at,
                    created_at,
                    install_command.as_deref(),
                    start_command.as_deref()
                ],
            )
            .map_err(|error| format!("failed to create copied app record: {error}"))?;

        let app_id = connection.last_insert_rowid();
        Ok(json!({
            "app": app_base_json(
                app_id,
                &new_app_name,
                &new_app_name,
                created_at,
                created_at,
                install_command.as_deref(),
                start_command.as_deref(),
                &new_app_path,
            )
        }))
    })();

    if result.is_err() {
        let _ = fs::remove_dir_all(&new_app_path);
    }

    result
}

#[tauri::command]
pub fn delete_app(app: AppHandle, request: DeleteAppRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    let app_record = read_app_record(&connection, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.path)?;

    stop_app_if_running(request.app_id);
    clear_logs_for_app(request.app_id);

    connection
        .execute("DELETE FROM apps WHERE id = ?1", params![request.app_id])
        .map_err(|error| format!("Failed to delete app from database: {error}"))?;

    if app_path.exists() {
        fs::remove_dir_all(&app_path).map_err(|error| {
            format!(
                "App deleted from database, but failed to delete app files. Please delete app files from {} manually.\n\nError: {error}",
                app_path.to_string_lossy()
            )
        })?;
    }

    Ok(())
}

#[tauri::command]
pub fn rename_app(app: AppHandle, request: RenameAppRequest) -> Result<Value, String> {
    let app_name = trim_required(&request.app_name, "App name")?;
    let mut app_path = trim_required(&request.app_path, "App path")?;
    let connection = open_db(&app)?;
    let app_record = read_app_record(&connection, request.app_id)?;
    let path_changed = app_path != app_record.path;

    if path_changed {
        validate_relative_folder_name(&app_path)?;
    }

    if app_exists_with_name(&connection, &app_name, Some(request.app_id))? {
        return Err(format!("An app with the name '{app_name}' already exists"));
    }

    let current_resolved_path = resolve_workspace_app_path(&app_record.path)?;
    let new_resolved_path = if PathBuf::from(&app_record.path).is_absolute() {
        current_resolved_path
            .parent()
            .unwrap_or(&current_resolved_path)
            .join(&app_path)
    } else {
        dyad_apps_base_directory()?.join(&app_path)
    };

    if path_changed
        && app_exists_with_resolved_path(&connection, &new_resolved_path, Some(request.app_id))?
    {
        return Err(format!(
            "An app with the path '{}' already exists",
            new_resolved_path.to_string_lossy()
        ));
    }

    stop_app_if_running(request.app_id);

    let old_resolved_path = current_resolved_path.clone();
    if new_resolved_path != old_resolved_path {
        if new_resolved_path.exists() {
            return Err(format!(
                "Destination path '{}' already exists",
                new_resolved_path.to_string_lossy()
            ));
        }

        if let Some(parent) = new_resolved_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("failed to create rename destination parent: {error}"))?;
        }

        copy_dir_recursive(
            &old_resolved_path,
            &new_resolved_path,
            CopyDirOptions {
                exclude_node_modules: true,
                exclude_git: false,
            },
        )
        .map_err(|error| format!("Failed to move app files: {error}"))?;
    }

    let path_to_store = if PathBuf::from(&app_record.path).is_absolute() {
        app_path = normalize_path(&new_resolved_path.to_string_lossy());
        app_path.clone()
    } else {
        app_path.clone()
    };

    let update_result = connection.execute(
        "UPDATE apps SET name = ?1, path = ?2 WHERE id = ?3",
        params![app_name, path_to_store, request.app_id],
    );

    if let Err(error) = update_result {
        if new_resolved_path != old_resolved_path && new_resolved_path.exists() {
            let _ = fs::remove_dir_all(&new_resolved_path);
        }
        return Err(format!("Failed to update app in database: {error}"));
    }

    if new_resolved_path != old_resolved_path && old_resolved_path.exists() {
        let _ = fs::remove_dir_all(&old_resolved_path);
    }

    Ok(json!({
        "resolvedPath": normalize_path(&new_resolved_path.to_string_lossy()),
    }))
}

#[tauri::command]
pub fn change_app_location(
    app: AppHandle,
    request: ChangeAppLocationRequest,
) -> Result<Value, String> {
    let parent_directory = trim_required(&request.parent_directory, "Destination folder")?;
    let normalized_parent_dir = PathBuf::from(&parent_directory);
    if !normalized_parent_dir.is_absolute() {
        return Err("Please select an absolute destination folder.".to_string());
    }

    let connection = open_db(&app)?;
    let app_record = read_app_record(&connection, request.app_id)?;
    let current_resolved_path = resolve_workspace_app_path(&app_record.path)?;
    let app_folder_name = Path::new(&app_record.path)
        .file_name()
        .or_else(|| current_resolved_path.file_name())
        .ok_or_else(|| "Failed to resolve app folder name".to_string())?
        .to_string_lossy()
        .to_string();
    let next_resolved_path = normalized_parent_dir.join(app_folder_name);

    if current_resolved_path == next_resolved_path {
        if !PathBuf::from(&app_record.path).is_absolute() {
            let stored_path = normalize_path(&next_resolved_path.to_string_lossy());
            connection
                .execute(
                    "UPDATE apps SET path = ?1 WHERE id = ?2",
                    params![stored_path, request.app_id],
                )
                .map_err(|error| format!("failed to update app path: {error}"))?;
        }

        return Ok(json!({
            "resolvedPath": normalize_path(&next_resolved_path.to_string_lossy()),
        }));
    }

    if app_exists_with_resolved_path(&connection, &next_resolved_path, Some(request.app_id))? {
        return Err(format!(
            "Another app already exists at '{}'. Please choose a different folder.",
            next_resolved_path.to_string_lossy()
        ));
    }

    if next_resolved_path.exists() {
        return Err(format!(
            "Destination path '{}' already exists. Please choose an empty folder.",
            next_resolved_path.to_string_lossy()
        ));
    }

    if !current_resolved_path.exists() {
        let stored_path = normalize_path(&next_resolved_path.to_string_lossy());
        connection
            .execute(
                "UPDATE apps SET path = ?1 WHERE id = ?2",
                params![stored_path, request.app_id],
            )
            .map_err(|error| format!("failed to update app path: {error}"))?;

        return Ok(json!({
            "resolvedPath": stored_path,
        }));
    }

    stop_app_if_running(request.app_id);

    fs::create_dir_all(&normalized_parent_dir)
        .map_err(|error| format!("failed to create destination directory: {error}"))?;
    copy_dir_recursive(
        &current_resolved_path,
        &next_resolved_path,
        CopyDirOptions {
            exclude_node_modules: true,
            exclude_git: false,
        },
    )
    .map_err(|error| format!("Failed to move app files: {error}"))?;

    let stored_path = normalize_path(&next_resolved_path.to_string_lossy());
    if let Err(error) = connection.execute(
        "UPDATE apps SET path = ?1 WHERE id = ?2",
        params![stored_path, request.app_id],
    ) {
        let _ = fs::remove_dir_all(&next_resolved_path);
        return Err(format!("failed to update app path: {error}"));
    }

    if current_resolved_path.exists() {
        let _ = fs::remove_dir_all(&current_resolved_path);
    }

    Ok(json!({
        "resolvedPath": stored_path,
    }))
}

#[tauri::command]
pub fn rename_branch(app: AppHandle, request: RenameBranchRequest) -> Result<(), String> {
    let old_branch_name = trim_required(&request.old_branch_name, "Old branch name")?;
    let new_branch_name = trim_required(&request.new_branch_name, "New branch name")?;
    let connection = open_db(&app)?;
    let app_record = read_app_record(&connection, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.path)?;

    let branches_output = run_git(
        &app_path,
        &["branch", "--list", "--format=%(refname:short)"],
    )?;
    let branches = branches_output
        .lines()
        .map(str::trim)
        .filter(|branch| !branch.is_empty())
        .collect::<Vec<_>>();

    if !branches.iter().any(|branch| *branch == old_branch_name) {
        return Err(format!("Branch '{}' not found.", old_branch_name));
    }

    if branches.iter().any(|branch| *branch == new_branch_name) {
        return Err(format!(
            "Branch '{}' already exists. Cannot rename.",
            new_branch_name
        ));
    }

    run_git(
        &app_path,
        &["branch", "-m", &old_branch_name, &new_branch_name],
    )
    .map_err(|error| {
        format!(
            "Failed to rename branch '{}' to '{}': {}",
            old_branch_name, new_branch_name, error
        )
    })?;

    Ok(())
}
