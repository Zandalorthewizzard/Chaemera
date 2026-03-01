use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path_by_id, run_git};
use rusqlite::{params, OptionalExtension};
use serde::Deserialize;
use std::path::Path;
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGitBranchRequest {
    app_id: i64,
    branch: String,
    from: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchRequest {
    app_id: i64,
    branch: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameGitBranchRequest {
    app_id: i64,
    old_branch: String,
    new_branch: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitChangesRequest {
    app_id: i64,
    message: String,
}

fn validate_branch_name(branch: &str) -> Result<(), String> {
    if branch.is_empty() || branch.len() > 255 {
        return Err("Branch name must be between 1 and 255 characters".to_string());
    }

    if !branch
        .chars()
        .all(|char| char.is_ascii_alphanumeric() || "/_.-".contains(char))
        || branch.contains("..")
    {
        return Err("Branch name contains invalid characters".to_string());
    }

    if branch.starts_with('-')
        || branch == "HEAD"
        || branch.ends_with('.')
        || branch.ends_with(".lock")
        || branch.starts_with('/')
        || branch.ends_with('/')
        || branch.contains("@{")
    {
        return Err("Invalid branch name".to_string());
    }

    Ok(())
}

fn git_current_branch(repo_path: &Path) -> Result<Option<String>, String> {
    let branch = run_git(repo_path, &["branch", "--show-current"])?;
    if branch.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(branch))
    }
}

fn git_list_local_branches(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["branch", "--format=%(refname:short)"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

fn git_list_remote_branches(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["branch", "-r", "--list"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.contains("HEAD"))
        .filter_map(|line| line.strip_prefix("origin/"))
        .map(str::to_string)
        .collect())
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

fn ensure_clean_workspace(repo_path: &Path, operation_description: &str) -> Result<(), String> {
    if git_status_dirty(repo_path)? {
        return Err(format!(
            "Workspace is not clean before {operation_description}. Please commit or stash your changes manually and try again."
        ));
    }

    Ok(())
}

fn app_github_state(
    app: &AppHandle,
    app_id: i64,
) -> Result<(Option<String>, Option<String>, Option<String>), String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT github_org, github_repo, github_branch FROM apps WHERE id = ?1",
            params![app_id],
            |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to query app github state: {error}"))?
        .ok_or_else(|| "App not found".to_string())
}

fn update_app_github_branch(app: &AppHandle, app_id: i64, branch: &str) -> Result<(), String> {
    let connection = open_db(app)?;
    connection
        .execute(
            "UPDATE apps SET github_branch = ?1 WHERE id = ?2",
            params![branch, app_id],
        )
        .map_err(|error| format!("failed to update app github branch: {error}"))?;
    Ok(())
}

fn git_add_all(repo_path: &Path) -> Result<(), String> {
    run_git(repo_path, &["add", "--all"]).map(|_| ())
}

fn git_author_email(app: &AppHandle) -> String {
    read_settings(app)
        .ok()
        .and_then(|settings| {
            settings
                .get("githubUser")
                .and_then(|value| value.get("email"))
                .and_then(|value| value.as_str())
                .map(str::to_string)
        })
        .unwrap_or_else(|| DEFAULT_GIT_AUTHOR_EMAIL.to_string())
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

fn git_commit(app: &AppHandle, repo_path: &Path, message: &str) -> Result<String, String> {
    run_git_with_author(app, repo_path, &["commit", "-m", message])?;
    run_git(repo_path, &["rev-parse", "HEAD"])
}

#[tauri::command]
pub fn github_create_branch(app: AppHandle, request: CreateGitBranchRequest) -> Result<(), String> {
    validate_branch_name(&request.branch)?;
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let from = request.from.as_deref().unwrap_or("HEAD");
    run_git(&repo_path, &["branch", &request.branch, from]).map(|_| ())
}

#[tauri::command]
pub fn github_delete_branch(app: AppHandle, request: GitBranchRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    run_git(&repo_path, &["branch", "-D", &request.branch]).map(|_| ())
}

#[tauri::command]
pub fn github_switch_branch(app: AppHandle, request: GitBranchRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;

    if git_merge_in_progress(&repo_path) {
        return Err(
            "Cannot switch branches: merge in progress. Please complete or abort the merge first."
                .to_string(),
        );
    }

    if git_rebase_in_progress(&repo_path) {
        return Err(
            "Cannot switch branches: rebase in progress. Please complete or abort the rebase first."
                .to_string(),
        );
    }

    ensure_clean_workspace(
        &repo_path,
        &format!("switching to branch '{}'", request.branch),
    )?;
    run_git(&repo_path, &["checkout", &request.branch]).map(|_| ())?;

    let (github_org, github_repo, _) = app_github_state(&app, request.app_id)?;
    if github_org.is_some() && github_repo.is_some() {
        update_app_github_branch(&app, request.app_id, &request.branch)?;
    }

    Ok(())
}

#[tauri::command]
pub fn github_rename_branch(app: AppHandle, request: RenameGitBranchRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let current_branch = git_current_branch(&repo_path)?;
    let is_renaming_current_branch = current_branch.as_deref() == Some(request.old_branch.as_str());

    run_git(
        &repo_path,
        &["branch", "-m", &request.old_branch, &request.new_branch],
    )
    .map(|_| ())?;

    if is_renaming_current_branch {
        let (github_org, github_repo, _) = app_github_state(&app, request.app_id)?;
        if github_org.is_some() && github_repo.is_some() {
            update_app_github_branch(&app, request.app_id, &request.new_branch)?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn github_merge_branch(app: AppHandle, request: GitBranchRequest) -> Result<(), String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let local_branches = git_list_local_branches(&repo_path)?;
    let remote_branches = git_list_remote_branches(&repo_path).unwrap_or_default();

    let merge_ref = if !local_branches
        .iter()
        .any(|branch| branch == &request.branch)
        && remote_branches
            .iter()
            .any(|branch| branch == &request.branch)
    {
        format!("origin/{}", request.branch)
    } else {
        request.branch.clone()
    };

    ensure_clean_workspace(&repo_path, &format!("merging branch '{}'", request.branch))?;

    match run_git_with_author(&app, &repo_path, &["merge", &merge_ref]) {
        Ok(_) => Ok(()),
        Err(error) if git_merge_in_progress(&repo_path) || git_rebase_in_progress(&repo_path) => {
            Err(
                "Merge conflict detected during merge. Please resolve conflicts before proceeding."
                    .to_string(),
            )
        }
        Err(error) => Err(error),
    }
}

#[tauri::command]
pub fn git_commit_changes(app: AppHandle, request: CommitChangesRequest) -> Result<String, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;

    if git_merge_in_progress(&repo_path) {
        return Err(
            "Cannot commit: merge in progress. Please complete or abort the merge first."
                .to_string(),
        );
    }

    if git_rebase_in_progress(&repo_path) {
        return Err(
            "Cannot commit: rebase in progress. Please complete or abort the rebase first."
                .to_string(),
        );
    }

    git_add_all(&repo_path)?;
    git_commit(&app, &repo_path, &request.message)
}
