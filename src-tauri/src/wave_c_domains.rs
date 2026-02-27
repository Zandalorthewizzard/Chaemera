use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex, OnceLock,
};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamRequest {
    chat_id: i64,
    prompt: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolConsentUpdate {
    tool_name: String,
    consent: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentToolConsentResponse {
    request_id: String,
    decision: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerRecord {
    id: i64,
    name: String,
    transport: String,
    command: Option<String>,
    args: Option<Vec<String>>,
    env_json: Option<HashMap<String, String>>,
    headers_json: Option<HashMap<String, String>>,
    url: Option<String>,
    enabled: bool,
    created_at: i64,
    updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerCreateRequest {
    name: String,
    transport: Option<String>,
    command: Option<String>,
    args: Option<Vec<String>>,
    env_json: Option<HashMap<String, String>>,
    headers_json: Option<HashMap<String, String>>,
    url: Option<String>,
    enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerUpdateRequest {
    id: i64,
    name: Option<String>,
    transport: Option<String>,
    command: Option<String>,
    args: Option<Vec<String>>,
    env_json: Option<HashMap<String, String>>,
    headers_json: Option<HashMap<String, String>>,
    url: Option<String>,
    enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolConsentRecord {
    id: i64,
    server_id: i64,
    tool_name: String,
    consent: String,
    updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolConsentRequest {
    server_id: i64,
    tool_name: String,
    consent: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpToolConsentResponse {
    request_id: String,
    decision: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AgentToolRecord {
    name: String,
    description: String,
    is_allowed_by_default: bool,
    consent: String,
}

static ACTIVE_CHAT_STREAMS: OnceLock<Mutex<HashMap<i64, Arc<AtomicBool>>>> = OnceLock::new();

fn active_chat_streams() -> &'static Mutex<HashMap<i64, Arc<AtomicBool>>> {
    ACTIVE_CHAT_STREAMS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

fn app_data_file_path(app: &AppHandle, filename: &str) -> Result<std::path::PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    fs::create_dir_all(&app_dir)
        .map_err(|error| format!("failed to create app data dir: {error}"))?;

    Ok(app_dir.join(filename))
}

fn read_json_file<T>(app: &AppHandle, filename: &str) -> Result<T, String>
where
    T: DeserializeOwned + Default,
{
    let path = app_data_file_path(app, filename)?;
    if !path.exists() {
        return Ok(T::default());
    }

    let raw =
        fs::read_to_string(&path).map_err(|error| format!("failed to read {}: {error}", filename))?;
    serde_json::from_str(&raw).map_err(|error| format!("failed to parse {}: {error}", filename))
}

fn write_json_file<T>(app: &AppHandle, filename: &str, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let path = app_data_file_path(app, filename)?;
    let serialized = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize {}: {error}", filename))?;
    fs::write(&path, serialized).map_err(|error| format!("failed to write {}: {error}", filename))
}

fn get_agent_tool_definitions() -> [(&'static str, &'static str, bool); 3] {
    [
        ("read_file", "Read a file from the current project", true),
        ("grep", "Search for text in the project", true),
        ("list_files", "List files in the current project", true),
    ]
}

fn get_test_response(prompt: &str) -> Option<&'static str> {
    if prompt.contains("[dyad-qa=write]") {
        return Some(
            "Hello world <dyad-write path=\"src/hello.ts\" content=\"Hello world\"> console.log(\"Hello world\"); </dyad-write> EOM",
        );
    }
    if prompt.contains("[dyad-qa=add-dep]") {
        return Some(
            "I'll add that dependency for you. <dyad-add-dependency packages=\"deno\"></dyad-add-dependency> EOM",
        );
    }
    None
}

fn insert_stream_cancel_flag(chat_id: i64) -> Arc<AtomicBool> {
    let flag = Arc::new(AtomicBool::new(false));
    let mut guard = active_chat_streams()
        .lock()
        .expect("chat stream mutex poisoned");
    guard.insert(chat_id, flag.clone());
    flag
}

fn remove_stream_cancel_flag(chat_id: i64) {
    let mut guard = active_chat_streams()
        .lock()
        .expect("chat stream mutex poisoned");
    guard.remove(&chat_id);
}

#[tauri::command]
pub fn chat_stream(app: AppHandle, request: ChatStreamRequest) -> Result<(), String> {
    let chat_id = request.chat_id;
    let prompt = request.prompt.clone();
    let cancel_flag = insert_stream_cancel_flag(chat_id);

    app.emit("chat:stream:start", json!({ "chatId": chat_id }))
        .map_err(|error| format!("failed to emit chat stream start: {error}"))?;

    let app_handle = app.clone();
    thread::spawn(move || {
        let maybe_test_response = get_test_response(&prompt);

        if let Some(response) = maybe_test_response {
            let mut full_response = String::new();
            for chunk in response.split(' ') {
                if cancel_flag.load(Ordering::SeqCst) {
                    let _ = app_handle.emit(
                        "chat:response:end",
                        json!({
                            "chatId": chat_id,
                            "updatedFiles": false,
                            "wasCancelled": true,
                        }),
                    );
                    let _ = app_handle.emit("chat:stream:end", json!({ "chatId": chat_id }));
                    remove_stream_cancel_flag(chat_id);
                    return;
                }

                if !full_response.is_empty() {
                    full_response.push(' ');
                }
                full_response.push_str(chunk);

                let _ = app_handle.emit(
                    "chat:response:chunk",
                    json!({
                        "chatId": chat_id,
                        "messages": [
                            {
                                "id": 0,
                                "role": "assistant",
                                "content": full_response,
                            }
                        ],
                    }),
                );

                thread::sleep(Duration::from_millis(10));
            }

            let _ = app_handle.emit(
                "chat:response:end",
                json!({
                    "chatId": chat_id,
                    "updatedFiles": false,
                }),
            );
            let _ = app_handle.emit("chat:stream:end", json!({ "chatId": chat_id }));
            remove_stream_cancel_flag(chat_id);
            return;
        }

        let _ = app_handle.emit(
            "chat:response:error",
            json!({
                "chatId": chat_id,
                "error": "Tauri chat runtime is not migrated yet. Real chat execution still requires the Electron compatibility backend.",
            }),
        );
        let _ = app_handle.emit(
            "chat:response:end",
            json!({
                "chatId": chat_id,
                "updatedFiles": false,
            }),
        );
        let _ = app_handle.emit("chat:stream:end", json!({ "chatId": chat_id }));
        remove_stream_cancel_flag(chat_id);
    });

    Ok(())
}

#[tauri::command]
pub fn chat_cancel(chat_id: i64) -> Result<bool, String> {
    let guard = active_chat_streams()
        .lock()
        .map_err(|_| "chat stream mutex poisoned".to_string())?;
    if let Some(flag) = guard.get(&chat_id) {
        flag.store(true, Ordering::SeqCst);
        return Ok(true);
    }
    Ok(false)
}

#[tauri::command]
pub fn agent_tool_get_tools(app: AppHandle) -> Result<Value, String> {
    let consents: HashMap<String, String> = read_json_file(&app, "agent-tool-consents.json")?;
    let tools: Vec<AgentToolRecord> = get_agent_tool_definitions()
        .into_iter()
        .map(|(name, description, is_allowed_by_default)| AgentToolRecord {
            name: name.to_string(),
            description: description.to_string(),
            is_allowed_by_default,
            consent: consents
                .get(name)
                .cloned()
                .unwrap_or_else(|| "ask".to_string()),
        })
        .collect();

    serde_json::to_value(tools).map_err(|error| format!("failed to serialize agent tools: {error}"))
}

#[tauri::command]
pub fn agent_tool_set_consent(
    app: AppHandle,
    request: AgentToolConsentUpdate,
) -> Result<(), String> {
    let mut consents: HashMap<String, String> = read_json_file(&app, "agent-tool-consents.json")?;
    consents.insert(request.tool_name, request.consent);
    write_json_file(&app, "agent-tool-consents.json", &consents)
}

#[tauri::command]
pub fn agent_tool_consent_response(_request: AgentToolConsentResponse) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn mcp_list_servers(app: AppHandle) -> Result<Value, String> {
    let servers: Vec<McpServerRecord> = read_json_file(&app, "mcp-servers.json")?;
    serde_json::to_value(servers).map_err(|error| format!("failed to serialize mcp servers: {error}"))
}

#[tauri::command]
pub fn mcp_create_server(
    app: AppHandle,
    request: McpServerCreateRequest,
) -> Result<Value, String> {
    let mut servers: Vec<McpServerRecord> = read_json_file(&app, "mcp-servers.json")?;
    let next_id = servers.iter().map(|server| server.id).max().unwrap_or(0) + 1;
    let now = now_millis();

    let server = McpServerRecord {
        id: next_id,
        name: request.name,
        transport: request.transport.unwrap_or_else(|| "stdio".to_string()),
        command: request.command,
        args: request.args,
        env_json: request.env_json,
        headers_json: request.headers_json,
        url: request.url,
        enabled: request.enabled.unwrap_or(false),
        created_at: now,
        updated_at: now,
    };

    servers.push(server.clone());
    write_json_file(&app, "mcp-servers.json", &servers)?;
    serde_json::to_value(server).map_err(|error| format!("failed to serialize mcp server: {error}"))
}

#[tauri::command]
pub fn mcp_update_server(
    app: AppHandle,
    request: McpServerUpdateRequest,
) -> Result<Value, String> {
    let mut servers: Vec<McpServerRecord> = read_json_file(&app, "mcp-servers.json")?;
    let server = servers
        .iter_mut()
        .find(|server| server.id == request.id)
        .ok_or_else(|| format!("MCP server not found: {}", request.id))?;

    if let Some(name) = request.name {
        server.name = name;
    }
    if let Some(transport) = request.transport {
        server.transport = transport;
    }
    if request.command.is_some() {
        server.command = request.command;
    }
    if request.args.is_some() {
        server.args = request.args;
    }
    if request.env_json.is_some() {
        server.env_json = request.env_json;
    }
    if request.headers_json.is_some() {
        server.headers_json = request.headers_json;
    }
    if request.url.is_some() {
        server.url = request.url;
    }
    if let Some(enabled) = request.enabled {
        server.enabled = enabled;
    }
    server.updated_at = now_millis();

    let result = server.clone();
    write_json_file(&app, "mcp-servers.json", &servers)?;
    serde_json::to_value(result).map_err(|error| format!("failed to serialize mcp server: {error}"))
}

#[tauri::command]
pub fn mcp_delete_server(app: AppHandle, server_id: i64) -> Result<Value, String> {
    let mut servers: Vec<McpServerRecord> = read_json_file(&app, "mcp-servers.json")?;
    servers.retain(|server| server.id != server_id);
    write_json_file(&app, "mcp-servers.json", &servers)?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub fn mcp_list_tools(_server_id: i64) -> Result<Value, String> {
    Ok(json!([]))
}

#[tauri::command]
pub fn mcp_get_tool_consents(app: AppHandle) -> Result<Value, String> {
    let consents: Vec<McpToolConsentRecord> = read_json_file(&app, "mcp-tool-consents.json")?;
    serde_json::to_value(consents)
        .map_err(|error| format!("failed to serialize mcp tool consents: {error}"))
}

#[tauri::command]
pub fn mcp_set_tool_consent(
    app: AppHandle,
    request: McpToolConsentRequest,
) -> Result<Value, String> {
    let mut consents: Vec<McpToolConsentRecord> = read_json_file(&app, "mcp-tool-consents.json")?;
    let now = now_millis();

    if let Some(existing) = consents.iter_mut().find(|entry| {
        entry.server_id == request.server_id && entry.tool_name == request.tool_name
    }) {
        existing.consent = request.consent;
        existing.updated_at = now;
        let result = existing.clone();
        write_json_file(&app, "mcp-tool-consents.json", &consents)?;
        return serde_json::to_value(result)
            .map_err(|error| format!("failed to serialize mcp tool consent: {error}"));
    }

    let next_id = consents.iter().map(|entry| entry.id).max().unwrap_or(0) + 1;
    let record = McpToolConsentRecord {
        id: next_id,
        server_id: request.server_id,
        tool_name: request.tool_name,
        consent: request.consent,
        updated_at: now,
    };

    consents.push(record.clone());
    write_json_file(&app, "mcp-tool-consents.json", &consents)?;
    serde_json::to_value(record)
        .map_err(|error| format!("failed to serialize mcp tool consent: {error}"))
}

#[tauri::command]
pub fn mcp_tool_consent_response(_request: McpToolConsentResponse) -> Result<(), String> {
    Ok(())
}
