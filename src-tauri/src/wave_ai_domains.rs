use crate::sqlite_support::{open_db, resolve_workspace_app_path};
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use regex::{NoExpand, Regex};
use rusqlite::params;
use serde::Deserialize;
use std::process::Command;
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddDependencyRequest {
    chat_id: i64,
    packages: Vec<String>,
}

#[derive(Debug)]
struct DependencyMessageRecord {
    id: i64,
    content: String,
}

fn query_dependency_context(
    app: &AppHandle,
    chat_id: i64,
    package_tag: &str,
) -> Result<(String, DependencyMessageRecord), String> {
    let connection = open_db(app)?;
    let raw_app_path = connection
        .query_row(
            "SELECT a.path
             FROM chats c
             JOIN apps a ON a.id = c.app_id
             WHERE c.id = ?1",
            params![chat_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| format!("failed to resolve app path for dependency install: {error}"))?;

    let mut statement = connection
        .prepare(
            "SELECT id, content
             FROM messages
             WHERE chat_id = ?1
             ORDER BY created_at DESC, id DESC",
        )
        .map_err(|error| format!("failed to prepare dependency message query: {error}"))?;

    let rows = statement
        .query_map(params![chat_id], |row| {
            Ok(DependencyMessageRecord {
                id: row.get(0)?,
                content: row.get(1)?,
            })
        })
        .map_err(|error| format!("failed to execute dependency message query: {error}"))?;

    let messages = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode dependency messages: {error}"))?;

    let message = messages
        .into_iter()
        .find(|message| message.content.contains(package_tag))
        .ok_or_else(|| "Message with requested dependency tag not found".to_string())?;

    Ok((raw_app_path, message))
}

fn install_dependencies(
    app: &AppHandle,
    app_path: &std::path::Path,
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

#[tauri::command]
pub fn chat_add_dep(app: AppHandle, request: AddDependencyRequest) -> Result<(), String> {
    if request.packages.is_empty() {
        return Err("At least one package is required".to_string());
    }

    let package_str = request.packages.join(" ");
    let opening_tag = format!(r#"<dyad-add-dependency packages="{package_str}">"#);
    let (raw_app_path, message) = query_dependency_context(&app, request.chat_id, &opening_tag)?;
    let app_path = resolve_workspace_app_path(&raw_app_path)?;
    let install_results = install_dependencies(&app, &app_path, &request.packages)?;

    let escaped_package_str = regex::escape(&package_str);
    let tag_regex = Regex::new(&format!(
        r#"(?s)<dyad-add-dependency packages="{escaped_package_str}">[^<]*</dyad-add-dependency>"#
    ))
    .map_err(|error| format!("failed to compile dependency replacement regex: {error}"))?;

    let replacement = format!(
        r#"<dyad-add-dependency packages="{package_str}">{install_results}</dyad-add-dependency>"#
    );
    let updated_content = tag_regex
        .replace_all(&message.content, NoExpand(&replacement))
        .to_string();

    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE messages SET content = ?1 WHERE id = ?2",
            params![updated_content, message.id],
        )
        .map_err(|error| format!("failed to persist dependency install results: {error}"))?;

    Ok(())
}
