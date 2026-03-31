use crate::sqlite_support::open_db;
use rusqlite::params;
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

    let raw = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read {}: {error}", filename))?;
    serde_json::from_str(&raw).map_err(|error| format!("failed to parse {}: {error}", filename))
}

fn decode_json_column<T>(raw: Option<String>, label: &str) -> Result<Option<T>, String>
where
    T: DeserializeOwned,
{
    raw.map(|value| {
        serde_json::from_str::<T>(&value)
            .map_err(|error| format!("failed to decode {label}: {error}"))
    })
    .transpose()
}

fn read_mcp_server_record(row: &rusqlite::Row<'_>) -> Result<McpServerRecord, String> {
    let args = decode_json_column::<Vec<String>>(
        row.get(4).map_err(|error| error.to_string())?,
        "mcp server args",
    )?;
    let env_json = decode_json_column::<HashMap<String, String>>(
        row.get(5).map_err(|error| error.to_string())?,
        "mcp server env_json",
    )?;
    let headers_json = decode_json_column::<HashMap<String, String>>(
        row.get(6).map_err(|error| error.to_string())?,
        "mcp server headers_json",
    )?;

    Ok(McpServerRecord {
        id: row.get(0).map_err(|error| error.to_string())?,
        name: row.get(1).map_err(|error| error.to_string())?,
        transport: row.get(2).map_err(|error| error.to_string())?,
        command: row.get(3).map_err(|error| error.to_string())?,
        args,
        env_json,
        headers_json,
        url: row.get(7).map_err(|error| error.to_string())?,
        enabled: row.get::<_, bool>(8).map_err(|error| error.to_string())?,
        created_at: row.get(9).map_err(|error| error.to_string())?,
        updated_at: row.get(10).map_err(|error| error.to_string())?,
    })
}

fn load_mcp_server_record(app: &AppHandle, server_id: i64) -> Result<McpServerRecord, String> {
    let connection = open_db(app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, transport, command, args, env_json, headers_json, url, enabled, created_at, updated_at
             FROM mcp_servers
             WHERE id = ?1",
        )
        .map_err(|error| format!("failed to prepare mcp server query: {error}"))?;

    let mut rows = statement
        .query(params![server_id])
        .map_err(|error| format!("failed to execute mcp server query: {error}"))?;

    let row = rows
        .next()
        .map_err(|error| format!("failed to read mcp server row: {error}"))?
        .ok_or_else(|| format!("MCP server not found: {server_id}"))?;

    read_mcp_server_record(row)
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
        .map(
            |(name, description, is_allowed_by_default)| AgentToolRecord {
                name: name.to_string(),
                description: description.to_string(),
                is_allowed_by_default,
                consent: consents
                    .get(name)
                    .cloned()
                    .unwrap_or_else(|| "ask".to_string()),
            },
        )
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

pub fn agent_tool_consent_response(_request: AgentToolConsentResponse) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn mcp_list_servers(app: AppHandle) -> Result<Value, String> {
    let connection = open_db(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, name, transport, command, args, env_json, headers_json, url, enabled, created_at, updated_at
             FROM mcp_servers
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare mcp servers query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            read_mcp_server_record(row).map_err(|error| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, error)),
                )
            })
        })
        .map_err(|error| format!("failed to execute mcp servers query: {error}"))?;

    let servers = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode mcp servers: {error}"))?;

    serde_json::to_value(servers)
        .map_err(|error| format!("failed to serialize mcp servers: {error}"))
}

#[tauri::command]
pub fn mcp_create_server(app: AppHandle, request: McpServerCreateRequest) -> Result<Value, String> {
    let connection = open_db(&app)?;
    let args_json = request
        .args
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server args: {error}"))?;
    let env_json = request
        .env_json
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server env_json: {error}"))?;
    let headers_json = request
        .headers_json
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server headers_json: {error}"))?;
    let transport = request.transport.unwrap_or_else(|| "stdio".to_string());
    let enabled = request.enabled.unwrap_or(false);

    connection
        .execute(
            "INSERT INTO mcp_servers (name, transport, command, args, env_json, headers_json, url, enabled)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                request.name,
                transport,
                request.command,
                args_json,
                env_json,
                headers_json,
                request.url,
                enabled,
            ],
        )
        .map_err(|error| format!("failed to insert mcp server: {error}"))?;

    let server = load_mcp_server_record(&app, connection.last_insert_rowid())?;
    serde_json::to_value(server).map_err(|error| format!("failed to serialize mcp server: {error}"))
}

