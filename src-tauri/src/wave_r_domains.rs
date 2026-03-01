use crate::sqlite_support::{normalize_path, resolve_workspace_app_path_by_id, run_git};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitBranchAppRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitRemoteBranchesRequest {
    app_id: i64,
    remote: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalBranchesResultDto {
    branches: Vec<String>,
    current: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStateDto {
    merge_in_progress: bool,
    rebase_in_progress: bool,
}

#[derive(Debug, Serialize)]
pub struct UncommittedFileDto {
    path: String,
    status: String,
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

fn git_list_remote_branches(repo_path: &Path, remote: &str) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["branch", "-r", "--list"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter_map(|line| line.strip_prefix(&format!("{remote}/")))
        .filter(|line| !line.is_empty() && !line.contains("HEAD"))
        .map(str::to_string)
        .collect())
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

fn git_get_conflicts(repo_path: &Path) -> Result<Vec<String>, String> {
    let output = run_git(repo_path, &["diff", "--name-only", "--diff-filter=U"])?;
    Ok(output
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(str::to_string)
        .collect())
}

fn collect_uncommitted_files(repo_path: &Path) -> Result<Vec<UncommittedFileDto>, String> {
    let output = run_git(repo_path, &["status", "--porcelain"])?;
    Ok(output
        .lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            if line.len() < 4 {
                return None;
            }

            let status_code = &line[0..2];
            let mut file_path = line[3..].trim().to_string();

            if status_code.starts_with('R') {
                if let Some((_, renamed_to)) = file_path.split_once(" -> ") {
                    file_path = renamed_to.to_string();
                }

                return Some(UncommittedFileDto {
                    path: normalize_path(&file_path),
                    status: "renamed".to_string(),
                });
            }

            let status = if status_code.contains('D') {
                "deleted"
            } else if status_code == "??" || status_code.contains('A') {
                "added"
            } else {
                "modified"
            };

            Some(UncommittedFileDto {
                path: normalize_path(&file_path),
                status: status.to_string(),
            })
        })
        .collect())
}

#[tauri::command]
pub fn github_list_local_branches(
    app: AppHandle,
    request: GitBranchAppRequest,
) -> Result<LocalBranchesResultDto, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    Ok(LocalBranchesResultDto {
        branches: git_list_local_branches(&repo_path)?,
        current: git_current_branch(&repo_path)?,
    })
}

#[tauri::command]
pub fn github_list_remote_branches(
    app: AppHandle,
    request: GitRemoteBranchesRequest,
) -> Result<Vec<String>, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    let remote = request.remote.unwrap_or_else(|| "origin".to_string());
    git_list_remote_branches(&repo_path, &remote)
}

#[tauri::command]
pub fn github_get_conflicts(
    app: AppHandle,
    request: GitBranchAppRequest,
) -> Result<Vec<String>, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    git_get_conflicts(&repo_path)
}

#[tauri::command]
pub fn github_get_git_state(
    app: AppHandle,
    request: GitBranchAppRequest,
) -> Result<GitStateDto, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    Ok(GitStateDto {
        merge_in_progress: git_merge_in_progress(&repo_path),
        rebase_in_progress: git_rebase_in_progress(&repo_path),
    })
}

#[tauri::command]
pub fn git_get_uncommitted_files(
    app: AppHandle,
    request: GitBranchAppRequest,
) -> Result<Vec<UncommittedFileDto>, String> {
    let repo_path = resolve_workspace_app_path_by_id(&app, request.app_id)?;
    collect_uncommitted_files(&repo_path)
}
