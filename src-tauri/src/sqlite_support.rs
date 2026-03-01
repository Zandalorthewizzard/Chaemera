use rusqlite::Connection;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

pub fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
        .to_path_buf()
}

pub fn user_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
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

pub fn sqlite_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(user_data_dir(app)?.join("sqlite.db"))
}

pub fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = sqlite_path(app)?;
    if !path.exists() {
        return Err("sqlite database not found".to_string());
    }
    Connection::open(path).map_err(|error| format!("failed to open sqlite database: {error}"))
}

pub fn dyad_apps_base_directory() -> Result<PathBuf, String> {
    let home_dir = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve home directory".to_string())?;

    Ok(home_dir.join("dyad-apps"))
}

pub fn resolve_workspace_app_path(raw_path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(raw_path);
    if candidate.is_absolute() {
        Ok(candidate)
    } else {
        Ok(dyad_apps_base_directory()?.join(candidate))
    }
}

pub fn normalize_path(path: &str) -> String {
    path.replace('\\', "/")
}

pub fn timestamp_to_rfc3339(timestamp: i64) -> String {
    OffsetDateTime::from_unix_timestamp(timestamp)
        .unwrap_or(OffsetDateTime::UNIX_EPOCH)
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

pub fn now_unix_timestamp() -> i64 {
    OffsetDateTime::now_utc().unix_timestamp()
}
