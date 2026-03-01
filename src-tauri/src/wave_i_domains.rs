use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

fn ensure_dyad_gitignored(app_path: &str) -> Result<(), String> {
    let gitignore_path = Path::new(app_path).join(".gitignore");
    let content = match fs::read_to_string(&gitignore_path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => {
            return Err(format!("failed to read app .gitignore: {error}"));
        }
    };

    let already_ignored = content.lines().any(|line| {
        let trimmed = line.trim();
        trimmed == ".dyad" || trimmed == ".dyad/"
    });
    if already_ignored {
        return Ok(());
    }

    let suffix = if !content.is_empty() && !content.ends_with('\n') {
        "\n"
    } else {
        ""
    };
    fs::write(&gitignore_path, format!("{content}{suffix}.dyad/\n"))
        .map_err(|error| format!("failed to update app .gitignore: {error}"))?;
    Ok(())
}

fn plan_dir(app_path: &str) -> Result<PathBuf, String> {
    ensure_dyad_gitignored(app_path)?;
    let dir = Path::new(app_path).join(".dyad").join("plans");
    fs::create_dir_all(&dir).map_err(|error| format!("failed to create plan dir: {error}"))?;
    Ok(dir)
}

fn slugify(text: &str) -> String {
    let mut slug = String::new();
    let mut last_was_dash = false;

    for character in text.to_lowercase().chars() {
        if character.is_ascii_alphanumeric() {
            slug.push(character);
            last_was_dash = false;
        } else if !last_was_dash {
            slug.push('-');
            last_was_dash = true;
        }

        if slug.len() >= 60 {
            break;
        }
    }

    let trimmed = slug.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "untitled".to_string()
    } else {
        trimmed
    }
}

fn validate_plan_id(plan_id: &str) -> Result<(), String> {
    if plan_id.is_empty()
        || !plan_id.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
        })
    {
        return Err("Invalid plan ID".to_string());
    }
    Ok(())
}

fn build_frontmatter(meta: &[(&str, String)]) -> String {
    let lines = meta
        .iter()
        .map(|(key, value)| {
            let escaped = value
                .replace('\\', "\\\\")
                .replace('\n', " ")
                .replace('"', "\\\"");
            format!(r#"{key}: "{escaped}""#)
        })
        .collect::<Vec<_>>();
    format!("---\n{}\n---\n\n", lines.join("\n"))
}

fn parse_plan_file(raw: &str) -> (HashMap<String, String>, String) {
    let Some(rest) = raw
        .strip_prefix("---\n")
        .or_else(|| raw.strip_prefix("---\r\n"))
    else {
        return (HashMap::new(), raw.to_string());
    };

    let split_marker = if let Some(index) = rest.find("\n---\n") {
        Some((index, "\n---\n", 5usize))
    } else {
        rest.find("\r\n---\r\n")
            .map(|index| (index, "\r\n---\r\n", 7usize))
    };

    let Some((index, _, marker_len)) = split_marker else {
        return (HashMap::new(), raw.to_string());
    };

    let frontmatter = &rest[..index];
    let content = rest[index + marker_len..].trim().to_string();
    let mut meta = HashMap::new();

    for line in frontmatter.lines() {
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };

        let mut normalized = value.trim().to_string();
        if normalized.starts_with('"') && normalized.ends_with('"') && normalized.len() >= 2 {
            normalized = normalized[1..normalized.len() - 1]
                .replace("\\\"", "\"")
                .replace("\\\\", "\\");
        }
        meta.insert(key.trim().to_string(), normalized);
    }

    (meta, content)
}

