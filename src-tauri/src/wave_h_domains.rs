use std::env;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::core_domains::settings_file_path;
use crate::wave_f_domains::stop_all_running_apps;

fn dyad_apps_base_directory() -> Result<PathBuf, String> {
    let home_dir = env::var_os("USERPROFILE")
        .or_else(|| env::var_os("HOME"))
        .map(PathBuf::from)
        .ok_or_else(|| "failed to resolve home directory".to_string())?;

    Ok(home_dir.join("dyad-apps"))
}

#[tauri::command]
pub fn reset_all(app: AppHandle) -> Result<(), String> {
    let _ = stop_all_running_apps();

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    let sqlite_path = app_data_dir.join("sqlite.db");
    if sqlite_path.exists() {
        fs::remove_file(&sqlite_path)
            .map_err(|error| format!("failed to delete database file: {error}"))?;
    }

    let settings_path = settings_file_path(&app)?;
    if settings_path.exists() {
        fs::remove_file(&settings_path)
            .map_err(|error| format!("failed to delete settings file: {error}"))?;
    }

    let dyad_apps_dir = dyad_apps_base_directory()?;
    if dyad_apps_dir.exists() {
        fs::remove_dir_all(&dyad_apps_dir)
            .map_err(|error| format!("failed to remove dyad-apps directory: {error}"))?;
    }
    fs::create_dir_all(&dyad_apps_dir)
        .map_err(|error| format!("failed to recreate dyad-apps directory: {error}"))?;

    Ok(())
}
