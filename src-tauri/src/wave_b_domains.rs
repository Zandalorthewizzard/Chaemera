use rfd::FileDialog;
use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TemplateDto {
    id: &'static str,
    title: &'static str,
    description: &'static str,
    image_url: &'static str,
    github_url: Option<&'static str>,
    is_official: bool,
    is_experimental: Option<bool>,
    requires_neon: Option<bool>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FileSearchSnippetDto {
    before: String,
    r#match: String,
    after: String,
    line: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppFileSearchResultDto {
    path: String,
    matches_content: bool,
    snippets: Option<Vec<FileSearchSnippetDto>>,
}

fn local_templates() -> Vec<TemplateDto> {
    vec![
        TemplateDto {
            id: "react",
            title: "React.js Template",
            description: "Uses React.js, Vite, Shadcn, Tailwind and TypeScript.",
            image_url:
                "https://github.com/user-attachments/assets/5b700eab-b28c-498e-96de-8649b14c16d9",
            github_url: None,
            is_official: true,
            is_experimental: None,
            requires_neon: None,
        },
        TemplateDto {
            id: "next",
            title: "Next.js Template",
            description: "Uses Next.js, React.js, Shadcn, Tailwind and TypeScript.",
            image_url:
                "https://github.com/user-attachments/assets/96258e4f-abce-4910-a62a-a9dff77965f2",
            github_url: Some("https://github.com/dyad-sh/nextjs-template"),
            is_official: true,
            is_experimental: None,
            requires_neon: None,
        },
        TemplateDto {
            id: "portal-mini-store",
            title: "Portal: Mini Store Template",
            description: "Uses Neon DB, Payload CMS, Next.js",
            image_url:
                "https://github.com/user-attachments/assets/ed86f322-40bf-4fd5-81dc-3b1d8a16e12b",
            github_url: Some("https://github.com/dyad-sh/portal-mini-store-template"),
            is_official: true,
            is_experimental: Some(true),
            requires_neon: Some(true),
        },
    ]
}

fn normalize_relative_path(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);
    if path.is_absolute() {
        return Err("absolute file paths are not allowed".to_string());
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(part) => normalized.push(part),
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err("path escapes app root".to_string());
                }
            }
            _ => return Err("invalid file path".to_string()),
        }
    }

    Ok(normalized)
}

fn resolve_app_file_path(app_path: &str, file_path: &str) -> Result<(PathBuf, PathBuf), String> {
    let app_root = fs::canonicalize(app_path)
        .map_err(|error| format!("failed to resolve app path: {error}"))?;
    let relative = normalize_relative_path(file_path)?;
    let full_path = app_root.join(relative);

    if !full_path.starts_with(&app_root) {
        return Err("Invalid file path".to_string());
    }

    Ok((app_root, full_path))
}

fn should_skip_dir(path: &Path) -> bool {
    matches!(
        path.file_name().and_then(|name| name.to_str()),
        Some(".git" | "node_modules" | "dist" | "build" | "out" | "coverage")
    )
}

fn build_snippet(line: &str, query: &str, line_number: usize) -> Option<FileSearchSnippetDto> {
    let start = line.find(query)?;
    let end = start + query.len();
    Some(FileSearchSnippetDto {
        before: line[..start].trim().to_string(),
        r#match: line[start..end].trim().to_string(),
        after: line[end..].trim().to_string(),
        line: line_number,
    })
}