#[tauri::command]
pub fn mcp_update_server(app: AppHandle, request: McpServerUpdateRequest) -> Result<Value, String> {
    let mut server = load_mcp_server_record(&app, request.id)?;

    if let Some(name) = request.name {
        server.name = name;
    }
    if let Some(transport) = request.transport {
        server.transport = transport;
    }
    if let Some(command) = request.command {
        server.command = Some(command);
    }
    if let Some(args) = request.args {
        server.args = Some(args);
    }
    if let Some(env_json) = request.env_json {
        server.env_json = Some(env_json);
    }
    if let Some(headers_json) = request.headers_json {
        server.headers_json = Some(headers_json);
    }
    if let Some(url) = request.url {
        server.url = Some(url);
    }
    if let Some(enabled) = request.enabled {
        server.enabled = enabled;
    }

    let connection = open_db(&app)?;
    let args_json = server
        .args
        .clone()
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server args: {error}"))?;
    let env_json = server
        .env_json
        .clone()
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server env_json: {error}"))?;
    let headers_json = server
        .headers_json
        .clone()
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| format!("failed to encode mcp server headers_json: {error}"))?;

    connection
        .execute(
            "UPDATE mcp_servers
             SET name = ?1,
                 transport = ?2,
                 command = ?3,
                 args = ?4,
                 env_json = ?5,
                 headers_json = ?6,
                 url = ?7,
                 enabled = ?8,
                 updated_at = unixepoch()
             WHERE id = ?9",
            params![
                server.name,
                server.transport,
                server.command,
                args_json,
                env_json,
                headers_json,
                server.url,
                server.enabled,
                request.id,
            ],
        )
        .map_err(|error| format!("failed to update mcp server: {error}"))?;

    let result = load_mcp_server_record(&app, request.id)?;
    serde_json::to_value(result).map_err(|error| format!("failed to serialize mcp server: {error}"))
}

#[tauri::command]
pub fn mcp_delete_server(app: AppHandle, server_id: i64) -> Result<Value, String> {
    let connection = open_db(&app)?;
    connection
        .execute("DELETE FROM mcp_servers WHERE id = ?1", params![server_id])
        .map_err(|error| format!("failed to delete mcp server: {error}"))?;
    Ok(json!({ "success": true }))
}

#[tauri::command]
pub fn mcp_list_tools(_server_id: i64) -> Result<Value, String> {
    Ok(json!([]))
}

#[tauri::command]
pub fn mcp_get_tool_consents(app: AppHandle) -> Result<Value, String> {
    let connection = open_db(&app)?;
    let mut statement = connection
        .prepare(
            "SELECT id, server_id, tool_name, consent, updated_at
             FROM mcp_tool_consents
             ORDER BY id ASC",
        )
        .map_err(|error| format!("failed to prepare mcp tool consents query: {error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(McpToolConsentRecord {
                id: row.get(0)?,
                server_id: row.get(1)?,
                tool_name: row.get(2)?,
                consent: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|error| format!("failed to execute mcp tool consents query: {error}"))?;

    let consents = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode mcp tool consents: {error}"))?;

    serde_json::to_value(consents)
        .map_err(|error| format!("failed to serialize mcp tool consents: {error}"))
}

#[tauri::command]
pub fn mcp_set_tool_consent(
    app: AppHandle,
    request: McpToolConsentRequest,
) -> Result<Value, String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "INSERT INTO mcp_tool_consents (server_id, tool_name, consent)
             VALUES (?1, ?2, ?3)
             ON CONFLICT(server_id, tool_name)
             DO UPDATE SET consent = excluded.consent, updated_at = unixepoch()",
            params![request.server_id, request.tool_name, request.consent],
        )
        .map_err(|error| format!("failed to upsert mcp tool consent: {error}"))?;

    let mut statement = connection
        .prepare(
            "SELECT id, server_id, tool_name, consent, updated_at
             FROM mcp_tool_consents
             WHERE server_id = ?1 AND tool_name = ?2",
        )
        .map_err(|error| format!("failed to prepare mcp tool consent query: {error}"))?;

    let mut rows = statement
        .query(params![request.server_id, request.tool_name])
        .map_err(|error| format!("failed to execute mcp tool consent query: {error}"))?;

    let row = rows
        .next()
        .map_err(|error| format!("failed to read mcp tool consent row: {error}"))?
        .ok_or_else(|| "MCP tool consent not found after upsert".to_string())?;

    let record = McpToolConsentRecord {
        id: row.get(0).map_err(|error| error.to_string())?,
        server_id: row.get(1).map_err(|error| error.to_string())?,
        tool_name: row.get(2).map_err(|error| error.to_string())?,
        consent: row.get(3).map_err(|error| error.to_string())?,
        updated_at: row.get(4).map_err(|error| error.to_string())?,
    };

    serde_json::to_value(record)
        .map_err(|error| format!("failed to serialize mcp tool consent: {error}"))
}

pub fn mcp_tool_consent_response(_request: McpToolConsentResponse) -> Result<(), String> {
    Ok(())
}
