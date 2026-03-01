use crate::core_domains::{read_settings, write_settings};
use reqwest::blocking::Client;
use reqwest::header::ACCEPT;
use serde::Deserialize;
use serde_json::{json, Value};
use std::env;
use std::sync::{Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

const GITHUB_CLIENT_ID: &str = "Ov23liWV2HdC0RBLecWx";
const GITHUB_SCOPES: &str = "repo,user,workflow";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubStartFlowRequest {
    app_id: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    interval: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubEmailRecord {
    email: String,
    primary: bool,
}

fn github_auth_flow_state() -> &'static Mutex<bool> {
    static STATE: OnceLock<Mutex<bool>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(false))
}

fn is_test_build() -> bool {
    env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn test_server_base() -> String {
    let port = env::var("FAKE_LLM_PORT").unwrap_or_else(|_| "3500".to_string());
    format!("http://localhost:{port}")
}

fn github_device_code_url() -> String {
    if is_test_build() {
        format!("{}/github/login/device/code", test_server_base())
    } else {
        "https://github.com/login/device/code".to_string()
    }
}

fn github_access_token_url() -> String {
    if is_test_build() {
        format!("{}/github/login/oauth/access_token", test_server_base())
    } else {
        "https://github.com/login/oauth/access_token".to_string()
    }
}

fn github_api_base() -> String {
    if is_test_build() {
        format!("{}/github/api", test_server_base())
    } else {
        "https://api.github.com".to_string()
    }
}

fn github_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct GitHub client: {error}"))
}

fn emit_flow_update(app: &AppHandle, payload: Value) {
    let _ = app.emit("github:flow-update", payload);
}

fn emit_flow_success(app: &AppHandle, payload: Value) {
    let _ = app.emit("github:flow-success", payload);
}

fn emit_flow_error(app: &AppHandle, error: &str) {
    let _ = app.emit("github:flow-error", json!({ "error": error }));
}

fn finish_flow() {
    if let Ok(mut active) = github_auth_flow_state().lock() {
        *active = false;
    }
}

fn try_start_flow() -> bool {
    let mut active = github_auth_flow_state()
        .lock()
        .expect("github auth flow mutex poisoned");
    if *active {
        false
    } else {
        *active = true;
        true
    }
}

fn fetch_primary_email(client: &Client, token: &str) -> Result<Option<String>, String> {
    let response = client
        .get(format!("{}/user/emails", github_api_base()))
        .bearer_auth(token)
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .map_err(|error| format!("Failed to fetch GitHub user emails: {error}"))?;

    if !response.status().is_success() {
        return Ok(None);
    }

    let emails = response
        .json::<Vec<GitHubEmailRecord>>()
        .map_err(|error| format!("Failed to parse GitHub user emails: {error}"))?;

    Ok(emails
        .into_iter()
        .find(|email| email.primary)
        .map(|email| email.email))
}

fn persist_github_auth(app: &AppHandle, token: &str) -> Result<(), String> {
    let client = github_client()?;
    let maybe_email = fetch_primary_email(&client, token).ok().flatten();
    let mut patch = json!({
        "githubAccessToken": {
            "value": token,
        }
    });

    if let Some(email) = maybe_email {
        patch["githubUser"] = json!({
            "email": email,
        });
    } else {
        let existing_settings = read_settings(app)?;
        if let Some(existing_user) = existing_settings.get("githubUser") {
            patch["githubUser"] = existing_user.clone();
        }
    }

    write_settings(app, patch)?;
    Ok(())
}

