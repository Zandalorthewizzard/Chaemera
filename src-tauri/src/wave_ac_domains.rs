use crate::sqlite_support::resolve_workspace_app_path_by_id;
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use serde::Deserialize;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIdRequest {
    app_id: i64,
}

fn is_test_build() -> bool {
    std::env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn command_name(program: &str) -> String {
    if cfg!(target_os = "windows") && matches!(program, "npm" | "npx") {
        format!("{program}.cmd")
    } else {
        program.to_string()
    }
}

fn run_command(
    app: &AppHandle,
    app_path: &Path,
    program: &str,
    args: &[&str],
    error_prefix: &str,
    set_lang: bool,
) -> Result<String, String> {
    refresh_process_path(app);
    let mut command = Command::new(command_name(program));
    command
        .args(args)
        .current_dir(app_path)
        .env("PATH", effective_path_value(app));

    if set_lang {
        command.env("LANG", "en_US.UTF-8");
    }

    let output = command
        .output()
        .map_err(|error| format!("{error_prefix}: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(if detail.is_empty() {
            format!(
                "{error_prefix}: command failed with status {}",
                output.status
            )
        } else {
            format!("{error_prefix}: {detail}")
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn is_capacitor_installed(app_path: &Path) -> bool {
    [
        "capacitor.config.js",
        "capacitor.config.ts",
        "capacitor.config.json",
    ]
    .iter()
    .any(|file_name| app_path.join(file_name).exists())
}

fn ensure_node_v20_or_higher(app: &AppHandle, app_path: &Path) -> Result<(), String> {
    let version = run_command(
        app,
        app_path,
        "node",
        &["--version"],
        "Failed to resolve Node.js version",
        false,
    )?;
    let major_version = version
        .trim()
        .trim_start_matches('v')
        .split('.')
        .next()
        .and_then(|value| value.parse::<u32>().ok())
        .ok_or_else(|| format!("Unable to parse Node.js version: {version}"))?;

    if major_version < 20 {
        return Err(format!(
            "Capacitor requires Node.js v20 or higher, but you are using {version}. Please upgrade your Node.js and try again."
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn is_capacitor(app: AppHandle, request: AppIdRequest) -> Result<bool, String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    ensure_node_v20_or_higher(&app, &app_path)?;
    Ok(is_capacitor_installed(&app_path))
}

#[tauri::command]
pub fn sync_capacitor(app: AppHandle, request: AppIdRequest) -> Result<(), String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;

    if !is_capacitor_installed(&app_path) {
        return Err("Capacitor is not installed in this app".to_string());
    }

    run_command(
        &app,
        &app_path,
        "npm",
        &["run", "build"],
        "Failed to build app",
        false,
    )?;
    run_command(
        &app,
        &app_path,
        "npx",
        &["cap", "sync"],
        "Failed to sync Capacitor",
        true,
    )?;
    Ok(())
}

#[tauri::command]
pub fn open_ios(app: AppHandle, request: AppIdRequest) -> Result<(), String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;

    if !is_capacitor_installed(&app_path) {
        return Err("Capacitor is not installed in this app".to_string());
    }

    if is_test_build() {
        return Ok(());
    }

    run_command(
        &app,
        &app_path,
        "npx",
        &["cap", "open", "ios"],
        "Failed to open iOS project",
        false,
    )?;
    Ok(())
}

#[tauri::command]
pub fn open_android(app: AppHandle, request: AppIdRequest) -> Result<(), String> {
    let app_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;

    if !is_capacitor_installed(&app_path) {
        return Err("Capacitor is not installed in this app".to_string());
    }

    if is_test_build() {
        return Ok(());
    }

    run_command(
        &app,
        &app_path,
        "npx",
        &["cap", "open", "android"],
        "Failed to open Android project",
        false,
    )?;
    Ok(())
}
