use crate::core_domains::{read_settings, write_settings};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::AppHandle;

const VERCEL_API_BASE: &str = "https://api.vercel.com";
const OLLAMA_API_BASE: &str = "http://localhost:11434";
const LM_STUDIO_API_BASE: &str = "http://localhost:1234";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VercelSaveTokenRequest {
    token: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VercelProjectAvailabilityRequest {
    name: String,
}

#[derive(Debug, Deserialize)]
struct VercelProjectsEnvelope {
    projects: Option<Vec<VercelProjectRecord>>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct VercelProjectRecord {
    id: String,
    name: String,
    framework: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModelRecord>>,
}

#[derive(Debug, Deserialize)]
struct OllamaModelRecord {
    name: String,
}

#[derive(Debug, Deserialize)]
struct LMStudioModelsResponse {
    data: Vec<LMStudioModelRecord>,
}

#[derive(Debug, Deserialize)]
struct LMStudioModelRecord {
    #[serde(rename = "type")]
    model_type: String,
    id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalModelRecord {
    provider: String,
    model_name: String,
    display_name: String,
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct http client: {error}"))
}

fn get_vercel_token(app: &AppHandle) -> Result<String, String> {
    let settings = read_settings(app)?;
    let token = settings
        .get("vercelAccessToken")
        .and_then(|value| value.get("value"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Not authenticated with Vercel.".to_string())?;
    Ok(token.to_string())
}

fn save_vercel_token(app: &AppHandle, token: &str) -> Result<(), String> {
    write_settings(
        app,
        json!({
            "vercelAccessToken": {
                "value": token.trim(),
            }
        }),
    )?;
    Ok(())
}

fn fetch_vercel_projects(
    token: &str,
    search: Option<&str>,
) -> Result<Vec<VercelProjectRecord>, String> {
    let client = http_client()?;
    let mut request = client
        .get(format!("{VERCEL_API_BASE}/v9/projects"))
        .bearer_auth(token);

    if let Some(search) = search {
        request = request.query(&[("search", search)]);
    }

    let response = request
        .send()
        .map_err(|error| format!("Failed to fetch Vercel projects: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch Vercel projects: {}",
            response.status()
        ));
    }

    let payload: VercelProjectsEnvelope = response
        .json()
        .map_err(|error| format!("Failed to parse Vercel projects: {error}"))?;
    Ok(payload.projects.unwrap_or_default())
}

fn validate_vercel_token(token: &str) -> Result<(), String> {
    let client = http_client()?;
    let response = client
        .get(format!("{VERCEL_API_BASE}/v2/user"))
        .bearer_auth(token)
        .send()
        .map_err(|error| format!("Failed to validate Vercel token: {error}"))?;

    if !response.status().is_success() {
        return Err("Invalid access token. Please check your token and try again.".to_string());
    }

    Ok(())
}

fn prettify_ollama_name(model_name: &str) -> String {
    model_name
        .split(':')
        .next()
        .unwrap_or(model_name)
        .replace('-', " ")
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    let mut display = String::new();
                    display.extend(first.to_uppercase());
                    display.push_str(chars.as_str());
                    display
                }
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

#[tauri::command]
pub fn vercel_save_token(
    app: AppHandle,
    request: VercelSaveTokenRequest,
) -> Result<(), String> {
    let token = request.token.trim();
    if token.is_empty() {
        return Err("Access token is required.".to_string());
    }

    validate_vercel_token(token)?;
    save_vercel_token(&app, token)
}

#[tauri::command]
pub fn vercel_list_projects(app: AppHandle) -> Result<Value, String> {
    let token = get_vercel_token(&app)?;
    let projects = fetch_vercel_projects(&token, None)?;
    serde_json::to_value(projects)
        .map_err(|error| format!("Failed to serialize Vercel projects: {error}"))
}

#[tauri::command]
pub fn vercel_is_project_available(
    app: AppHandle,
    request: VercelProjectAvailabilityRequest,
) -> Result<Value, String> {
    let token = match get_vercel_token(&app) {
        Ok(token) => token,
        Err(error) => {
            return Ok(json!({
                "available": false,
                "error": error,
            }))
        }
    };

    let projects = match fetch_vercel_projects(&token, Some(&request.name)) {
        Ok(projects) => projects,
        Err(error) => {
            return Ok(json!({
                "available": false,
                "error": error,
            }))
        }
    };

    let project_exists = projects.iter().any(|project| project.name == request.name);
    Ok(json!({
        "available": !project_exists,
        "error": if project_exists {
            Some("Project name is not available.")
        } else {
            None::<String>
        }
    }))
}

#[tauri::command]
pub fn local_models_list_ollama() -> Result<Value, String> {
    let client = http_client()?;
    let response = client
        .get(format!("{OLLAMA_API_BASE}/api/tags"))
        .send()
        .map_err(|error| {
            let message = error.to_string();
            if message.contains("Connection refused") || message.contains("error sending request") {
                "Could not connect to Ollama. Make sure it's running at http://localhost:11434"
                    .to_string()
            } else {
                "Failed to fetch models from Ollama".to_string()
            }
        })?;

    if !response.status().is_success() {
        return Err("Failed to fetch models from Ollama".to_string());
    }

    let payload: OllamaTagsResponse = response
        .json()
        .map_err(|_| "Failed to fetch models from Ollama".to_string())?;

    let models: Vec<LocalModelRecord> = payload
        .models
        .unwrap_or_default()
        .into_iter()
        .map(|model| LocalModelRecord {
            provider: "ollama".to_string(),
            display_name: prettify_ollama_name(&model.name),
            model_name: model.name,
        })
        .collect();

    Ok(json!({ "models": models }))
}

#[tauri::command]
pub fn local_models_list_lmstudio() -> Result<Value, String> {
    let client = http_client()?;
    let response = client
        .get(format!("{LM_STUDIO_API_BASE}/api/v0/models"))
        .send()
        .map_err(|_| "Failed to fetch models from LM Studio".to_string())?;

    if !response.status().is_success() {
        return Err("Failed to fetch models from LM Studio".to_string());
    }

    let payload: LMStudioModelsResponse = response
        .json()
        .map_err(|_| "Failed to fetch models from LM Studio".to_string())?;

    let models: Vec<LocalModelRecord> = payload
        .data
        .into_iter()
        .filter(|model| model.model_type == "llm")
        .map(|model| LocalModelRecord {
            provider: "lmstudio".to_string(),
            display_name: model.id.clone(),
            model_name: model.id,
        })
        .collect();

    Ok(json!({ "models": models }))
}
