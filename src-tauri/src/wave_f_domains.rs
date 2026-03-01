use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::{Component, Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeRequest {
    app_id: i64,
    app_path: String,
    install_command: Option<String>,
    start_command: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestartAppRequest {
    app_id: i64,
    app_path: String,
    install_command: Option<String>,
    start_command: Option<String>,
    remove_node_modules: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIdRequest {
    app_id: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RespondToAppInputRequest {
    app_id: i64,
    response: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditAppFileRequest {
    app_id: i64,
    app_path: String,
    file_path: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleLogEntry {
    level: String,
    r#type: String,
    message: String,
    timestamp: i64,
    source_name: Option<String>,
    app_id: i64,
}

struct RunningAppState {
    child: Arc<Mutex<Child>>,
    stdin: Option<Arc<Mutex<ChildStdin>>>,
}

static RUNNING_APPS: OnceLock<Mutex<HashMap<i64, RunningAppState>>> = OnceLock::new();
static LOG_STORE: OnceLock<Mutex<HashMap<i64, Vec<ConsoleLogEntry>>>> = OnceLock::new();
static LOCALHOST_URL_REGEX: OnceLock<Regex> = OnceLock::new();

fn running_apps() -> &'static Mutex<HashMap<i64, RunningAppState>> {
    RUNNING_APPS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn log_store() -> &'static Mutex<HashMap<i64, Vec<ConsoleLogEntry>>> {
    LOG_STORE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn localhost_url_regex() -> &'static Regex {
    LOCALHOST_URL_REGEX
        .get_or_init(|| Regex::new(r"https?://localhost:\d+/?").expect("localhost url regex"))
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn get_app_port(app_id: i64) -> i64 {
    32_100 + (app_id % 10_000)
}

fn get_default_command(app_id: i64) -> String {
    let port = get_app_port(app_id);
    format!(
        "(pnpm install && pnpm run dev --port {port}) || (npm install --legacy-peer-deps && npm run dev -- --port {port})"
    )
}

fn get_command(app_id: i64, install_command: Option<&str>, start_command: Option<&str>) -> String {
    match (install_command.map(str::trim), start_command.map(str::trim)) {
        (Some(install), Some(start)) if !install.is_empty() && !start.is_empty() => {
            format!("{install} && {start}")
        }
        _ => get_default_command(app_id),
    }
}

fn build_shell_command(command: &str) -> Command {
    if cfg!(target_os = "windows") {
        let mut shell = Command::new("cmd");
        shell.args(["/C", command]);
        shell
    } else {
        let mut shell = Command::new("sh");
        shell.args(["-lc", command]);
        shell
    }
}

fn emit_app_output(app: &AppHandle, output_type: &str, message: String, app_id: i64) {
    let _ = app.emit(
        "app:output",
        json!({
            "type": output_type,
            "message": message,
            "appId": app_id,
            "timestamp": now_millis(),
        }),
    );
}

fn remember_log(entry: ConsoleLogEntry) {
    let mut guard = match log_store().lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };

    let app_logs = guard.entry(entry.app_id).or_default();
    app_logs.push(entry);
    if app_logs.len() > 1_000 {
        app_logs.drain(0..(app_logs.len() - 1_000));
    }
}

fn is_input_request(message: &str) -> bool {
    let trimmed = message.trim_end();
    trimmed.ends_with("› (y/n)")
        || trimmed.ends_with("› (Y/n)")
        || trimmed.ends_with("› (y/N)")
        || trimmed.ends_with("› (Y/N)")
}

fn maybe_emit_preview_url(app: &AppHandle, app_id: i64, message: &str) {
    if let Some(found) = localhost_url_regex().find(message) {
        let url = found.as_str().to_string();
        emit_app_output(
            app,
            "stdout",
            format!("[preview-server]started=[{url}] original=[{url}]"),
            app_id,
        );
    }
}

fn spawn_output_reader<R>(app: AppHandle, app_id: i64, reader: R, output_type: &'static str)
where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        let reader = BufReader::new(reader);
        for line in reader.lines() {
            let message = match line {
                Ok(line) if !line.is_empty() => line,
                Ok(_) => continue,
                Err(_) => break,
            };

            if is_input_request(&message) {
                emit_app_output(&app, "input-requested", message, app_id);
                continue;
            }

            remember_log(ConsoleLogEntry {
                level: if output_type == "stderr" {
                    "error".to_string()
                } else {
                    "info".to_string()
                },
                r#type: "server".to_string(),
                message: message.clone(),
                timestamp: now_millis(),
                source_name: None,
                app_id,
            });

            emit_app_output(&app, output_type, message.clone(), app_id);
            if output_type == "stdout" {
                maybe_emit_preview_url(&app, app_id, &message);
            }
        }
    });
}

fn spawn_exit_monitor(app_id: i64, child: Arc<Mutex<Child>>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(300));
        let exited = {
            let mut locked = match child.lock() {
                Ok(locked) => locked,
                Err(_) => return,
            };
            match locked.try_wait() {
                Ok(Some(_status)) => true,
                Ok(None) => false,
                Err(_) => true,
            }
        };

        if exited {
            if let Ok(mut guard) = running_apps().lock() {
                guard.remove(&app_id);
            }
            break;
        }
    });
}

fn kill_process_tree(pid: u32) {
    if cfg!(target_os = "windows") {
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .status();
    } else {
        let _ = Command::new("pkill")
            .args(["-TERM", "-P", &pid.to_string()])
            .status();
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
    }
}

