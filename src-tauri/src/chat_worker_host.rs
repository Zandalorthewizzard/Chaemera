use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, OnceLock,
};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatAttachment {
    name: String,
    #[serde(rename = "type")]
    r#type: String,
    data: String,
    attachment_type: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentSelection {
    id: String,
    name: String,
    runtime_id: Option<String>,
    relative_path: String,
    line_number: i64,
    column_number: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamRequest {
    chat_id: i64,
    prompt: String,
    redo: Option<bool>,
    attachments: Option<Vec<ChatAttachment>>,
    selected_components: Option<Vec<ComponentSelection>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolConsentResponse {
    request_id: String,
    decision: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolConsentResponse {
    request_id: String,
    decision: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WorkerOutboundMessage {
    StreamStart {
        chat_id: i64,
    },
    Chunk {
        chat_id: i64,
        messages: Value,
    },
    End {
        chat_id: i64,
        updated_files: bool,
        extra_files: Option<Vec<String>>,
        extra_files_error: Option<String>,
        total_tokens: Option<i64>,
        context_window: Option<i64>,
        chat_summary: Option<String>,
        was_cancelled: Option<bool>,
    },
    Error {
        chat_id: i64,
        error: String,
    },
    AgentToolConsentRequest {
        request_id: String,
        tool_name: String,
        tool_description: String,
        input_preview: String,
    },
    McpToolConsentRequest {
        request_id: String,
        server_id: i64,
        server_name: Option<String>,
        tool_name: String,
        tool_description: String,
        input_preview: String,
    },
    Log {
        level: String,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum WorkerInboundMessage {
    Start {
        chat_id: i64,
        prompt: String,
        redo: bool,
        attachments: Vec<ChatAttachment>,
        selected_components: Vec<ComponentSelection>,
        app_path: String,
        settings_snapshot: Value,
    },
    Cancel {
        chat_id: i64,
    },
    ToolConsentResponse {
        request_id: String,
        approved: bool,
    },
    McpToolConsentResponse {
        request_id: String,
        approved: bool,
    },
}

struct ChatWorkerSessionState {
    child: Arc<Mutex<Child>>,
    stdin: Arc<Mutex<ChildStdin>>,
    pending_request_ids: Arc<Mutex<HashSet<String>>>,
    terminated: Arc<AtomicBool>,
}

static ACTIVE_CHAT_WORKERS: OnceLock<Mutex<HashMap<i64, ChatWorkerSessionState>>> = OnceLock::new();
static PENDING_CONSENT_REQUESTS: OnceLock<Mutex<HashMap<String, i64>>> = OnceLock::new();

fn active_chat_workers() -> &'static Mutex<HashMap<i64, ChatWorkerSessionState>> {
    ACTIVE_CHAT_WORKERS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn pending_consent_requests() -> &'static Mutex<HashMap<String, i64>> {
    PENDING_CONSENT_REQUESTS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
        .to_path_buf()
}

fn resolve_runtime_asset(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    let dev_path = workspace_root().join(relative_path);
    if dev_path.exists() {
        return Ok(dev_path);
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| format!("failed to resolve resource dir: {error}"))?;
    let packaged_path = resource_dir.join(relative_path);
    if packaged_path.exists() {
        return Ok(packaged_path);
    }

    Err(format!("failed to resolve runtime asset: {relative_path}"))
}

fn send_worker_message(
    stdin: &Arc<Mutex<ChildStdin>>,
    msg: &WorkerInboundMessage,
) -> Result<(), String> {
    let serialized =
        serde_json::to_vec(msg).map_err(|error| format!("failed to serialize worker message: {error}"))?;
    let mut locked = stdin
        .lock()
        .map_err(|_| "worker stdin mutex poisoned".to_string())?;
    locked
        .write_all(&serialized)
        .map_err(|error| format!("failed to write worker message: {error}"))?;
    locked
        .write_all(b"\n")
        .map_err(|error| format!("failed to write worker newline: {error}"))?;
    locked
        .flush()
        .map_err(|error| format!("failed to flush worker stdin: {error}"))?;
    Ok(())
}

fn remove_pending_request_ids(request_ids: &[String]) {
    if request_ids.is_empty() {
        return;
    }

    if let Ok(mut pending) = pending_consent_requests().lock() {
        for request_id in request_ids {
            pending.remove(request_id);
        }
    }
}

fn cleanup_session(chat_id: i64) {
    let state = {
        let mut guard = match active_chat_workers().lock() {
            Ok(guard) => guard,
            Err(_) => return,
        };
        guard.remove(&chat_id)
    };

    if let Some(state) = state {
        let request_ids = {
            let guard = state
                .pending_request_ids
                .lock()
                .ok()
                .map(|guard| guard.iter().cloned().collect::<Vec<_>>())
                .unwrap_or_default();
            guard
        };
        remove_pending_request_ids(&request_ids);

        if let Ok(mut child) = state.child.lock() {
            let _ = child.kill();
            let _ = child.try_wait();
        }

        state.terminated.store(true, Ordering::SeqCst);
    }
}

fn emit_stream_start(app: &AppHandle, chat_id: i64) {
    let _ = app.emit("chat:stream:start", json!({ "chatId": chat_id }));
}

fn emit_chunk(app: &AppHandle, chat_id: i64, messages: Value) {
    let _ = app.emit(
        "chat:response:chunk",
        json!({
            "chatId": chat_id,
            "messages": messages,
        }),
    );
}

fn emit_end(
    app: &AppHandle,
    chat_id: i64,
    updated_files: bool,
    extra_files: Option<Vec<String>>,
    extra_files_error: Option<String>,
    total_tokens: Option<i64>,
    context_window: Option<i64>,
    chat_summary: Option<String>,
    was_cancelled: Option<bool>,
) {
    let _ = app.emit(
        "chat:response:end",
        json!({
            "chatId": chat_id,
            "updatedFiles": updated_files,
            "extraFiles": extra_files,
            "extraFilesError": extra_files_error,
            "totalTokens": total_tokens,
            "contextWindow": context_window,
            "chatSummary": chat_summary,
            "wasCancelled": was_cancelled,
        }),
    );
    let _ = app.emit("chat:stream:end", json!({ "chatId": chat_id }));
}

fn emit_error(app: &AppHandle, chat_id: i64, error: String) {
    let _ = app.emit(
        "chat:response:error",
        json!({
            "chatId": chat_id,
            "error": error,
        }),
    );
}

fn emit_agent_tool_consent_request(
    app: &AppHandle,
    chat_id: i64,
    request_id: String,
    tool_name: String,
    tool_description: String,
    input_preview: String,
) {
    let _ = app.emit(
        "agent-tool:consent-request",
        json!({
            "chatId": chat_id,
            "requestId": request_id,
            "toolName": tool_name,
            "toolDescription": tool_description,
            "inputPreview": input_preview,
        }),
    );
}

fn emit_mcp_tool_consent_request(
    app: &AppHandle,
    chat_id: i64,
    request_id: String,
    server_id: i64,
    server_name: Option<String>,
    tool_name: String,
    tool_description: String,
    input_preview: String,
) {
    let _ = app.emit(
        "mcp:tool-consent-request",
        json!({
            "chatId": chat_id,
            "requestId": request_id,
            "serverId": server_id,
            "serverName": server_name,
            "toolName": tool_name,
            "toolDescription": tool_description,
            "inputPreview": input_preview,
        }),
    );
}


fn spawn_stdout_reader(app: AppHandle, chat_id: i64, stdout: impl std::io::Read + Send + 'static) {
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = match line {
                Ok(line) if !line.trim().is_empty() => line,
                Ok(_) => continue,
                Err(error) => {
                    eprintln!("chat worker stdout read error: {error}");
                    break;
                }
            };

            let msg: WorkerOutboundMessage = match serde_json::from_str(&line) {
                Ok(msg) => msg,
                Err(error) => {
                    emit_error(
                        &app,
                        chat_id,
                        format!("Failed to parse chat worker output: {error}"),
                    );
                    emit_end(&app, chat_id, false, None, None, None, None, None, None);
                    cleanup_session(chat_id);
                    break;
                }
            };

            match msg {
                WorkerOutboundMessage::StreamStart { chat_id } => {
                    emit_stream_start(&app, chat_id);
                }
                WorkerOutboundMessage::Chunk { chat_id, messages } => {
                    emit_chunk(&app, chat_id, messages);
                }
                WorkerOutboundMessage::End {
                    chat_id,
                    updated_files,
                    extra_files,
                    extra_files_error,
                    total_tokens,
                    context_window,
                    chat_summary,
                    was_cancelled,
                } => {
                    emit_end(
                        &app,
                        chat_id,
                        updated_files,
                        extra_files,
                        extra_files_error,
                        total_tokens,
                        context_window,
                        chat_summary,
                        was_cancelled,
                    );
                    cleanup_session(chat_id);
                    break;
                }
                WorkerOutboundMessage::Error { chat_id, error } => {
                    emit_error(&app, chat_id, error);
                    emit_end(&app, chat_id, false, None, None, None, None, None, None);
                    cleanup_session(chat_id);
                    break;
                }
                WorkerOutboundMessage::AgentToolConsentRequest {
                    request_id,
                    tool_name,
                    tool_description,
                    input_preview,
                } => {
                    if let Ok(mut pending) = pending_consent_requests().lock() {
                        pending.insert(request_id.clone(), chat_id);
                    }
                    if let Ok(guard) = active_chat_workers().lock() {
                        if let Some(session) = guard.get(&chat_id) {
                            if let Ok(mut ids) = session.pending_request_ids.lock() {
                                ids.insert(request_id.clone());
                            }
                        }
                    }
                    emit_agent_tool_consent_request(
                        &app,
                        chat_id,
                        request_id,
                        tool_name,
                        tool_description,
                        input_preview,
                    );
                }
                WorkerOutboundMessage::McpToolConsentRequest {
                    request_id,
                    server_id,
                    server_name,
                    tool_name,
                    tool_description,
                    input_preview,
                } => {
                    if let Ok(mut pending) = pending_consent_requests().lock() {
                        pending.insert(request_id.clone(), chat_id);
                    }
                    if let Ok(guard) = active_chat_workers().lock() {
                        if let Some(session) = guard.get(&chat_id) {
                            if let Ok(mut ids) = session.pending_request_ids.lock() {
                                ids.insert(request_id.clone());
                            }
                        }
                    }
                    emit_mcp_tool_consent_request(
                        &app,
                        chat_id,
                        request_id,
                        server_id,
                        server_name,
                        tool_name,
                        tool_description,
                        input_preview,
                    );
                }
                WorkerOutboundMessage::Log { level, message } => {
                    eprintln!("[chat-worker][{level}] {message}");
                }
            }
        }
    });
}

fn spawn_stderr_reader(stderr: impl std::io::Read + Send + 'static) {
    thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            match line {
                Ok(line) if !line.trim().is_empty() => eprintln!("[chat-worker] {line}"),
                Ok(_) => continue,
                Err(error) => {
                    eprintln!("chat worker stderr read error: {error}");
                    break;
                }
            }
        }
    });
}