fn now_iso() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let utc = OffsetDateTime::from_unix_timestamp(timestamp).unwrap_or(OffsetDateTime::UNIX_EPOCH);
    utc.format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePlanRequest {
    app_id: i64,
    app_path: String,
    chat_id: i64,
    title: String,
    summary: Option<String>,
    content: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPlanRequest {
    app_id: i64,
    app_path: String,
    plan_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetPlanForChatRequest {
    app_id: i64,
    app_path: String,
    chat_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePlanRequest {
    app_id: i64,
    app_path: String,
    id: String,
    title: Option<String>,
    summary: Option<String>,
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletePlanRequest {
    app_id: i64,
    app_path: String,
    plan_id: String,
}

fn plan_json(
    id: &str,
    app_id: i64,
    chat_id: Option<i64>,
    meta: &HashMap<String, String>,
    content: String,
) -> Value {
    json!({
        "id": id,
        "appId": app_id,
        "chatId": chat_id,
        "title": meta.get("title").cloned().unwrap_or_default(),
        "summary": meta.get("summary").cloned().filter(|value| !value.is_empty()),
        "content": content,
        "createdAt": meta.get("createdAt").cloned().unwrap_or_else(now_iso),
        "updatedAt": meta.get("updatedAt").cloned().unwrap_or_else(now_iso),
    })
}

#[tauri::command]
pub fn plan_create(request: CreatePlanRequest) -> Result<String, String> {
    let _ = request.app_id;
    let plan_dir = plan_dir(&request.app_path)?;
    let now = now_iso();
    let slug = format!(
        "chat-{}-{}-{}",
        request.chat_id,
        slugify(&request.title),
        now_millis()
    );
    validate_plan_id(&slug)?;

    let frontmatter = build_frontmatter(&[
        ("title", request.title),
        ("summary", request.summary.unwrap_or_default()),
        ("chatId", request.chat_id.to_string()),
        ("createdAt", now.clone()),
        ("updatedAt", now),
    ]);

    let file_path = plan_dir.join(format!("{slug}.md"));
    fs::write(file_path, format!("{frontmatter}{}", request.content))
        .map_err(|error| format!("failed to write plan file: {error}"))?;

    Ok(slug)
}

#[tauri::command]
pub fn plan_get(request: GetPlanRequest) -> Result<Value, String> {
    validate_plan_id(&request.plan_id)?;
    let plan_dir = plan_dir(&request.app_path)?;
    let file_path = plan_dir.join(format!("{}.md", request.plan_id));
    let raw = fs::read_to_string(&file_path)
        .map_err(|error| format!("failed to read plan file: {error}"))?;
    let (meta, content) = parse_plan_file(&raw);
    let chat_id = meta
        .get("chatId")
        .and_then(|value| value.parse::<i64>().ok());

    Ok(plan_json(
        &request.plan_id,
        request.app_id,
        chat_id,
        &meta,
        content,
    ))
}

#[tauri::command]
pub fn plan_get_for_chat(request: GetPlanForChatRequest) -> Result<Option<Value>, String> {
    let plan_dir = plan_dir(&request.app_path)?;
    let entries = match fs::read_dir(&plan_dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("failed to read plan dir: {error}")),
    };

    let prefix = format!("chat-{}-", request.chat_id);
    let mut matches = entries
        .flatten()
        .filter_map(|entry| entry.file_name().into_string().ok())
        .filter(|file_name| file_name.starts_with(&prefix) && file_name.ends_with(".md"))
        .collect::<Vec<_>>();

    if matches.is_empty() {
        return Ok(None);
    }

    matches.sort();
    let file_name = matches.pop().unwrap_or_default();
    let slug = file_name.trim_end_matches(".md");
    let raw = fs::read_to_string(plan_dir.join(&file_name))
        .map_err(|error| format!("failed to read plan file: {error}"))?;
    let (meta, content) = parse_plan_file(&raw);
    let chat_id = meta
        .get("chatId")
        .and_then(|value| value.parse::<i64>().ok())
        .or(Some(request.chat_id));

    Ok(Some(plan_json(
        slug,
        request.app_id,
        chat_id,
        &meta,
        content,
    )))
}

#[tauri::command]
pub fn plan_update(request: UpdatePlanRequest) -> Result<(), String> {
    let _ = request.app_id;
    validate_plan_id(&request.id)?;
    let plan_dir = plan_dir(&request.app_path)?;
    let file_path = plan_dir.join(format!("{}.md", request.id));
    let raw = fs::read_to_string(&file_path)
        .map_err(|error| format!("failed to read plan file: {error}"))?;
    let (mut meta, content) = parse_plan_file(&raw);

    if let Some(title) = request.title {
        meta.insert("title".to_string(), title);
    }
    if let Some(summary) = request.summary {
        meta.insert("summary".to_string(), summary);
    }
    meta.insert("updatedAt".to_string(), now_iso());

    let next_content = request.content.unwrap_or(content);
    let frontmatter = build_frontmatter(&[
        ("title", meta.get("title").cloned().unwrap_or_default()),
        ("summary", meta.get("summary").cloned().unwrap_or_default()),
        ("chatId", meta.get("chatId").cloned().unwrap_or_default()),
        (
            "createdAt",
            meta.get("createdAt").cloned().unwrap_or_else(now_iso),
        ),
        (
            "updatedAt",
            meta.get("updatedAt").cloned().unwrap_or_else(now_iso),
        ),
    ]);

    fs::write(file_path, format!("{frontmatter}{next_content}"))
        .map_err(|error| format!("failed to update plan file: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn plan_delete(request: DeletePlanRequest) -> Result<(), String> {
    let _ = request.app_id;
    validate_plan_id(&request.plan_id)?;
    let plan_dir = plan_dir(&request.app_path)?;
    let file_path = plan_dir.join(format!("{}.md", request.plan_id));
    fs::remove_file(file_path).map_err(|error| format!("failed to delete plan file: {error}"))?;
    Ok(())
}
