use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use uuid::Uuid;

pub(crate) fn settings_file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_dir = if let Some(override_dir) = std::env::var_os("CHAEMERA_TAURI_APP_DATA_DIR") {
        PathBuf::from(override_dir)
    } else {
        app.path()
            .app_data_dir()
            .map_err(|error| format!("failed to resolve app data dir: {error}"))?
    };

    fs::create_dir_all(&app_dir)
        .map_err(|error| format!("failed to create app data dir: {error}"))?;

    Ok(app_dir.join("user-settings.json"))
}

pub(crate) fn default_settings() -> Value {
    json!({
        "selectedModel": {
            "name": "auto",
            "provider": "auto"
        },
        "providerSettings": {},
        "telemetryConsent": "unset",
        "telemetryUserId": Uuid::new_v4().to_string(),
        "hasRunBefore": false,
        "experiments": {},
        "enableProLazyEditsMode": true,
        "enableProSmartFilesContextMode": true,
        "selectedChatMode": "build",
        "enableAutoFixProblems": false,
        "enableAutoUpdate": true,
        "releaseChannel": "stable",
        "selectedTemplateId": "react",
        "selectedThemeId": "default",
        "isRunning": false,
        "enableNativeGit": true,
        "autoExpandPreviewPanel": true,
        "enableContextCompaction": true
    })
}

pub(crate) fn merge_json(base: &mut Value, patch: &Value) {
    match (base, patch) {
        (Value::Object(base_map), Value::Object(patch_map)) => {
            for (key, patch_value) in patch_map {
                match base_map.get_mut(key) {
                    Some(base_value) => merge_json(base_value, patch_value),
                    None => {
                        base_map.insert(key.clone(), patch_value.clone());
                    }
                }
            }
        }
        (base_slot, patch_value) => {
            *base_slot = patch_value.clone();
        }
    }
}

pub(crate) fn read_settings<R: Runtime>(app: &AppHandle<R>) -> Result<Value, String> {
    let file_path = settings_file_path(app)?;
    if !file_path.exists() {
        let defaults = default_settings();
        let serialized = serde_json::to_string_pretty(&defaults)
            .map_err(|error| format!("failed to serialize default settings: {error}"))?;
        fs::write(&file_path, serialized)
            .map_err(|error| format!("failed to write default settings: {error}"))?;
        return Ok(defaults);
    }

    let raw = fs::read_to_string(&file_path)
        .map_err(|error| format!("failed to read settings: {error}"))?;
    let stored: Value = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse settings json: {error}"))?;

    let mut merged = default_settings();
    merge_json(&mut merged, &stored);
    Ok(merged)
}

pub(crate) fn write_settings<R: Runtime>(
    app: &AppHandle<R>,
    patch: Value,
) -> Result<Value, String> {
    let file_path = settings_file_path(app)?;
    let mut current = read_settings(app)?;
    merge_json(&mut current, &patch);

    let serialized = serde_json::to_string_pretty(&current)
        .map_err(|error| format!("failed to serialize settings: {error}"))?;
    fs::write(&file_path, serialized)
        .map_err(|error| format!("failed to persist settings: {error}"))?;

    Ok(current)
}

#[tauri::command]
pub fn window_minimize(window: WebviewWindow) -> Result<(), String> {
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn window_maximize(window: WebviewWindow) -> Result<(), String> {
    if window.is_maximized().map_err(|error| error.to_string())? {
        window.unmaximize().map_err(|error| error.to_string())
    } else {
        window.maximize().map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub fn window_close(window: WebviewWindow) -> Result<(), String> {
    window.close().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_system_platform() -> Result<String, String> {
    Ok(std::env::consts::OS.to_string())
}

#[tauri::command]
pub fn get_app_version(app: AppHandle) -> Result<Value, String> {
    Ok(json!({
        "version": app.package_info().version.to_string()
    }))
}

#[tauri::command]
pub fn get_user_settings(app: AppHandle) -> Result<Value, String> {
    read_settings(&app)
}

#[tauri::command]
pub fn set_user_settings(app: AppHandle, patch: Value) -> Result<Value, String> {
    write_settings(&app, patch)
}