fn stop_running_app(app_id: i64) -> Result<(), String> {
    let state = {
        let mut guard = running_apps()
            .lock()
            .map_err(|_| "running apps mutex poisoned".to_string())?;
        guard.remove(&app_id)
    };

    if let Some(state) = state {
        let pid = {
            let locked = state
                .child
                .lock()
                .map_err(|_| "child process mutex poisoned".to_string())?;
            locked.id()
        };
        kill_process_tree(pid);
    }

    Ok(())
}

fn remove_node_modules_if_requested(app_path: &str, should_remove: bool) -> Result<(), String> {
    if !should_remove {
        return Ok(());
    }

    let node_modules_path = Path::new(app_path).join("node_modules");
    if node_modules_path.exists() {
        fs::remove_dir_all(&node_modules_path)
            .map_err(|error| format!("failed to remove node_modules: {error}"))?;
    }
    Ok(())
}

fn normalize_relative_path(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);
    if path.is_absolute() {
        return Err("absolute file paths are not allowed".to_string());
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(part) => normalized.push(part),
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err("path escapes app root".to_string());
                }
            }
            _ => return Err("invalid file path".to_string()),
        }
    }

    Ok(normalized)
}

fn resolve_app_file_path(app_path: &str, file_path: &str) -> Result<PathBuf, String> {
    let app_root = fs::canonicalize(app_path)
        .map_err(|error| format!("failed to resolve app path: {error}"))?;
    let relative = normalize_relative_path(file_path)?;
    let full_path = app_root.join(relative);

    if !full_path.starts_with(&app_root) {
        return Err("Invalid file path".to_string());
    }

    Ok(full_path)
}

fn spawn_app_process(
    app: &AppHandle,
    app_id: i64,
    app_path: &str,
    install_command: Option<&str>,
    start_command: Option<&str>,
) -> Result<(), String> {
    let command = get_command(app_id, install_command, start_command);
    let mut process = build_shell_command(&command);
    process
        .current_dir(app_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = process
        .spawn()
        .map_err(|error| format!("failed to spawn app process: {error}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take().map(|stdin| Arc::new(Mutex::new(stdin)));
    let child = Arc::new(Mutex::new(child));

    {
        let mut guard = running_apps()
            .lock()
            .map_err(|_| "running apps mutex poisoned".to_string())?;
        guard.insert(
            app_id,
            RunningAppState {
                child: child.clone(),
                stdin: stdin.clone(),
            },
        );
    }

    if let Some(stdout) = stdout {
        spawn_output_reader(app.clone(), app_id, stdout, "stdout");
    }
    if let Some(stderr) = stderr {
        spawn_output_reader(app.clone(), app_id, stderr, "stderr");
    }

    spawn_exit_monitor(app_id, child);
    Ok(())
}

#[tauri::command]
pub fn run_app(app: AppHandle, request: AppRuntimeRequest) -> Result<(), String> {
    let _ = stop_running_app(request.app_id);
    spawn_app_process(
        &app,
        request.app_id,
        &request.app_path,
        request.install_command.as_deref(),
        request.start_command.as_deref(),
    )
}

#[tauri::command]
pub fn stop_app(request: AppIdRequest) -> Result<(), String> {
    stop_running_app(request.app_id)
}

#[tauri::command]
pub fn restart_app(app: AppHandle, request: RestartAppRequest) -> Result<(), String> {
    let _ = stop_running_app(request.app_id);
    remove_node_modules_if_requested(
        &request.app_path,
        request.remove_node_modules.unwrap_or(false),
    )?;
    spawn_app_process(
        &app,
        request.app_id,
        &request.app_path,
        request.install_command.as_deref(),
        request.start_command.as_deref(),
    )
}

#[tauri::command]
pub fn respond_to_app_input(request: RespondToAppInputRequest) -> Result<(), String> {
    if request.response != "y" && request.response != "n" {
        return Err(format!("Invalid response: {}", request.response));
    }

    let stdin = {
        let guard = running_apps()
            .lock()
            .map_err(|_| "running apps mutex poisoned".to_string())?;
        guard
            .get(&request.app_id)
            .and_then(|state| state.stdin.clone())
            .ok_or_else(|| format!("App {} is not running", request.app_id))?
    };

    let mut locked = stdin
        .lock()
        .map_err(|_| "stdin mutex poisoned".to_string())?;
    locked
        .write_all(format!("{}\n", request.response).as_bytes())
        .map_err(|error| format!("failed to write response to stdin: {error}"))?;
    locked
        .flush()
        .map_err(|error| format!("failed to flush stdin: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn edit_app_file(request: EditAppFileRequest) -> Result<Value, String> {
    let _ = request.app_id;
    let full_path = resolve_app_file_path(&request.app_path, &request.file_path)?;
    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create parent directory: {error}"))?;
    }
    fs::write(full_path, request.content)
        .map_err(|error| format!("failed to write file: {error}"))?;
    Ok(json!({}))
}

#[tauri::command]
pub fn add_log(request: ConsoleLogEntry) -> Result<(), String> {
    remember_log(request);
    Ok(())
}

#[tauri::command]
pub fn clear_logs(request: AppIdRequest) -> Result<(), String> {
    let mut guard = log_store()
        .lock()
        .map_err(|_| "log store mutex poisoned".to_string())?;
    guard.remove(&request.app_id);
    Ok(())
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|error| format!("failed to open external url: {error}"))?;
    Ok(())
}
