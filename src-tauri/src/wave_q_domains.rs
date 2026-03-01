use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path, run_git};
use reqwest::blocking::{Client, Response};
use reqwest::header::ACCEPT;
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::{json, Value};
use std::env;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";
const GITHUB_API_BASE: &str = "https://api.github.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubCreateRepoRequest {
    org: String,
    repo: String,
    app_id: i64,
    branch: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubConnectExistingRepoRequest {
    owner: String,
    repo: String,
    branch: String,
    app_id: i64,
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
        "https://github.com".to_string()
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

fn github_api_error(response: Response) -> String {
    let status = response.status();
    match response.json::<Value>() {
        Ok(payload) => {
            if let Some(message) = payload.get("message").and_then(Value::as_str) {
                if let Some(errors) = payload.get("errors").and_then(Value::as_array) {
                    let detail = errors
                        .iter()
                        .map(|error| {
                            if let Some(message) = error.get("message").and_then(Value::as_str) {
                                message.to_string()
                            } else if let Some(code) = error.get("code").and_then(Value::as_str) {
                                let field = error
                                    .get("field")
                                    .and_then(Value::as_str)
                                    .unwrap_or("field");
                                format!("{field}: {code}")
                            } else {
                                error.to_string()
                            }
                        })
                        .collect::<Vec<_>>()
                        .join(", ");
                    if !detail.is_empty() {
                        return format!("{message}: {detail}");
                    }
                }
                message.to_string()
            } else {
                format!("GitHub API error: {status}")
            }
        }
        Err(_) => format!("GitHub API error: {status}"),
    }
}

fn normalize_repo_name(repo: &str) -> String {
    repo.trim().replace(char::is_whitespace, "-")
}

fn github_owner_login(client: &Client, token: &str) -> Result<String, String> {
    let response = client
        .get(format!("{}/user", github_api_base()))
        .bearer_auth(token)
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .map_err(|error| format!("GitHub request failed: {error}"))?;

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

fn app_path_for_id(app: &AppHandle, app_id: i64) -> Result<PathBuf, String> {
    let connection = open_db(app)?;
    let raw_path = connection
        .query_row(
            "SELECT path FROM apps WHERE id = ?1",
            params![app_id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to query app path: {error}"))?
        .ok_or_else(|| "App not found".to_string())?;

    resolve_workspace_app_path(&raw_path)
}

fn update_app_github_repo(
    app: &AppHandle,
    app_id: i64,
    org: &str,
    repo: &str,
    branch: &str,
) -> Result<(), String> {
    let connection = open_db(app)?;
    let updated = connection
        .execute(
            "UPDATE apps
             SET github_org = ?1,
                 github_repo = ?2,
                 github_branch = ?3
             WHERE id = ?4",
            params![org, repo, branch, app_id],
        )
        .map_err(|error| format!("failed to update app GitHub linkage: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}

fn git_author_email(app: &AppHandle) -> String {
    read_settings(app)
        .ok()
        .and_then(|settings| {
            settings
                .get("githubUser")
                .and_then(|value| value.get("email"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| DEFAULT_GIT_AUTHOR_EMAIL.to_string())
}

fn git_add_or_set_remote(repo_path: &Path, remote_url: &str) -> Result<(), String> {
    match run_git(repo_path, &["remote", "add", "origin", remote_url]) {
        Ok(_) => Ok(()),
        Err(error) if error.contains("already exists") => {
            run_git(repo_path, &["remote", "set-url", "origin", remote_url]).map(|_| ())
        }
        Err(error) => Err(error),
    }
}

fn git_status_dirty(repo_path: &Path) -> Result<bool, String> {
    Ok(!run_git(repo_path, &["status", "--porcelain"])?
        .trim()
        .is_empty())
}

fn git_merge_in_progress(repo_path: &Path) -> bool {
    repo_path.join(".git").join("MERGE_HEAD").exists()
}

fn git_rebase_in_progress(repo_path: &Path) -> bool {
    let git_dir = repo_path.join(".git");
    git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists()
}

fn ensure_clean_workspace(repo_path: &Path, operation_description: &str) -> Result<(), String> {
    if git_status_dirty(repo_path)? {
        return Err(format!(
            "Workspace is not clean before {operation_description}. Please commit or stash your changes manually and try again."
        ));
    }
    Ok(())
}

fn auto_commit_local_changes(app: &AppHandle, repo_path: &Path) -> Result<(), String> {
    if !git_status_dirty(repo_path)? {
        return Ok(());
    }

    if git_merge_in_progress(repo_path) {
        return Err(
            "Cannot auto-commit changes because a merge is in progress. Please complete or abort the merge and try again."
                .to_string(),
        );
    }

    if git_rebase_in_progress(repo_path) {
        return Err(
            "Cannot auto-commit changes because a rebase is in progress. Please complete or abort the rebase and try again."
                .to_string(),
        );
    }

    run_git(repo_path, &["add", "--all"])?;
    run_git(
        repo_path,
        &[
            "-c",
            &format!("user.name={DEFAULT_GIT_AUTHOR_NAME}"),
            "-c",
            &format!("user.email={}", git_author_email(app)),
            "commit",
            "-m",
            "chore: auto-commit local changes before connecting to GitHub",
        ],
    )?;
    Ok(())
}

fn git_list_branches(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["branch", "--format=%(refname:short)"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

fn git_list_remote_branches(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["branch", "-r", "--format=%(refname:short)"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .filter(|line| !line.ends_with("/HEAD"))
        .map(|line| line.strip_prefix("origin/").unwrap_or(line).to_string())
        .collect())
}

fn git_checkout(repo_path: &Path, reference: &str) -> Result<(), String> {
    run_git(repo_path, &["checkout", reference]).map(|_| ())
}

fn git_create_branch(repo_path: &Path, branch: &str, from: &str) -> Result<(), String> {
    run_git(repo_path, &["branch", branch, from]).map(|_| ())
}

fn prepare_local_branch(
    app: &AppHandle,
    app_id: i64,
    branch: Option<&str>,
    remote_url: &str,
) -> Result<(), String> {
    let repo_path = app_path_for_id(app, app_id)?;
    let target_branch = branch.unwrap_or("main");

    git_add_or_set_remote(&repo_path, remote_url)?;
    auto_commit_local_changes(app, &repo_path)?;
    ensure_clean_workspace(&repo_path, &format!("preparing branch '{target_branch}'"))?;

    let remote_branches = match run_git(&repo_path, &["fetch", "origin"]) {
        Ok(_) => git_list_remote_branches(&repo_path).unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    let local_branches = git_list_branches(&repo_path)?;

    if !local_branches.iter().any(|local| local == target_branch) {
        if remote_branches.iter().any(|remote| remote == target_branch) {
            run_git(
                &repo_path,
                &[
                    "checkout",
                    "-b",
                    target_branch,
                    &format!("origin/{target_branch}"),
                ],
            )?;
        } else {
            git_create_branch(&repo_path, target_branch, "HEAD")?;
            git_checkout(&repo_path, target_branch)?;
        }
    } else {
        git_checkout(&repo_path, target_branch)?;
    }

    Ok(())
}

fn github_remote_url(owner: &str, repo: &str, access_token: &str) -> String {
    if is_test_build() {
        format!("{}/{owner}/{repo}.git", github_git_base())
    } else {
        format!(
            "https://{}:x-oauth-basic@github.com/{owner}/{repo}.git",
            access_token
        )
    }
}

#[tauri::command]
pub fn github_create_repo(app: AppHandle, request: GitHubCreateRepoRequest) -> Result<(), String> {
    let access_token = github_token(&app)?;
    let client = github_client()?;
    let normalized_repo = normalize_repo_name(&request.repo);

    let owner = if request.org.trim().is_empty() {
        github_owner_login(&client, &access_token)?
    } else {
        request.org.trim().to_string()
    };

    let create_url = if request.org.trim().is_empty() {
        format!("{}/user/repos", github_api_base())
    } else {
        format!("{}/orgs/{}/repos", github_api_base(), owner)
    };

    let response = client
        .post(create_url)
        .bearer_auth(&access_token)
        .header(ACCEPT, "application/vnd.github+json")
        .json(&json!({
            "name": normalized_repo,
            "private": true,
        }))
        .send()
        .map_err(|error| format!("Failed to create repository: {error}"))?;

    if !response.status().is_success() {
        return Err(github_api_error(response));
    }

    let branch = request.branch.as_deref().unwrap_or("main");
    let remote_url = github_remote_url(&owner, &normalized_repo, &access_token);
    prepare_local_branch(&app, request.app_id, Some(branch), &remote_url)?;
    update_app_github_repo(&app, request.app_id, &owner, &normalized_repo, branch)
}

#[tauri::command]
pub fn github_connect_existing_repo(
    app: AppHandle,
    request: GitHubConnectExistingRepoRequest,
) -> Result<(), String> {
    let access_token = github_token(&app)?;
    let client = github_client()?;

    let response = client
        .get(format!(
            "{}/repos/{}/{}",
            github_api_base(),
            request.owner,
            request.repo
        ))
        .bearer_auth(&access_token)
        .header(ACCEPT, "application/vnd.github+json")
        .send()
        .map_err(|error| format!("Repository not found or access denied: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Repository not found or access denied: {}",
            github_api_error(response)
        ));
    }

    let remote_url = github_remote_url(&request.owner, &request.repo, &access_token);
    prepare_local_branch(&app, request.app_id, Some(&request.branch), &remote_url)?;
    update_app_github_repo(
        &app,
        request.app_id,
        &request.owner,
        &request.repo,
        &request.branch,
    )
}
