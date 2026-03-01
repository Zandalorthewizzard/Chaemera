use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path, run_git};
use crate::wave_ag_domains::{
    parse_chat_summary, parse_delete_tags, parse_dependency_tags, parse_rename_tags,
    parse_search_replace_tags, parse_sql_queries, parse_write_tags,
};
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use regex::{NoExpand, Regex};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveProposalRequest {
    chat_id: i64,
    message_id: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveProposalResponse {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    commit_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    extra_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    extra_files_error: Option<String>,
}

#[derive(Debug)]
struct ProposalContext {
    raw_app_path: String,
    supabase_project_id: Option<String>,
    message_content: String,
}

#[derive(Debug)]
struct OutputMessage {
    message: String,
    detail: String,
}

#[derive(Debug)]
struct SearchReplaceBlock {
    search_content: String,
    replace_content: String,
}

fn query_proposal_context(
    app: &AppHandle,
    chat_id: i64,
    message_id: i64,
) -> Result<ProposalContext, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT a.path, a.supabase_project_id, m.content
             FROM messages m
             JOIN chats c ON c.id = m.chat_id
             JOIN apps a ON a.id = c.app_id
             WHERE m.id = ?1
               AND m.chat_id = ?2
               AND m.role = 'assistant'",
            params![message_id, chat_id],
            |row| {
                Ok(ProposalContext {
                    raw_app_path: row.get(0)?,
                    supabase_project_id: row.get(1)?,
                    message_content: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query assistant proposal message: {error}"))?
        .ok_or_else(|| {
            format!("Assistant message not found for chatId: {chat_id}, messageId: {message_id}")
        })
}

fn safe_workspace_join(app_path: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let normalized = relative_path.replace('\\', "/");
    if normalized.is_empty()
        || normalized.starts_with("~/")
        || normalized.starts_with("\\\\")
        || normalized.starts_with("//")
    {
        return Err(format!("Unsafe path: {relative_path}"));
    }

    let path = Path::new(&normalized);
    if path.is_absolute()
        || path.components().any(|component| {
            matches!(
                component,
                Component::ParentDir | Component::RootDir | Component::Prefix(_)
            )
        })
    {
        return Err(format!("Unsafe path: {relative_path}"));
    }

    Ok(app_path.join(path))
}

fn is_server_function(path: &str) -> bool {
    path.starts_with("supabase/functions/") && !path.starts_with("supabase/functions/_shared/")
}

fn is_shared_server_module(path: &str) -> bool {
    path.starts_with("supabase/functions/_shared/")
}

fn has_unsupported_supabase_side_effects(message_content: &str) -> bool {
    if !parse_sql_queries(message_content).is_empty() {
        return true;
    }

    if parse_write_tags(message_content)
        .iter()
        .chain(parse_search_replace_tags(message_content).iter())
        .any(|tag| is_server_function(&tag.path) || is_shared_server_module(&tag.path))
    {
        return true;
    }

    if parse_rename_tags(message_content).iter().any(|tag| {
        is_server_function(&tag.from)
            || is_server_function(&tag.to)
            || is_shared_server_module(&tag.from)
            || is_shared_server_module(&tag.to)
    }) {
        return true;
    }

    parse_delete_tags(message_content)
        .iter()
        .any(|path| is_server_function(path) || is_shared_server_module(path))
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

fn git_stage_path(repo_path: &Path, relative_path: &str) -> Result<(), String> {
    run_git(repo_path, &["add", "--all", "--", relative_path]).map(|_| ())
}

fn git_stage_all(repo_path: &Path) -> Result<(), String> {
    run_git(repo_path, &["add", "--all"]).map(|_| ())
}

fn git_commit(
    app: &AppHandle,
    repo_path: &Path,
    message: &str,
    amend: bool,
) -> Result<String, String> {
    if amend {
        run_git_with_author(app, repo_path, &["commit", "--amend", "-m", message])?;
    } else {
        run_git_with_author(app, repo_path, &["commit", "-m", message])?;
    }

    run_git(repo_path, &["rev-parse", "HEAD"])
}

fn git_uncommitted_files(repo_path: &Path) -> Result<Vec<String>, String> {
    let status = run_git(repo_path, &["status", "--porcelain"])?;
    let mut files = Vec::new();

    for line in status.lines() {
        if line.len() < 4 {
            continue;
        }

        let mut path = line[3..].trim();
        if let Some((_, renamed_to)) = path.rsplit_once(" -> ") {
            path = renamed_to.trim();
        }

        let normalized = path.trim_matches('"').replace('\\', "/");
        if !normalized.is_empty() && !files.iter().any(|existing| existing == &normalized) {
            files.push(normalized);
        }
    }

    Ok(files)
}

fn install_dependencies(
    app: &AppHandle,
    app_path: &Path,
    packages: &[String],
) -> Result<String, String> {
    refresh_process_path(app);
    let package_str = packages.join(" ");
    let command =
        format!("(pnpm add {package_str}) || (npm install --legacy-peer-deps {package_str})");

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &command])
            .current_dir(app_path)
            .env("PATH", effective_path_value(app))
            .output()
    } else {
        Command::new("sh")
            .args(["-lc", &command])
            .current_dir(app_path)
            .env("PATH", effective_path_value(app))
            .output()
    }
    .map_err(|error| format!("failed to install dependencies: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(if detail.is_empty() {
            format!(
                "dependency installation failed with status {}",
                output.status
            )
        } else {
            detail
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok(if stderr.trim().is_empty() {
        stdout
    } else if stdout.trim().is_empty() {
        stderr
    } else {
        format!("{stdout}\n{stderr}")
    })
}

fn replace_dependency_install_results(
    message_content: &str,
    packages: &[String],
    install_results: &str,
) -> Result<String, String> {
    if packages.is_empty() {
        return Ok(message_content.to_string());
    }

    let package_str = packages.join(" ");
    let escaped_package_str = regex::escape(&package_str);
    let tag_regex = Regex::new(&format!(
        r#"(?s)<dyad-add-dependency packages="{escaped_package_str}">[^<]*</dyad-add-dependency>"#
    ))
    .map_err(|error| format!("failed to compile dependency replacement regex: {error}"))?;

    let replacement = format!(
        r#"<dyad-add-dependency packages="{package_str}">{install_results}</dyad-add-dependency>"#
    );
    Ok(tag_regex
        .replace_all(message_content, NoExpand(&replacement))
        .to_string())
}

fn trim_single_trailing_newline(value: String) -> String {
    if let Some(stripped) = value.strip_suffix("\r\n") {
        stripped.to_string()
    } else if let Some(stripped) = value.strip_suffix('\n') {
        stripped.to_string()
    } else {
        value
    }
}

fn parse_search_replace_blocks(content: &str) -> Vec<SearchReplaceBlock> {
    enum State {
        Idle,
        Search,
        Replace,
    }

    let mut blocks = Vec::new();
    let mut state = State::Idle;
    let mut search_content = String::new();
    let mut replace_content = String::new();

    for segment in content.split_inclusive('\n') {
        let line = segment.trim_end_matches(['\r', '\n']);
        match state {
            State::Idle if line.starts_with("<<<<<<< SEARCH") => {
                search_content.clear();
                replace_content.clear();
                state = State::Search;
            }
            State::Search if line == "=======" => {
                state = State::Replace;
            }
            State::Replace if line.starts_with(">>>>>>> REPLACE") => {
                blocks.push(SearchReplaceBlock {
                    search_content: trim_single_trailing_newline(search_content.clone()),
                    replace_content: trim_single_trailing_newline(replace_content.clone()),
                });
                search_content.clear();
                replace_content.clear();
                state = State::Idle;
            }
            State::Search => search_content.push_str(segment),
            State::Replace => replace_content.push_str(segment),
            State::Idle => {}
        }
    }

    blocks
}

fn unescape_markers(value: &str) -> String {
    value
        .split_inclusive('\n')
        .map(|segment| {
            if segment.starts_with("\\<<<<<<<")
                || segment.starts_with("\\=======")
                || segment.starts_with("\\>>>>>>>")
            {
                segment[1..].to_string()
            } else {
                segment.to_string()
            }
        })
        .collect()
}

fn find_all_matches(haystack: &str, needle: &str) -> Vec<usize> {
    let mut matches = Vec::new();
    let mut from_index = 0;

    while from_index <= haystack.len() {
        let Some(index) = haystack[from_index..].find(needle) else {
            break;
        };
        let absolute_index = from_index + index;
        matches.push(absolute_index);
        from_index = absolute_index + 1;
    }

    matches
}

fn apply_search_replace(original_content: &str, diff_content: &str) -> Result<String, String> {
    let blocks = parse_search_replace_blocks(diff_content);
    if blocks.is_empty() {
        return Err(
            "Invalid diff format - missing required sections. Expected <<<<<<< SEARCH / ======= / >>>>>>> REPLACE"
                .to_string(),
        );
    }

    let mut updated = original_content.to_string();
    for (index, block) in blocks.iter().enumerate() {
        let search_content = unescape_markers(&block.search_content);
        let replace_content = unescape_markers(&block.replace_content);
        if search_content.trim().is_empty() {
            return Err("Invalid diff format - empty SEARCH block is not allowed".to_string());
        }

        let matches = find_all_matches(&updated, &search_content);
        if matches.is_empty() {
            return Err(format!(
                "SEARCH block did not match any content (block {})",
                index + 1
            ));
        }
        if matches.len() > 1 {
            return Err(format!(
                "SEARCH block matched multiple locations (block {})",
                index + 1
            ));
        }

        let match_index = matches[0];
        updated = format!(
            "{}{}{}",
            &updated[..match_index],
            replace_content,
            &updated[match_index + search_content.len()..]
        );
    }

    Ok(updated)
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn append_output_messages(
    message_content: &str,
    warnings: &[OutputMessage],
    errors: &[OutputMessage],
) -> String {
    let mut blocks = Vec::new();
    blocks.extend(warnings.iter().map(|warning| {
        format!(
            r#"<dyad-output type="warning" message="{}">{}</dyad-output>"#,
            escape_xml(&warning.message),
            escape_xml(&warning.detail)
        )
    }));
    blocks.extend(errors.iter().map(|error| {
        format!(
            r#"<dyad-output type="error" message="{}">{}</dyad-output>"#,
            escape_xml(&error.message),
            escape_xml(&error.detail)
        )
    }));

    if blocks.is_empty() {
        message_content.to_string()
    } else {
        format!("{message_content}\n\n{}", blocks.join("\n"))
    }
}

#[tauri::command]
pub fn approve_proposal(
    app: AppHandle,
    request: ApproveProposalRequest,
) -> Result<ApproveProposalResponse, String> {
    let selected_chat_mode = read_settings(&app)?
        .get("selectedChatMode")
        .and_then(Value::as_str)
        .map(str::to_string);
    if selected_chat_mode.as_deref() == Some("ask") {
        return Err(
            "Ask mode is not supported for proposal approval. Please switch to build mode."
                .to_string(),
        );
    }

    let context = query_proposal_context(&app, request.chat_id, request.message_id)?;
    if context.supabase_project_id.is_some()
        && has_unsupported_supabase_side_effects(&context.message_content)
    {
        return Err(
            "Approving proposals with Supabase SQL or edge-function deployment side-effects is not yet supported in the Tauri path."
                .to_string(),
        );
    }

    let app_path = resolve_workspace_app_path(&context.raw_app_path)?;
    let original_message_content = context.message_content.clone();
    let mut persisted_message_content = original_message_content.clone();
    let mut warnings = Vec::new();
    let mut errors = Vec::new();

    let result = (|| -> Result<ApproveProposalResponse, String> {
        let chat_summary = parse_chat_summary(&context.message_content);
        let write_tags = parse_write_tags(&context.message_content);
        let rename_tags = parse_rename_tags(&context.message_content);
        let delete_tags = parse_delete_tags(&context.message_content);
        let search_replace_tags = parse_search_replace_tags(&context.message_content);
        let dependency_packages = parse_dependency_tags(&context.message_content);
        let sql_queries = if context.supabase_project_id.is_some() {
            parse_sql_queries(&context.message_content)
        } else {
            Vec::new()
        };

        let mut written_files = Vec::new();
        let mut renamed_files = Vec::new();
        let mut deleted_files = Vec::new();
        let mut stage_paths = BTreeSet::new();

        for file_path in &delete_tags {
            let full_file_path = safe_workspace_join(&app_path, file_path)?;
            if !full_file_path.exists() {
                continue;
            }

            let metadata = fs::metadata(&full_file_path)
                .map_err(|error| format!("failed to inspect delete target {file_path}: {error}"))?;
            if metadata.is_dir() {
                fs::remove_dir_all(&full_file_path)
                    .map_err(|error| format!("failed to delete directory {file_path}: {error}"))?;
            } else {
                fs::remove_file(&full_file_path)
                    .map_err(|error| format!("failed to delete file {file_path}: {error}"))?;
            }

            deleted_files.push(file_path.clone());
            stage_paths.insert(file_path.clone());
        }

        for tag in &rename_tags {
            let from_path = safe_workspace_join(&app_path, &tag.from)?;
            let to_path = safe_workspace_join(&app_path, &tag.to)?;
            if !from_path.exists() {
                continue;
            }

            if let Some(parent) = to_path.parent() {
                fs::create_dir_all(parent).map_err(|error| {
                    format!(
                        "failed to create rename destination parent for {}: {error}",
                        tag.to
                    )
                })?;
            }

            fs::rename(&from_path, &to_path)
                .map_err(|error| format!("failed to rename {} to {}: {error}", tag.from, tag.to))?;
            renamed_files.push(tag.to.clone());
            stage_paths.insert(tag.from.clone());
            stage_paths.insert(tag.to.clone());
        }

        for tag in &search_replace_tags {
            let full_file_path = safe_workspace_join(&app_path, &tag.path)?;
            if !full_file_path.exists() {
                warnings.push(OutputMessage {
                    message: format!("Search-replace target file does not exist: {}", tag.path),
                    detail: tag.path.clone(),
                });
                continue;
            }

            let original = fs::read_to_string(&full_file_path)
                .map_err(|error| format!("failed to read {}: {error}", tag.path))?;
            let replaced = match apply_search_replace(&original, &tag.content) {
                Ok(value) => value,
                Err(error) => {
                    warnings.push(OutputMessage {
                        message: format!("Unable to apply search-replace to {}", tag.path),
                        detail: error,
                    });
                    continue;
                }
            };

            fs::write(&full_file_path, replaced)
                .map_err(|error| format!("failed to write {}: {error}", tag.path))?;
            written_files.push(tag.path.clone());
            stage_paths.insert(tag.path.clone());
        }

        for tag in &write_tags {
            let full_file_path = safe_workspace_join(&app_path, &tag.path)?;
            if let Some(parent) = full_file_path.parent() {
                fs::create_dir_all(parent).map_err(|error| {
                    format!("failed to create parent for {}: {error}", tag.path)
                })?;
            }

            fs::write(&full_file_path, &tag.content)
                .map_err(|error| format!("failed to write {}: {error}", tag.path))?;
            written_files.push(tag.path.clone());
            stage_paths.insert(tag.path.clone());
        }

        if !dependency_packages.is_empty() {
            match install_dependencies(&app, &app_path, &dependency_packages) {
                Ok(install_results) => {
                    persisted_message_content = replace_dependency_install_results(
                        &persisted_message_content,
                        &dependency_packages,
                        &install_results,
                    )?;
                    for lock_file in ["package.json", "pnpm-lock.yaml", "package-lock.json"] {
                        if app_path.join(lock_file).exists() {
                            written_files.push(lock_file.to_string());
                            stage_paths.insert(lock_file.to_string());
                        }
                    }
                }
                Err(error) => errors.push(OutputMessage {
                    message: format!(
                        "Failed to add dependencies: {}",
                        dependency_packages.join(", ")
                    ),
                    detail: error,
                }),
            }
        }

        let mut commit_hash = None;
        let mut extra_files = None;
        let mut extra_files_error = None;

        if !stage_paths.is_empty() {
            for path in &stage_paths {
                git_stage_path(&app_path, path)?;
            }

            if !git_uncommitted_files(&app_path)?.is_empty() {
                let mut changes = Vec::new();
                if !written_files.is_empty() {
                    changes.push(format!("wrote {} file(s)", written_files.len()));
                }
                if !renamed_files.is_empty() {
                    changes.push(format!("renamed {} file(s)", renamed_files.len()));
                }
                if !deleted_files.is_empty() {
                    changes.push(format!("deleted {} file(s)", deleted_files.len()));
                }
                if !dependency_packages.is_empty() {
                    changes.push(format!(
                        "added {} package(s)",
                        dependency_packages.join(", ")
                    ));
                }
                if !sql_queries.is_empty() {
                    changes.push(format!("executed {} SQL queries", sql_queries.len()));
                }

                let commit_message = if let Some(summary) = chat_summary.as_deref() {
                    format!("[dyad] {summary} - {}", changes.join(", "))
                } else {
                    format!("[dyad] {}", changes.join(", "))
                };

                let mut committed_hash = git_commit(&app, &app_path, &commit_message, false)?;
                let uncommitted_files = git_uncommitted_files(&app_path)?;
                if !uncommitted_files.is_empty() {
                    git_stage_all(&app_path)?;
                    match git_commit(
                        &app,
                        &app_path,
                        &format!("{commit_message} + extra files edited outside of Dyad"),
                        true,
                    ) {
                        Ok(amended_hash) => committed_hash = amended_hash,
                        Err(error) => extra_files_error = Some(error),
                    }
                    extra_files = Some(uncommitted_files);
                }

                let connection = open_db(&app)?;
                connection
                    .execute(
                        "UPDATE messages SET commit_hash = ?1 WHERE id = ?2",
                        params![committed_hash, request.message_id],
                    )
                    .map_err(|error| format!("failed to persist proposal commit hash: {error}"))?;
                commit_hash = Some(committed_hash);
            }
        }

        let connection = open_db(&app)?;
        connection
            .execute(
                "UPDATE messages SET approval_state = 'approved' WHERE id = ?1",
                params![request.message_id],
            )
            .map_err(|error| format!("failed to mark proposal as approved: {error}"))?;

        Ok(ApproveProposalResponse {
            success: true,
            commit_hash,
            error: None,
            extra_files,
            extra_files_error,
        })
    })();

    let final_message_content =
        append_output_messages(&persisted_message_content, &warnings, &errors);
    if final_message_content != original_message_content {
        let connection = open_db(&app)?;
        connection
            .execute(
                "UPDATE messages SET content = ?1 WHERE id = ?2",
                params![final_message_content, request.message_id],
            )
            .map_err(|error| format!("failed to persist proposal message content: {error}"))?;
    }

    result
}
