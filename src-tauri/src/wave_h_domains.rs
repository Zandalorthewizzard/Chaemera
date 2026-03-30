use std::fs;
use tauri::AppHandle;

use crate::core_domains::settings_file_path;
use crate::sqlite_support::{dyad_apps_base_directory, user_data_dir};
use crate::wave_f_domains::stop_all_running_apps;

#[tauri::command]
pub fn reset_all(app: AppHandle) -> Result<(), String> {
    let _ = stop_all_running_apps();

    let app_data_dir = user_data_dir(&app)?;
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
            .map_err(|error| format!("failed to remove chaemera-apps directory: {error}"))?;
    }
    fs::create_dir_all(&dyad_apps_dir)
        .map_err(|error| format!("failed to recreate chaemera-apps directory: {error}"))?;

    Ok(())
}
