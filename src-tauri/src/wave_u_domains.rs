use crate::core_domains::read_settings;
use crate::sqlite_support::open_db;
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::json;
use serde_json::Value;
use std::env;
use tauri::AppHandle;

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCollaboratorRequest {
    app_id: i64,
    username: String,
}

fn is_test_build() -> bool {
    env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn github_api_base() -> String {
    if is_test_build() {
        let port = env::var("FAKE_LLM_PORT").unwrap_or_else(|_| "3500".to_string());
        format!("http://localhost:{port}/github/api")
    } else {
        GITHUB_API_BASE.to_string()
    }
}

fn github_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct GitHub client: {error}"))
}

fn github_token(app: &AppHandle) -> Result<String, String> {
    let settings = read_settings(app)?;
    settings
        .get("githubAccessToken")
        .and_then(|value| value.get("value"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "Not authenticated with GitHub.".to_string())
}

fn linked_repo(app: &AppHandle, app_id: i64) -> Result<(String, String), String> {
    let connection = open_db(app)?;
    let linked = connection
        .query_row(
            "SELECT github_org, github_repo FROM apps WHERE id = ?1",
            params![app_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to query linked GitHub repo: {error}"))?;

    match linked {
        Some((Some(org), Some(repo))) => Ok((org, repo)),
        Some(_) => Err("App is not linked to a GitHub repo.".to_string()),
        None => Err("App not found".to_string()),
    }
}

fn github_api_error(response: Response, fallback: &str) -> String {
    let status = response.status();
    match response.json::<Value>() {
        Ok(payload) => payload
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| format!("{fallback}: {status}")),
        Err(_) => format!("{fallback}: {status}"),
    }
}

fn validate_username(username: &str) -> Result<String, String> {
    let trimmed = username.trim();
    if trimmed.is_empty() {
        return Err("Username cannot be empty.".to_string());
    }

    if trimmed.len() > 39 {
        return Err("GitHub username cannot exceed 39 characters.".to_string());
    }

    if trimmed.len() == 1 {
        if !trimmed.chars().all(|char| char.is_ascii_alphanumeric()) {
            return Err(
                "Invalid GitHub username format. Single-character usernames must be alphanumeric."
                    .to_string(),
            );
        }
    } else if !trimmed
        .chars()
        .enumerate()
        .all(|(index, char)| match index {
            0 => char.is_ascii_alphanumeric(),
            _ if index == trimmed.len() - 1 => char.is_ascii_alphanumeric(),
            _ => char.is_ascii_alphanumeric() || char == '-',
        })
    {
        return Err(
            "Invalid GitHub username format. Usernames can only contain alphanumeric characters and hyphens, and cannot start or end with a hyphen.".to_string(),
        );
    }

    Ok(trimmed.to_string())
}

#[tauri::command]
pub fn github_invite_collaborator(
    app: AppHandle,
    request: GitHubCollaboratorRequest,
) -> Result<(), String> {
    let username = validate_username(&request.username)?;
    let token = github_token(&app)?;
    let (org, repo) = linked_repo(&app, request.app_id)?;
    let client = github_client()?;
    let url = format!(
        "{}/repos/{}/{}/collaborators/{}",
        github_api_base(),
        org,
        repo,
        username
    );

    let response = client
        .put(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/vnd.github+json")
        .json(&json!({ "permission": "push" }))
        .send()
        .map_err(|error| format!("GitHub request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(github_api_error(response, "Failed to invite collaborator"));
    }

    Ok(())
}

#[tauri::command]
pub fn github_remove_collaborator(
    app: AppHandle,
    request: GitHubCollaboratorRequest,
) -> Result<(), String> {
    let token = github_token(&app)?;
    let (org, repo) = linked_repo(&app, request.app_id)?;
    let client = github_client()?;
    let url = format!(
        "{}/repos/{}/{}/collaborators/{}",
        github_api_base(),
        org,
        repo,
        request.username.trim()
    );

    let response = client
        .delete(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .map_err(|error| format!("GitHub request failed: {error}"))?;

    if !response.status().is_success() {
        return Err(github_api_error(response, "Failed to remove collaborator"));
    }

    Ok(())
}
