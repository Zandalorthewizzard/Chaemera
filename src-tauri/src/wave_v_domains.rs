use crate::core_domains::read_settings;
use crate::sqlite_support::{dyad_apps_base_directory, now_unix_timestamp, open_db, run_git};
use crate::wave_j_domains::get_app;
use regex::Regex;
use reqwest::blocking::Client;
use reqwest::header::{ACCEPT, AUTHORIZATION};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

const GITHUB_API_BASE: &str = "https://api.github.com";
const GITHUB_GIT_BASE: &str = "https://github.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCloneRepoFromUrlRequest {
    url: String,
    app_name: Option<String>,
    install_command: Option<String>,
    start_command: Option<String>,
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

fn github_api_base() -> String {
    if is_test_build() {
        format!("{}/github/api", test_server_base())
    } else {
        GITHUB_API_BASE.to_string()
    }
}

fn github_git_base() -> String {
    if is_test_build() {
        format!("{}/github/git", test_server_base())
    } else {
        GITHUB_GIT_BASE.to_string()
    }
}

fn github_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct GitHub client: {error}"))
}

fn github_access_token(app: &AppHandle) -> Option<String> {
    read_settings(app).ok().and_then(|settings| {
        settings
            .get("githubAccessToken")
            .and_then(|value| value.get("value"))
            .and_then(Value::as_str)
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
    })
}

fn enable_native_git(app: &AppHandle) -> bool {
    read_settings(app)
        .ok()
        .and_then(|settings| settings.get("enableNativeGit").and_then(Value::as_bool))
        .unwrap_or(true)
}

fn parse_github_repo_url(url: &str) -> Option<(String, String)> {
    let pattern = Regex::new(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$").ok()?;
    let captures = pattern.captures(url)?;
    let owner = captures.get(1)?.as_str().to_string();
    let repo = captures.get(2)?.as_str().to_string();
    Some((owner, repo))
}

fn clone_url(owner: &str, repo: &str, access_token: Option<&str>) -> String {
    match access_token {
        Some(_) if is_test_build() => format!("{}/{owner}/{repo}.git", github_git_base()),
        Some(token) => format!("https://{token}:x-oauth-basic@github.com/{owner}/{repo}.git"),
        None => format!("https://github.com/{owner}/{repo}.git"),
    }
}

fn current_branch(repo_path: &Path) -> String {
    run_git(repo_path, &["branch", "--show-current"])
        .ok()
        .map(|branch| branch.trim().to_string())
        .filter(|branch| !branch.is_empty())
        .unwrap_or_else(|| "main".to_string())
}

fn trimmed_or_null(value: Option<String>) -> Option<String> {
    value.and_then(|candidate| {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn error_result(message: impl Into<String>) -> Value {
    json!({ "error": message.into() })
}

#[tauri::command]
pub fn github_clone_repo_from_url(
    app: AppHandle,
    request: GitHubCloneRepoFromUrlRequest,
) -> Result<Value, String> {
    let (owner, repo_name) = match parse_github_repo_url(&request.url) {
        Some(match_result) => match_result,
        None => {
            return Ok(error_result(
                "Invalid GitHub URL. Expected format: https://github.com/owner/repo.git",
            ))
        }
    };

    let access_token = github_access_token(&app);
    if let Some(token) = access_token.as_deref() {
        let client = github_client()?;
        let response = client
            .get(format!("{}/repos/{owner}/{repo_name}", github_api_base()))
            .header(AUTHORIZATION, format!("Bearer {token}"))
            .header(ACCEPT, "application/vnd.github+json")
            .send();

        match response {
            Ok(response) if response.status().is_success() => {}
            Ok(_) => {
                return Ok(error_result(
                    "Repository not found or you do not have access to it.",
                ))
            }
            Err(error) => return Ok(error_result(format!("GitHub request failed: {error}"))),
        }
    }

    let final_app_name = request
        .app_name
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| repo_name.clone());

    let connection = open_db(&app)?;
    let existing_app: Option<i64> = connection
        .query_row(
            "SELECT id FROM apps WHERE name = ?1 LIMIT 1",
            params![final_app_name.as_str()],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to check app name conflict: {error}"))?;

    if existing_app.is_some() {
        return Ok(error_result(format!(
            "An app named \"{final_app_name}\" already exists."
        )));
    }

    let app_path = dyad_apps_base_directory()?.join(&final_app_name);
    if let Some(parent) = app_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("failed to create app directory parent: {error}"))?;
    }
    if !enable_native_git(&app) && !app_path.exists() {
        fs::create_dir_all(&app_path)
            .map_err(|error| format!("failed to create app directory: {error}"))?;
    }

    let clone_target = clone_url(&owner, &repo_name, access_token.as_deref());
    let clone_status = Command::new("git")
        .args(["clone", &clone_target])
        .arg(&app_path)
        .status()
        .map_err(|error| format!("failed to spawn git clone: {error}"))?;

    if !clone_status.success() {
        return Ok(error_result(
            "Failed to clone repository. Please check the URL and try again.",
        ));
    }

    let branch = current_branch(&app_path);
    let has_ai_rules = app_path.join("AI_RULES.md").exists();
    let created_at = now_unix_timestamp();
    let install_command = trimmed_or_null(request.install_command);
    let start_command = trimmed_or_null(request.start_command);

    connection
        .execute(
            "INSERT INTO apps (
                name,
                path,
                created_at,
                updated_at,
                github_org,
                github_repo,
                github_branch,
                install_command,
                start_command
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                final_app_name.as_str(),
                final_app_name.as_str(),
                created_at,
                created_at,
                owner.as_str(),
                repo_name.as_str(),
                branch.as_str(),
                install_command.as_deref(),
                start_command.as_deref(),
            ],
        )
        .map_err(|error| format!("failed to create cloned app record: {error}"))?;

    let app_id = connection.last_insert_rowid();
    let app_payload = get_app(app, app_id)?;
    Ok(json!({
        "app": app_payload,
        "hasAiRules": has_ai_rules,
    }))
}
