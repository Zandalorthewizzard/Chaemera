use reqwest::blocking::Client;
use reqwest::header::CONTENT_TYPE;
use rfd::FileDialog;
use serde::Deserialize;
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Manager, WebviewWindow};

use crate::core_domains::read_settings;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseNoteRequest {
    version: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedUploadRequest {
    url: String,
    content_type: String,
    data: Value,
}

fn custom_node_path(app: &AppHandle) -> Option<String> {
    read_settings(app).ok().and_then(|settings| {
        settings
            .get("customNodePath")
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
    })
}

fn system_path_from_shell() -> Option<String> {
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", "echo %PATH%"])
            .output()
            .ok()?
    } else {
        Command::new("sh")
            .args(["-lc", "printf %s \"$PATH\""])
            .output()
            .ok()?
    };

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

fn node_mock_state() -> &'static Mutex<Option<bool>> {
    static NODE_MOCK_STATE: OnceLock<Mutex<Option<bool>>> = OnceLock::new();
    NODE_MOCK_STATE.get_or_init(|| Mutex::new(None))
}

pub(crate) fn effective_path_value(app: &AppHandle) -> String {
    let separator = if cfg!(target_os = "windows") {
        ";"
    } else {
        ":"
    };
    let mut segments: Vec<String> = Vec::new();

    if let Some(custom_path) = custom_node_path(app) {
        segments.push(custom_path);
    }

    if let Some(system_path) = system_path_from_shell() {
        segments.push(system_path);
    } else if let Ok(current_path) = env::var("PATH") {
        segments.push(current_path);
    }

    segments.join(separator)
}

pub(crate) fn refresh_process_path(app: &AppHandle) {
    env::set_var("PATH", effective_path_value(app));
}