fn spawn_exit_monitor(app: AppHandle, chat_id: i64, child: Arc<Mutex<Child>>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_millis(200));
        let exited = {
            let mut child = match child.lock() {
                Ok(child) => child,
                Err(_) => return,
            };
            match child.try_wait() {
                Ok(Some(status)) => Some(status.code().unwrap_or_default()),
                Ok(None) => None,
                Err(error) => {
                    emit_error(
                        &app,
                        chat_id,
                        format!("Chat worker exit monitor failed: {error}"),
                    );
                    Some(1)
                }
            }
        };

        if let Some(code) = exited {
            let should_emit_terminal = {
                let guard = match active_chat_workers().lock() {
                    Ok(guard) => guard,
                    Err(_) => return,
                };
                guard.contains_key(&chat_id)
            };

            if should_emit_terminal {
                if code != 0 {
                    emit_error(
                        &app,
                        chat_id,
                        format!("Chat worker exited with code {code}"),
                    );
                    emit_end(&app, chat_id, false, None, None, None, None, None, None);
                }
                cleanup_session(chat_id);
            }
            break;
        }
    });
}

fn start_worker_session(app: &AppHandle, request: &ChatStreamRequest) -> Result<(), String> {
    let active = active_chat_workers()
        .lock()
        .map_err(|_| "chat worker session mutex poisoned".to_string())?;
    if active.contains_key(&request.chat_id) {
        return Err(format!("Chat worker session already active for chat {}", request.chat_id));
    }
    drop(active);

    let runner_path = resolve_runtime_asset(app, "worker/chat_worker_runner.js")?;
    let bundle_path = resolve_runtime_asset(app, ".vite/build/chat_worker.js")?;

    let mut child = Command::new("node")
        .arg(&runner_path)
        .env("CHAT_WORKER_BUNDLE", &bundle_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("failed to spawn chat worker runner: {error}"))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "failed to access chat worker stdin".to_string())?;
    let child = Arc::new(Mutex::new(child));
    let stdin = Arc::new(Mutex::new(stdin));
    let pending_request_ids = Arc::new(Mutex::new(HashSet::new()));
    let terminated = Arc::new(AtomicBool::new(false));

    {
        let mut guard = active_chat_workers()
            .lock()
            .map_err(|_| "chat worker session mutex poisoned".to_string())?;
        guard.insert(
            request.chat_id,
            ChatWorkerSessionState {
                child: child.clone(),
                stdin: stdin.clone(),
                pending_request_ids: pending_request_ids.clone(),
                terminated: terminated.clone(),
            },
        );
    }

    if let Some(stdout) = stdout {
        spawn_stdout_reader(app.clone(), request.chat_id, stdout);
    }
    if let Some(stderr) = stderr {
        spawn_stderr_reader(stderr);
    }
    spawn_exit_monitor(app.clone(), request.chat_id, child.clone());

    let start_message = WorkerInboundMessage::Start {
        chat_id: request.chat_id,
        prompt: request.prompt.clone(),
        redo: request.redo.unwrap_or(false),
        attachments: request.attachments.clone().unwrap_or_default(),
        selected_components: request.selected_components.clone().unwrap_or_default(),
        app_path: String::new(),
        settings_snapshot: json!({}),
    };
    send_worker_message(&stdin, &start_message)?;

    Ok(())
}

