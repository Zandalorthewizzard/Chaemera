use crate::core_domains::read_settings;
use crate::sqlite_support::{
    open_db, resolve_workspace_app_path, resolve_workspace_app_path_by_id, run_git,
};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use serde_json::Value;
use std::env;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchAppRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubPushRequest {
    app_id: i64,
    force: Option<bool>,
    force_with_lease: Option<bool>,
}

struct LinkedRepo {
    path: PathBuf,
    org: String,
    repo: String,
    branch: String,
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

fn github_git_base() -> String {
    if is_test_build() {
        format!("{}/github/git", test_server_base())
    } else {
        "https://github.com".to_string()
    }
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

fn linked_repo_for_app_id(app: &AppHandle, app_id: i64) -> Result<LinkedRepo, String> {
    let connection = open_db(app)?;
    let row = connection
        .query_row(
            "SELECT path, github_org, github_repo, github_branch
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to query linked GitHub repo: {error}"))?
        .ok_or_else(|| "App not found".to_string())?;

    let (raw_path, org, repo, branch) = row;
    let org = org.ok_or_else(|| "App is not linked to a GitHub repo.".to_string())?;
    let repo = repo.ok_or_else(|| "App is not linked to a GitHub repo.".to_string())?;

    Ok(LinkedRepo {
        path: resolve_workspace_app_path(&raw_path)?,
        org,
        repo,
        branch: branch
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "main".to_string()),
    })
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

fn git_current_branch(repo_path: &Path) -> Result<Option<String>, String> {
    let branch = run_git(repo_path, &["branch", "--show-current"])?;
    if branch.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(branch))
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
    git_dir.join("REBASE_HEAD").exists()
        || git_dir.join("rebase-merge").exists()
        || git_dir.join("rebase-apply").exists()
}

fn has_git_conflict_state(repo_path: &Path) -> bool {
    git_merge_in_progress(repo_path) || git_rebase_in_progress(repo_path)
}

fn ensure_clean_workspace(repo_path: &Path, operation_description: &str) -> Result<(), String> {
    if git_status_dirty(repo_path)? {
        return Err(format!(
            "Workspace is not clean before {operation_description}. Please commit or stash your changes manually and try again."
        ));
    }

    Ok(())
}

fn run_git_with_author(app: &AppHandle, repo_path: &Path, args: &[&str]) -> Result<String, String> {
    let author_email = git_author_email(app);
    let mut prefixed = vec![
        "-c".to_string(),
        format!("user.name={DEFAULT_GIT_AUTHOR_NAME}"),
        "-c".to_string(),
        format!("user.email={author_email}"),
    ];
    prefixed.extend(args.iter().map(|arg| arg.to_string()));
    let refs = prefixed.iter().map(String::as_str).collect::<Vec<_>>();
    run_git(repo_path, &refs)
}

fn git_fetch(repo_path: &Path) -> Result<(), String> {
    run_git(repo_path, &["fetch", "origin"]).map(|_| ())
}

fn git_pull(app: &AppHandle, repo_path: &Path, branch: &str) -> Result<(), String> {
    match run_git_with_author(
        app,
        repo_path,
        &[
            "-c",
            "credential.helper=",
            "pull",
            "--rebase=false",
            "origin",
            branch,
        ],
    ) {
        Ok(_) => {
            if has_git_conflict_state(repo_path) {
                Err(
                    "Merge conflict detected during pull. Please resolve conflicts before proceeding."
                        .to_string(),
                )
            } else {
                Ok(())
            }
        }
        Err(error) => {
            if has_git_conflict_state(repo_path) {
                Err(
                    "Merge conflict detected during pull. Please resolve conflicts before proceeding."
                        .to_string(),
                )
            } else {
                Err(error)
            }
        }
    }
}

fn git_push(
    repo_path: &Path,
    branch: &str,
    force: bool,
    force_with_lease: bool,
) -> Result<(), String> {
    let mut args = vec![
        "push".to_string(),
        "origin".to_string(),
        format!("{branch}:{branch}"),
    ];

    if force_with_lease {
        args.push("--force-with-lease".to_string());
    } else if force {
        args.push("--force".to_string());
    }

    let refs = args.iter().map(String::as_str).collect::<Vec<_>>();
    run_git(repo_path, &refs)
        .map(|_| ())
        .map_err(|error| format!("Git push failed: {error}"))
}

fn git_rebase(app: &AppHandle, repo_path: &Path, branch: &str) -> Result<(), String> {
    run_git_with_author(app, repo_path, &["rebase", &format!("origin/{branch}")]).map(|_| ())
}

fn git_rebase_abort(repo_path: &Path) -> Result<(), String> {
    run_git(repo_path, &["rebase", "--abort"]).map(|_| ())
}

fn git_rebase_continue(app: &AppHandle, repo_path: &Path) -> Result<(), String> {
    run_git_with_author(app, repo_path, &["rebase", "--continue"]).map(|_| ())
}

fn git_merge_abort(repo_path: &Path) -> Result<(), String> {
    run_git(repo_path, &["merge", "--abort"]).map(|_| ())
}

fn is_missing_remote_branch_error(error: &str) -> bool {
    error.contains("couldn't find remote ref")
        || error.contains("remote ref")
        || error.contains("remote branch")
        || error.contains("Cannot read properties of null")
}

fn prepare_authenticated_remote(app: &AppHandle, app_id: i64) -> Result<LinkedRepo, String> {
    let access_token = github_token(app)?;
    let linked_repo = linked_repo_for_app_id(app, app_id)?;
    let remote_url = github_remote_url(&linked_repo.org, &linked_repo.repo, &access_token);
    git_add_or_set_remote(&linked_repo.path, &remote_url)?;
    Ok(linked_repo)
}

#[tauri::command]
pub fn github_fetch(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let linked_repo = prepare_authenticated_remote(&app, request.app_id)?;
    git_fetch(&linked_repo.path)
}

#[tauri::command]
pub fn github_pull(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let linked_repo = prepare_authenticated_remote(&app, request.app_id)?;
    let branch = git_current_branch(&linked_repo.path)?.unwrap_or_else(|| "main".to_string());

    match git_pull(&app, &linked_repo.path, &branch) {
        Ok(_) => Ok(()),
        Err(error) if is_missing_remote_branch_error(&error) => Ok(()),
        Err(error) => Err(error),
    }
}

#[tauri::command]
pub fn github_push(app: AppHandle, request: GitHubPushRequest) -> Result<(), String> {
    let linked_repo = prepare_authenticated_remote(&app, request.app_id)?;
    let force = request.force.unwrap_or(false);
    let force_with_lease = request.force_with_lease.unwrap_or(false);

    if !force && !force_with_lease {
        match git_pull(&app, &linked_repo.path, &linked_repo.branch) {
            Ok(_) => {}
            Err(error) if is_missing_remote_branch_error(&error) => {}
            Err(error) => return Err(error),
        }
    }

    git_push(
        &linked_repo.path,
        &linked_repo.branch,
        force,
        force_with_lease,
    )
}

#[tauri::command]
pub fn github_rebase(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let linked_repo = prepare_authenticated_remote(&app, request.app_id)?;
    git_fetch(&linked_repo.path)?;
    ensure_clean_workspace(&linked_repo.path, "rebase")?;
    git_rebase(&app, &linked_repo.path, &linked_repo.branch)
}

#[tauri::command]
pub fn github_rebase_abort(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    git_rebase_abort(&repo_path)
}

#[tauri::command]
pub fn github_rebase_continue(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    git_rebase_continue(&app, &repo_path)
}

#[tauri::command]
pub fn github_merge_abort(app: AppHandle, request: GitBranchAppRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    git_merge_abort(&repo_path)
}
