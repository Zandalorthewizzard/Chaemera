use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Deserialize;
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

const APP_COLUMNS: &str = r#"
  id,
  name,
  path,
  created_at,
  updated_at,
  github_org,
  github_repo,
  github_branch,
  supabase_project_id,
  supabase_parent_project_id,
  supabase_organization_slug,
  neon_project_id,
  neon_development_branch_id,
  neon_preview_branch_id,
  vercel_project_id,
  vercel_project_name,
  vercel_deployment_url,
  vercel_team_id,
  install_command,
  start_command,
  is_favorite
"#;

#[derive(Debug, Clone)]
struct DbApp {
    id: i64,
    name: String,
    path: String,
    created_at: i64,
    updated_at: i64,
    github_org: Option<String>,
    github_repo: Option<String>,
    github_branch: Option<String>,
    supabase_project_id: Option<String>,
    supabase_parent_project_id: Option<String>,
    supabase_organization_slug: Option<String>,
    neon_project_id: Option<String>,
    neon_development_branch_id: Option<String>,
    neon_preview_branch_id: Option<String>,
    vercel_project_id: Option<String>,
    vercel_project_name: Option<String>,
    vercel_deployment_url: Option<String>,
    vercel_team_id: Option<String>,
    install_command: Option<String>,
    start_command: Option<String>,
    is_favorite: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIdRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckAppNameRequest {
    app_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAppCommandsRequest {
    app_id: i64,
    install_command: Option<String>,
    start_command: Option<String>,
}

fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
        .to_path_buf()
}

fn user_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        let path = workspace_root().join("userData");
        fs::create_dir_all(&path)
            .map_err(|error| format!("failed to create debug userData dir: {error}"))?;
        return Ok(path);
    }

    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    fs::create_dir_all(&path).map_err(|error| format!("failed to create app data dir: {error}"))?;
    Ok(path)
}

fn sqlite_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(user_data_dir(app)?.join("sqlite.db"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = sqlite_path(app)?;
    if !path.exists() {
        return Err("sqlite database not found".to_string());
    }
    Connection::open(path).map_err(|error| format!("failed to open sqlite database: {error}"))
}

fn dyad_apps_base_directory() -> Result<PathBuf, String> {
    let home_dir = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve home directory".to_string())?;

    Ok(home_dir.join("dyad-apps"))
}

fn resolve_app_path(raw_path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(raw_path);
    if candidate.is_absolute() {
        Ok(candidate)
    } else {
        Ok(dyad_apps_base_directory()?.join(candidate))
    }
}

fn normalize_path(path: &str) -> String {
    path.replace('\\', "/")
}

fn timestamp_to_rfc3339(timestamp: i64) -> String {
    OffsetDateTime::from_unix_timestamp(timestamp)
        .unwrap_or(OffsetDateTime::UNIX_EPOCH)
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn read_app(row: &Row<'_>) -> Result<DbApp, rusqlite::Error> {
    Ok(DbApp {
        id: row.get("id")?,
        name: row.get("name")?,
        path: row.get("path")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        github_org: row.get("github_org")?,
        github_repo: row.get("github_repo")?,
        github_branch: row.get("github_branch")?,
        supabase_project_id: row.get("supabase_project_id")?,
        supabase_parent_project_id: row.get("supabase_parent_project_id")?,
        supabase_organization_slug: row.get("supabase_organization_slug")?,
        neon_project_id: row.get("neon_project_id")?,
        neon_development_branch_id: row.get("neon_development_branch_id")?,
        neon_preview_branch_id: row.get("neon_preview_branch_id")?,
        vercel_project_id: row.get("vercel_project_id")?,
        vercel_project_name: row.get("vercel_project_name")?,
        vercel_deployment_url: row.get("vercel_deployment_url")?,
        vercel_team_id: row.get("vercel_team_id")?,
        install_command: row.get("install_command")?,
        start_command: row.get("start_command")?,
        is_favorite: row.get::<_, i64>("is_favorite")? != 0,
    })
}

fn collect_files_recursively(
    dir: &Path,
    base_dir: &Path,
    files: &mut Vec<String>,
) -> Result<(), String> {
    if !dir.exists() {
        return Ok(());
    }

    let mut entries = fs::read_dir(dir)
        .map_err(|error| format!("failed to read app directory: {error}"))?
        .flatten()
        .collect::<Vec<_>>();
    entries.sort_by_key(|entry| entry.file_name());

    for entry in entries {
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|error| format!("failed to inspect file type: {error}"))?;

        if file_type.is_dir() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name == "node_modules" || name == ".git" || name == ".next" {
                continue;
            }
            collect_files_recursively(&path, base_dir, files)?;
        } else if file_type.is_file() {
            let relative = path
                .strip_prefix(base_dir)
                .map_err(|error| format!("failed to build relative path: {error}"))?;
            files.push(normalize_path(&relative.to_string_lossy()));
        }
    }

    Ok(())
}

fn app_json(app: &DbApp, include_files: bool) -> Result<Value, String> {
    let resolved_path = resolve_app_path(&app.path)?;
    let mut files = Vec::new();
    if include_files {
        collect_files_recursively(&resolved_path, &resolved_path, &mut files)?;
    }

    Ok(json!({
        "id": app.id,
        "name": app.name,
        "path": app.path,
        "createdAt": timestamp_to_rfc3339(app.created_at),
        "updatedAt": timestamp_to_rfc3339(app.updated_at),
        "githubOrg": app.github_org,
        "githubRepo": app.github_repo,
        "githubBranch": app.github_branch,
        "supabaseProjectId": app.supabase_project_id,
        "supabaseParentProjectId": app.supabase_parent_project_id,
        "supabaseOrganizationSlug": app.supabase_organization_slug,
        "neonProjectId": app.neon_project_id,
        "neonDevelopmentBranchId": app.neon_development_branch_id,
        "neonPreviewBranchId": app.neon_preview_branch_id,
        "vercelProjectId": app.vercel_project_id,
        "vercelProjectName": app.vercel_project_name,
        "vercelDeploymentUrl": app.vercel_deployment_url,
        "vercelTeamId": app.vercel_team_id,
        "installCommand": app.install_command,
        "startCommand": app.start_command,
        "isFavorite": app.is_favorite,
        "resolvedPath": normalize_path(&resolved_path.to_string_lossy()),
        "files": files,
        "supabaseProjectName": Value::Null,
        "vercelTeamSlug": Value::Null,
    }))
}