fn respond_to_session(
    request_id: String,
    approved: bool,
    is_mcp: bool,
) -> Result<(), String> {
    let chat_id = {
        let mut guard = pending_consent_requests()
            .lock()
            .map_err(|_| "pending consent request mutex poisoned".to_string())?;
        guard
            .remove(&request_id)
            .ok_or_else(|| format!("No pending consent request found for requestId {request_id}"))?
    };

    let stdin = {
        let guard = active_chat_workers()
            .lock()
            .map_err(|_| "chat worker session mutex poisoned".to_string())?;
        let session = guard
            .get(&chat_id)
            .ok_or_else(|| format!("Chat worker session not found for chat {chat_id}"))?;
        session.stdin.clone()
    };

    let message = if is_mcp {
        WorkerInboundMessage::McpToolConsentResponse {
            request_id: request_id.clone(),
            approved,
        }
    } else {
        WorkerInboundMessage::ToolConsentResponse {
            request_id: request_id.clone(),
            approved,
        }
    };

    send_worker_message(&stdin, &message)?;

    if let Ok(guard) = active_chat_workers().lock() {
        if let Some(session) = guard.get(&chat_id) {
            if let Ok(mut ids) = session.pending_request_ids.lock() {
                ids.remove(&request_id);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn chat_stream(app: AppHandle, request: ChatStreamRequest) -> Result<(), String> {
    start_worker_session(&app, &request).or_else(|error| {
        emit_error(&app, request.chat_id, error);
        emit_end(&app, request.chat_id, false, None, None, None, None, None, None);
        Ok(())
    })
}

#[tauri::command]
pub fn chat_cancel(chat_id: i64) -> Result<bool, String> {
    let stdin = {
        let guard = active_chat_workers()
            .lock()
            .map_err(|_| "chat worker session mutex poisoned".to_string())?;
        guard.get(&chat_id).map(|session| session.stdin.clone())
    };

    if let Some(stdin) = stdin {
        let message = WorkerInboundMessage::Cancel { chat_id };
        send_worker_message(&stdin, &message)?;
        return Ok(true);
    }

    Ok(false)
}

#[tauri::command]
pub fn agent_tool_consent_response(request: AgentToolConsentResponse) -> Result<(), String> {
    let approved = matches!(request.decision.as_str(), "accept-once" | "accept-always");
    respond_to_session(request.request_id, approved, false)
}

#[tauri::command]
pub fn mcp_tool_consent_response(request: McpToolConsentResponse) -> Result<(), String> {
    let approved = matches!(request.decision.as_str(), "accept-once" | "accept-always");
    respond_to_session(request.request_id, approved, true)
}