fn run_git(app_path: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(app_path)
        .output()
        .map_err(|error| format!("failed to spawn git: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "git command failed".to_string()
        } else {
            stderr
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn select_app_folder() -> Result<Value, String> {
    let selected = FileDialog::new().pick_folder();
    match selected {
        Some(path) => {
            let name = path
                .file_name()
                .and_then(|part| part.to_str())
                .map(str::to_string);
            Ok(json!({
                "path": path.to_string_lossy().to_string(),
                "name": name,
            }))
        }
        None => Ok(json!({
            "path": null,
            "name": null,
        })),
    }
}

#[tauri::command]
pub fn select_app_location(default_path: Option<String>) -> Result<Value, String> {
    let dialog = match default_path {
        Some(path) => FileDialog::new().set_directory(path),
        None => FileDialog::new(),
    };

    match dialog.pick_folder() {
        Some(path) => Ok(json!({
            "path": path.to_string_lossy().to_string(),
            "canceled": false,
        })),
        None => Ok(json!({
            "path": null,
            "canceled": true,
        })),
    }
}

#[tauri::command]
pub fn check_ai_rules(path: String) -> Result<Value, String> {
    Ok(json!({
        "exists": Path::new(&path).join("AI_RULES.md").exists(),
    }))
}

#[tauri::command]
pub fn get_templates() -> Result<Value, String> {
    serde_json::to_value(local_templates())
        .map_err(|error| format!("failed to serialize templates: {error}"))
}

#[tauri::command]
pub fn read_app_file(app_path: String, file_path: String) -> Result<String, String> {
    let (_, full_path) = resolve_app_file_path(&app_path, &file_path)?;
    fs::read_to_string(full_path).map_err(|error| format!("failed to read file: {error}"))
}

#[tauri::command]
pub fn search_app_files(app_path: String, query: String) -> Result<Value, String> {
    if query.is_empty() {
        return Ok(json!([]));
    }

    let app_root = fs::canonicalize(&app_path)
        .map_err(|error| format!("failed to resolve app path: {error}"))?;

    let mut results: Vec<AppFileSearchResultDto> = Vec::new();

    for entry in WalkDir::new(&app_root)
        .into_iter()
        .filter_entry(|entry| !should_skip_dir(entry.path()))
    {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let full_path = entry.path();
        let content = match fs::read_to_string(full_path) {
            Ok(content) => content,
            Err(_) => continue,
        };

        let snippets: Vec<FileSearchSnippetDto> = content
            .lines()
            .enumerate()
            .filter_map(|(index, line)| build_snippet(line, &query, index + 1))
            .take(10)
            .collect();

        if snippets.is_empty() {
            continue;
        }

        let relative_path = full_path
            .strip_prefix(&app_root)
            .unwrap_or(full_path)
            .to_string_lossy()
            .replace('\\', "/");

        results.push(AppFileSearchResultDto {
            path: relative_path,
            matches_content: true,
            snippets: Some(snippets),
        });
    }

    serde_json::to_value(results)
        .map_err(|error| format!("failed to serialize search results: {error}"))
}

#[tauri::command]
pub fn list_versions(app_path: String) -> Result<Value, String> {
    if !Path::new(&app_path).join(".git").exists() {
        return Ok(json!([]));
    }

    let output = run_git(
        &app_path,
        &[
            "log",
            "--max-count=100000",
            "--pretty=format:%H\x1f%s\x1f%ct\x1e",
        ],
    )?;

    let versions: Vec<Value> = output
        .split('\u{1e}')
        .filter_map(|record| {
            let trimmed = record.trim();
            if trimmed.is_empty() {
                return None;
            }

            let mut parts = trimmed.split('\u{1f}');
            let oid = parts.next()?;
            let message = parts.next()?;
            let timestamp = parts.next()?.parse::<i64>().ok()?;

            Some(json!({
                "oid": oid,
                "message": message,
                "timestamp": timestamp,
                "dbTimestamp": null,
            }))
        })
        .collect();

    Ok(Value::Array(versions))
}

#[tauri::command]
pub fn get_current_branch(app_path: String) -> Result<Value, String> {
    if !Path::new(&app_path).join(".git").exists() {
        return Err("Not a git repository".to_string());
    }

    let branch = run_git(&app_path, &["rev-parse", "--abbrev-ref", "HEAD"])?;
    Ok(json!({
        "branch": branch.trim(),
    }))
}
