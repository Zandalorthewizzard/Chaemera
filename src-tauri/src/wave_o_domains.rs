use crate::core_domains::read_settings;
use crate::sqlite_support::open_db;
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use tauri::AppHandle;

const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepoBranchesRequest {
    owner: String,
    repo: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubRepoAvailabilityRequest {
    org: String,
    repo: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubAppIdRequest {
    app_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRepoDto {
    name: String,
    full_name: String,
    private: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubBranchCommitDto {
    sha: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubBranchDto {
    name: String,
    commit: GitHubBranchCommitDto,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubCollaboratorDto {
    login: String,
    avatar_url: String,
    permissions: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoAvailabilityDto {
    available: bool,
    error: Option<String>,
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

fn send_github_get(client: &Client, token: &str, url: &str) -> Result<Response, String> {
    client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .map_err(|error| format!("GitHub request failed: {error}"))
}

fn github_api_error(response: Response) -> String {
    let status = response.status();
    match response.json::<Value>() {
        Ok(payload) => payload
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| format!("GitHub API error: {status}")),
        Err(_) => format!("GitHub API error: {status}"),
    }
}

fn normalize_repo_name(repo: &str) -> String {
    repo.split_whitespace().collect::<Vec<_>>().join("-")
}

fn github_owner_login(client: &Client, token: &str) -> Result<String, String> {
    let response = send_github_get(client, token, &format!("{}/user", github_api_base()))?;
    if !response.status().is_success() {
        return Err(github_api_error(response));
    }

    let payload = response
        .json::<Value>()
        .map_err(|error| format!("Failed to parse GitHub user payload: {error}"))?;
    payload
        .get("login")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "Failed to resolve authenticated GitHub user.".to_string())
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

#[tauri::command]
pub fn github_list_repos(app: AppHandle) -> Result<Vec<GitHubRepoDto>, String> {
    let token = github_token(&app)?;
    let client = github_client()?;
    let response = send_github_get(
        &client,
        &token,
        &format!("{}/user/repos?per_page=100&sort=updated", github_api_base()),
    )?;

    if !response.status().is_success() {
        return Err(github_api_error(response));
    }

    response
        .json::<Vec<GitHubRepoDto>>()
        .map_err(|error| format!("Failed to parse GitHub repositories: {error}"))
}

#[tauri::command]
pub fn github_get_repo_branches(
    app: AppHandle,
    request: GitHubRepoBranchesRequest,
) -> Result<Vec<GitHubBranchDto>, String> {
    let token = github_token(&app)?;
    let client = github_client()?;
    let url = format!(
        "{}/repos/{}/{}/branches",
        github_api_base(),
        request.owner,
        request.repo
    );
    let response = send_github_get(&client, &token, &url)?;

    if !response.status().is_success() {
        return Err(github_api_error(response));
    }

    response
        .json::<Vec<GitHubBranchDto>>()
        .map_err(|error| format!("Failed to parse GitHub branches: {error}"))
}

#[tauri::command]
pub fn github_is_repo_available(
    app: AppHandle,
    request: GitHubRepoAvailabilityRequest,
) -> Result<RepoAvailabilityDto, String> {
    let token = match github_token(&app) {
        Ok(token) => token,
        Err(error) => {
            return Ok(RepoAvailabilityDto {
                available: false,
                error: Some(error),
            });
        }
    };

    let client = github_client()?;
    let owner = if request.org.trim().is_empty() {
        match github_owner_login(&client, &token) {
            Ok(owner) => owner,
            Err(error) => {
                return Ok(RepoAvailabilityDto {
                    available: false,
                    error: Some(error),
                });
            }
        }
    } else {
        request.org.trim().to_string()
    };

    let normalized_repo = normalize_repo_name(&request.repo);
    let url = format!("{}/repos/{}/{}", github_api_base(), owner, normalized_repo);

    let response = match send_github_get(&client, &token, &url) {
        Ok(response) => response,
        Err(error) => {
            return Ok(RepoAvailabilityDto {
                available: false,
                error: Some(error),
            });
        }
    };

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(RepoAvailabilityDto {
            available: true,
            error: None,
        });
    }

    if response.status().is_success() {
        return Ok(RepoAvailabilityDto {
            available: false,
            error: Some("Repository already exists.".to_string()),
        });
    }

    Ok(RepoAvailabilityDto {
        available: false,
        error: Some(github_api_error(response)),
    })
}

#[tauri::command]
pub fn github_list_collaborators(
    app: AppHandle,
    request: GitHubAppIdRequest,
) -> Result<Vec<GitHubCollaboratorDto>, String> {
    let token = github_token(&app)?;
    let (org, repo) = linked_repo(&app, request.app_id)?;
    let client = github_client()?;
    let url = format!("{}/repos/{}/{}/collaborators", github_api_base(), org, repo);
    let response = send_github_get(&client, &token, &url)?;

    if !response.status().is_success() {
        return Err(github_api_error(response));
    }

    response
        .json::<Vec<GitHubCollaboratorDto>>()
        .map_err(|error| format!("Failed to parse GitHub collaborators: {error}"))
}

#[tauri::command]
pub fn github_disconnect(app: AppHandle, request: GitHubAppIdRequest) -> Result<(), String> {
    let connection = open_db(&app)?;
    let updated = connection
        .execute(
            "UPDATE apps
             SET github_repo = NULL,
                 github_org = NULL,
                 github_branch = NULL
             WHERE id = ?1",
            params![request.app_id],
        )
        .map_err(|error| format!("failed to disconnect GitHub repo: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}