fn poll_for_access_token(app: AppHandle, device_code: String, initial_interval: u64) {
    let client = match github_client() {
        Ok(client) => client,
        Err(error) => {
            emit_flow_error(&app, &error);
            finish_flow();
            return;
        }
    };

    let mut interval = initial_interval.max(1);

    loop {
        emit_flow_update(
            &app,
            json!({
                "message": "Polling GitHub for authorization..."
            }),
        );

        let response = client
            .post(github_access_token_url())
            .header(ACCEPT, "application/json")
            .json(&json!({
                "client_id": GITHUB_CLIENT_ID,
                "device_code": device_code,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            }))
            .send();

        let response = match response {
            Ok(response) => response,
            Err(error) => {
                emit_flow_error(
                    &app,
                    &format!("Network or unexpected error during polling: {error}"),
                );
                finish_flow();
                return;
            }
        };

        let payload = match response.json::<AccessTokenResponse>() {
            Ok(payload) => payload,
            Err(error) => {
                emit_flow_error(
                    &app,
                    &format!("Network or unexpected error during polling: {error}"),
                );
                finish_flow();
                return;
            }
        };

        if let Some(access_token) = payload.access_token {
            if let Err(error) = persist_github_auth(&app, &access_token) {
                emit_flow_error(&app, &error);
                finish_flow();
                return;
            }

            emit_flow_success(
                &app,
                json!({
                    "message": "Successfully connected!"
                }),
            );
            finish_flow();
            return;
        }

        match payload.error.as_deref() {
            Some("authorization_pending") => {
                emit_flow_update(
                    &app,
                    json!({
                        "message": "Waiting for user authorization..."
                    }),
                );
                thread::sleep(Duration::from_secs(interval));
            }
            Some("slow_down") => {
                interval += 5;
                emit_flow_update(
                    &app,
                    json!({
                        "message": format!("GitHub asked to slow down. Retrying in {}s...", interval)
                    }),
                );
                thread::sleep(Duration::from_secs(interval));
            }
            Some("expired_token") => {
                emit_flow_error(&app, "Verification code expired. Please try again.");
                finish_flow();
                return;
            }
            Some("access_denied") => {
                emit_flow_error(&app, "Authorization denied by user.");
                finish_flow();
                return;
            }
            Some(other) => {
                let description = payload
                    .error_description
                    .unwrap_or_else(|| other.to_string());
                emit_flow_error(&app, &format!("GitHub authorization error: {description}"));
                finish_flow();
                return;
            }
            None => {
                emit_flow_error(
                    &app,
                    "GitHub authorization error: Unknown response from device flow.",
                );
                finish_flow();
                return;
            }
        }
    }
}

#[tauri::command]
pub fn github_start_flow(app: AppHandle, request: GitHubStartFlowRequest) -> Result<(), String> {
    let _ = request.app_id;

    if !try_start_flow() {
        emit_flow_error(&app, "Another connection process is already active.");
        return Ok(());
    }

    emit_flow_update(
        &app,
        json!({
            "message": "Requesting device code from GitHub..."
        }),
    );

    let client = match github_client() {
        Ok(client) => client,
        Err(error) => {
            emit_flow_error(&app, &error);
            finish_flow();
            return Ok(());
        }
    };

    let response = client
        .post(github_device_code_url())
        .header(ACCEPT, "application/json")
        .json(&json!({
            "client_id": GITHUB_CLIENT_ID,
            "scope": GITHUB_SCOPES,
        }))
        .send();

    let response = match response {
        Ok(response) => response,
        Err(error) => {
            emit_flow_error(&app, &format!("Failed to start GitHub connection: {error}"));
            finish_flow();
            return Ok(());
        }
    };

    if !response.status().is_success() {
        let message = match response.json::<Value>() {
            Ok(payload) => payload
                .get("error_description")
                .and_then(Value::as_str)
                .map(str::to_string)
                .unwrap_or_else(|| "Failed to start GitHub connection.".to_string()),
            Err(_) => "Failed to start GitHub connection.".to_string(),
        };
        emit_flow_error(
            &app,
            &format!("Failed to start GitHub connection: {message}"),
        );
        finish_flow();
        return Ok(());
    }

    let device_flow = match response.json::<DeviceCodeResponse>() {
        Ok(device_flow) => device_flow,
        Err(error) => {
            emit_flow_error(&app, &format!("Failed to start GitHub connection: {error}"));
            finish_flow();
            return Ok(());
        }
    };

    emit_flow_update(
        &app,
        json!({
            "userCode": device_flow.user_code,
            "verificationUri": device_flow.verification_uri,
            "message": "Please authorize in your browser."
        }),
    );

    let app_handle = app.clone();
    let device_code = device_flow.device_code;
    let interval = device_flow.interval.unwrap_or(5);

    thread::spawn(move || {
        poll_for_access_token(app_handle, device_code, interval);
    });

    Ok(())
}