fn run_command_with_app_path(
    app: &AppHandle,
    program: &str,
    args: &[&str],
) -> Result<String, String> {
    refresh_process_path(app);
    let output = Command::new(program)
        .args(args)
        .env("PATH", effective_path_value(app))
        .output()
        .map_err(|error| format!("failed to run {program}: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("{program} failed with status {}", output.status)
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn node_download_url() -> String {
    if cfg!(target_os = "windows") {
        if cfg!(target_arch = "arm") || cfg!(target_arch = "aarch64") {
            "https://nodejs.org/dist/v22.14.0/node-v22.14.0-arm64.msi".to_string()
        } else {
            "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi".to_string()
        }
    } else {
        "https://nodejs.org/dist/v22.14.0/node-v22.14.0.pkg".to_string()
    }
}

fn verify_node_folder(selected_path: &Path) -> Value {
    let node_binary = if cfg!(target_os = "windows") {
        "node.exe"
    } else {
        "node"
    };

    let direct_path = selected_path.join(node_binary);
    if direct_path.exists() {
        return json!({
            "path": selected_path.to_string_lossy(),
            "canceled": false,
            "selectedPath": selected_path.to_string_lossy(),
        });
    }

    let bin_path = selected_path.join("bin").join(node_binary);
    if bin_path.exists() {
        return json!({
            "path": selected_path.join("bin").to_string_lossy(),
            "canceled": false,
            "selectedPath": selected_path.to_string_lossy(),
        });
    }

    json!({
        "path": Value::Null,
        "canceled": false,
        "selectedPath": selected_path.to_string_lossy(),
    })
}

fn app_log_contents(app: &AppHandle) -> String {
    let log_dir = match app.path().app_log_dir() {
        Ok(path) => path,
        Err(_) => return String::new(),
    };

    let entries = match fs::read_dir(log_dir) {
        Ok(entries) => entries,
        Err(_) => return String::new(),
    };

    let mut newest_file: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in entries.flatten() {
        let path = entry.path();
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        if !metadata.is_file() {
            continue;
        }
        let modified = match metadata.modified() {
            Ok(modified) => modified,
            Err(_) => continue,
        };
        match &newest_file {
            Some((current_modified, _)) if &modified <= current_modified => {}
            _ => newest_file = Some((modified, path)),
        }
    }

    let Some((_, log_path)) = newest_file else {
        return String::new();
    };

    fs::read_to_string(log_path).unwrap_or_default()
}

fn selected_model_string(settings: &Value) -> String {
    let Some(selected_model) = settings.get("selectedModel") else {
        return "unknown".to_string();
    };

    let provider = selected_model
        .get("provider")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let name = selected_model
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("unknown");

    let custom_id_suffix = selected_model
        .get("customModelId")
        .and_then(|value| {
            if value.is_null() {
                None
            } else {
                Some(value.to_string())
            }
        })
        .map(|id| format!(" | customId: {id}"))
        .unwrap_or_default();

    format!("{provider}:{name}{custom_id_suffix}")
}

#[tauri::command]
pub fn get_system_debug_info(app: AppHandle) -> Result<Value, String> {
    let settings = read_settings(&app)?;
    let node_version = run_command_with_app_path(&app, "node", &["--version"]).ok();
    let pnpm_version = run_command_with_app_path(&app, "pnpm", &["--version"]).ok();
    let node_path = if cfg!(target_os = "windows") {
        run_command_with_app_path(&app, "where", &["node"]).ok()
    } else {
        run_command_with_app_path(&app, "which", &["node"]).ok()
    };

    Ok(json!({
        "nodeVersion": node_version,
        "pnpmVersion": pnpm_version,
        "nodePath": node_path,
        "telemetryId": settings
            .get("telemetryUserId")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        "telemetryConsent": settings
            .get("telemetryConsent")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        "telemetryUrl": "https://us.i.posthog.com",
        "dyadVersion": app.package_info().version.to_string(),
        "platform": env::consts::OS,
        "architecture": env::consts::ARCH,
        "logs": app_log_contents(&app),
        "selectedLanguageModel": selected_model_string(&settings),
    }))
}

#[tauri::command]
pub fn nodejs_status(app: AppHandle) -> Result<Value, String> {
    if let Ok(guard) = node_mock_state().lock() {
        if let Some(installed) = *guard {
            return Ok(json!({
                "nodeVersion": if installed { Some("v24.0.0") } else { None::<&str> },
                "pnpmVersion": if installed { Some("9.0.0") } else { None::<&str> },
                "nodeDownloadUrl": node_download_url(),
            }));
        }
    }

    Ok(json!({
        "nodeVersion": run_command_with_app_path(&app, "node", &["--version"]).ok(),
        "pnpmVersion": run_command_with_app_path(&app, "pnpm", &["--version"]).ok(),
        "nodeDownloadUrl": node_download_url(),
    }))
}

#[tauri::command]
pub fn test_set_node_mock(installed: Option<bool>) -> Result<(), String> {
    let mut guard = node_mock_state()
        .lock()
        .map_err(|error| format!("failed to lock node mock state: {error}"))?;
    *guard = installed;
    Ok(())
}

#[tauri::command]
pub fn select_node_folder() -> Result<Value, String> {
    let selected = FileDialog::new()
        .set_title("Select Node.js Installation Folder")
        .pick_folder();

    match selected {
        Some(path) => Ok(verify_node_folder(&path)),
        None => Ok(json!({
            "path": Value::Null,
            "canceled": true,
            "selectedPath": Value::Null,
        })),
    }
}

#[tauri::command]
pub fn get_node_path(app: AppHandle) -> Result<Option<String>, String> {
    let path = if cfg!(target_os = "windows") {
        run_command_with_app_path(&app, "where", &["node"]).ok()
    } else {
        run_command_with_app_path(&app, "which", &["node"]).ok()
    };
    Ok(path)
}

#[tauri::command]
pub fn show_item_in_folder(full_path: String) -> Result<(), String> {
    if full_path.trim().is_empty() {
        return Err("No file path provided.".to_string());
    }

    let status = if cfg!(target_os = "windows") {
        Command::new("explorer")
            .args(["/select,", &full_path])
            .status()
    } else if cfg!(target_os = "macos") {
        Command::new("open").args(["-R", &full_path]).status()
    } else {
        let parent = Path::new(&full_path)
            .parent()
            .unwrap_or_else(|| Path::new(&full_path));
        Command::new("xdg-open")
            .arg(parent.to_string_lossy().to_string())
            .status()
    }
    .map_err(|error| format!("failed to show item in folder: {error}"))?;

    if !status.success() {
        return Err("show-item-in-folder command failed".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn clear_session_data(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    window
        .clear_all_browsing_data()
        .map_err(|error| format!("failed to clear browsing data: {error}"))?;

    let ts_cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?
        .join("typescript-cache");

    let _ = fs::remove_dir_all(ts_cache_dir);
    Ok(())
}

#[tauri::command]
pub fn reload_env_path(app: AppHandle) -> Result<(), String> {
    refresh_process_path(&app);
    Ok(())
}

#[tauri::command]
pub fn does_release_note_exist(
    _app: AppHandle,
    request: ReleaseNoteRequest,
) -> Result<Value, String> {
    let _version = request.version.trim();
    Ok(json!({ "exists": false }))
}

#[tauri::command]
pub fn get_user_budget() -> Result<Option<Value>, String> {
    Ok(None)
}

#[tauri::command]
pub fn upload_to_signed_url(request: SignedUploadRequest) -> Result<(), String> {
    if !request.url.starts_with("https://") {
        return Err("Invalid signed URL provided".to_string());
    }

    let body = serde_json::to_vec(&request.data)
        .map_err(|error| format!("failed to serialize upload payload: {error}"))?;
    let response = Client::new()
        .put(&request.url)
        .header(CONTENT_TYPE, request.content_type)
        .body(body)
        .send()
        .map_err(|error| format!("upload request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Upload failed with status {}: {}",
            response.status(),
            response
                .status()
                .canonical_reason()
                .unwrap_or("Unknown status")
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn restart_desktop(app: AppHandle) -> Result<(), String> {
    app.request_restart();
    Ok(())
}