fn listed_app_json(app: &DbApp) -> Result<Value, String> {
    let resolved_path = resolve_app_path(&app.path)?;

    Ok(json!({
        "id": app.id,
        "name": app.name,
        "path": app.path,
        "createdAt": timestamp_to_rfc3339(app.created_at),
        "updatedAt": timestamp_to_rfc3339(app.updated_at),
        "githubOrg": app.github_org,
        "githubRepo": app.github_repo,
        "githubBranch": app.github_branch,
        "supabaseProjectId": app.supabase_project_id,
        "supabaseParentProjectId": app.supabase_parent_project_id,
        "supabaseOrganizationSlug": app.supabase_organization_slug,
        "neonProjectId": app.neon_project_id,
        "neonDevelopmentBranchId": app.neon_development_branch_id,
        "neonPreviewBranchId": app.neon_preview_branch_id,
        "vercelProjectId": app.vercel_project_id,
        "vercelProjectName": app.vercel_project_name,
        "vercelDeploymentUrl": app.vercel_deployment_url,
        "vercelTeamId": app.vercel_team_id,
        "installCommand": app.install_command,
        "startCommand": app.start_command,
        "isFavorite": app.is_favorite,
        "resolvedPath": normalize_path(&resolved_path.to_string_lossy()),
    }))
}

fn trimmed_or_null(value: Option<String>) -> Option<String> {
    value.and_then(|candidate| {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

#[tauri::command]
pub fn get_app(app: AppHandle, app_id: i64) -> Result<Value, String> {
    let connection = open_db(&app)?;
    let mut statement = connection
        .prepare(&format!("SELECT {APP_COLUMNS} FROM apps WHERE id = ?1"))
        .map_err(|error| format!("failed to prepare get-app query: {error}"))?;

    let app = statement
        .query_row(params![app_id], read_app)
        .optional()
        .map_err(|error| format!("failed to execute get-app query: {error}"))?
        .ok_or_else(|| "App not found".to_string())?;

    app_json(&app, true)
}

#[tauri::command]
pub fn list_apps(app: AppHandle) -> Result<Value, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => return Ok(json!({ "apps": [] })),
        Err(error) => return Err(error),
    };
    let mut statement = connection
        .prepare(&format!(
            "SELECT {APP_COLUMNS} FROM apps ORDER BY created_at DESC"
        ))
        .map_err(|error| format!("failed to prepare list-apps query: {error}"))?;

    let apps = statement
        .query_map([], read_app)
        .map_err(|error| format!("failed to execute list-apps query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode list-apps rows: {error}"))?;

    let listed = apps
        .iter()
        .map(listed_app_json)
        .collect::<Result<Vec<_>, _>>()?;

    Ok(json!({ "apps": listed }))
}

#[tauri::command]
pub fn add_to_favorite(app: AppHandle, request: AppIdRequest) -> Result<Value, String> {
    let connection = open_db(&app)?;
    let current: Option<i64> = connection
        .query_row(
            "SELECT is_favorite FROM apps WHERE id = ?1",
            params![request.app_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to read favorite status: {error}"))?;

    let current = current.ok_or_else(|| "App not found".to_string())?;
    let next = if current == 0 { 1 } else { 0 };

    connection
        .execute(
            "UPDATE apps SET is_favorite = ?1 WHERE id = ?2",
            params![next, request.app_id],
        )
        .map_err(|error| format!("failed to update favorite status: {error}"))?;

    Ok(json!({ "isFavorite": next != 0 }))
}

#[tauri::command]
pub fn update_app_commands(
    app: AppHandle,
    request: UpdateAppCommandsRequest,
) -> Result<(), String> {
    let install_command = trimmed_or_null(request.install_command);
    let start_command = trimmed_or_null(request.start_command);

    if install_command.is_some() != start_command.is_some() {
        return Err("Both install and start commands are required when customizing".to_string());
    }

    let connection = open_db(&app)?;
    let updated = connection
        .execute(
            "UPDATE apps SET install_command = ?1, start_command = ?2, updated_at = ?3 WHERE id = ?4",
            params![
                install_command,
                start_command,
                OffsetDateTime::now_utc().unix_timestamp(),
                request.app_id
            ],
        )
        .map_err(|error| format!("failed to update app commands: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn check_app_name(app: AppHandle, request: CheckAppNameRequest) -> Result<Value, String> {
    let app_name = request.app_name.trim();
    if app_name.is_empty() {
        return Ok(json!({ "exists": false }));
    }

    let app_path = dyad_apps_base_directory()?.join(app_name);
    if app_path.exists() {
        return Ok(json!({ "exists": true }));
    }

    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => {
            return Ok(json!({ "exists": false }))
        }
        Err(error) => return Err(error),
    };
    let exists: Option<i64> = connection
        .query_row(
            "SELECT 1 FROM apps WHERE name = ?1 LIMIT 1",
            params![app_name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to check app name: {error}"))?;

    Ok(json!({ "exists": exists.is_some() }))
}
