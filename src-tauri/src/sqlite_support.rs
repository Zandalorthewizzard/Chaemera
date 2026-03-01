use rusqlite::Connection;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use walkdir::WalkDir;

#[derive(Debug, Clone, Copy, Default)]
pub struct CopyDirOptions {
    pub exclude_node_modules: bool,
    pub exclude_git: bool,
}

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

pub fn run_git(app_path: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(app_path)
        .output()
        .map_err(|error| format!("failed to spawn git: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "git command failed".to_string()
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn should_skip_entry(path: &Path, options: CopyDirOptions) -> bool {
    path.components().any(|component| match component {
        std::path::Component::Normal(part) => {
            let part = part.to_string_lossy();
            (options.exclude_node_modules && part == "node_modules")
                || (options.exclude_git && part == ".git")
        }
        _ => false,
    })
}

pub fn copy_dir_recursive(
    source: &Path,
    destination: &Path,
    options: CopyDirOptions,
) -> Result<(), String> {
    if !source.exists() {
        return Err(format!(
            "source path does not exist: {}",
            source.to_string_lossy()
        ));
    }

    fs::create_dir_all(destination)
        .map_err(|error| format!("failed to create destination directory: {error}"))?;

    for entry in WalkDir::new(source)
        .into_iter()
        .filter_entry(|entry| !should_skip_entry(entry.path(), options))
    {
        let entry = entry.map_err(|error| format!("failed to walk source directory: {error}"))?;
        let path = entry.path();

        if should_skip_entry(path, options) {
            continue;
        }

        let relative = path
            .strip_prefix(source)
            .map_err(|error| format!("failed to build relative path: {error}"))?;

        if relative.as_os_str().is_empty() {
            continue;
        }

        let target = destination.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)
                .map_err(|error| format!("failed to create directory during copy: {error}"))?;
            continue;
        }

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!("failed to create parent directory during copy: {error}")
            })?;
        }

        fs::copy(path, &target).map_err(|error| format!("failed to copy file: {error}"))?;
    }

    Ok(())
}
