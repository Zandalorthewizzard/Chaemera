use crate::sqlite_support::{open_db, resolve_workspace_app_path, run_git};
use crate::wave_aa_domains::{resolve_neon_connection_uri, restore_neon_project_branch};
use crate::wave_g_domains::{effective_path_value, refresh_process_path};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::AppHandle;

const COMPONENT_TAGGER_PACKAGE: &str = "@dyad-sh/react-vite-component-tagger";
const COMPONENT_TAGGER_IMPORT: &str =
    "import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';";
const COMPONENT_TAGGER_COMMIT_MESSAGE: &str = "[chaemera] add component tagger";
const CAPACITOR_COMMIT_MESSAGE: &str = "[chaemera] add Capacitor for mobile app support";
const DEFAULT_GIT_AUTHOR_NAME: &str = "[chaemera]";
const DEFAULT_GIT_AUTHOR_EMAIL: &str = "git@chaemera.local";
const ENV_FILE_NAME: &str = ".env.local";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppIdRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteAppUpgradeRequest {
    app_id: i64,
    upgrade_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutVersionRequest {
    app_id: i64,
    version_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpgradeDto {
    id: String,
    title: String,
    description: String,
    manual_upgrade_url: String,
    is_needed: bool,
}

#[derive(Debug)]
struct AppRecord {
    name: String,
    raw_path: String,
    neon_project_id: Option<String>,
    neon_development_branch_id: Option<String>,
    neon_preview_branch_id: Option<String>,
}

#[derive(Debug)]
struct VersionRecord {
    neon_db_timestamp: Option<String>,
}

#[derive(Debug, Clone)]
struct EnvVarDto {
    key: String,
    value: String,
}

fn read_app_record(app: &AppHandle, app_id: i64) -> Result<AppRecord, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT name, path, neon_project_id, neon_development_branch_id, neon_preview_branch_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(AppRecord {
                    name: row.get(0)?,
                    raw_path: row.get(1)?,
                    neon_project_id: row.get(2)?,
                    neon_development_branch_id: row.get(3)?,
                    neon_preview_branch_id: row.get(4)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query app: {error}"))?
        .ok_or_else(|| "App not found".to_string())
}

fn read_version_record(
    app: &AppHandle,
    app_id: i64,
    commit_hash: &str,
) -> Result<Option<VersionRecord>, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT neon_db_timestamp FROM versions WHERE app_id = ?1 AND commit_hash = ?2",
            params![app_id, commit_hash],
            |row| {
                Ok(VersionRecord {
                    neon_db_timestamp: row.get(0)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query version record: {error}"))
}

fn command_name(program: &str) -> String {
    if cfg!(target_os = "windows") && matches!(program, "npm" | "npx" | "pnpm") {
        format!("{program}.cmd")
    } else {
        program.to_string()
    }
}

fn run_command(
    app: &AppHandle,
    app_path: &Path,
    program: &str,
    args: &[&str],
    error_prefix: &str,
) -> Result<String, String> {
    refresh_process_path(app);
    let output = Command::new(command_name(program))
        .args(args)
        .current_dir(app_path)
        .env("PATH", effective_path_value(app))
        .output()
        .map_err(|error| format!("{error_prefix}: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { stdout } else { stderr };
        return Err(if detail.is_empty() {
            format!(
                "{error_prefix}: command failed with status {}",
                output.status
            )
        } else {
            format!("{error_prefix}: {detail}")
        });
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn run_git_with_author(repo_path: &Path, args: &[&str]) -> Result<String, String> {
    let mut prefixed = vec![
        "-c".to_string(),
        format!("user.name={DEFAULT_GIT_AUTHOR_NAME}"),
        "-c".to_string(),
        format!("user.email={DEFAULT_GIT_AUTHOR_EMAIL}"),
    ];
    prefixed.extend(args.iter().map(|arg| arg.to_string()));
    let refs = prefixed.iter().map(String::as_str).collect::<Vec<_>>();
    run_git(repo_path, &refs)
}

fn stage_and_commit_if_needed(repo_path: &Path, message: &str) -> Result<(), String> {
    run_git(repo_path, &["add", "--all"])?;
    let status = run_git(repo_path, &["status", "--porcelain"])?;
    if status.trim().is_empty() {
        return Ok(());
    }

    run_git_with_author(repo_path, &["commit", "-m", message]).map(|_| ())
}

fn is_vite_app(app_path: &Path) -> bool {
    app_path.join("vite.config.ts").exists() || app_path.join("vite.config.js").exists()
}

fn vite_config_path(app_path: &Path) -> Option<PathBuf> {
    ["vite.config.ts", "vite.config.js"]
        .iter()
        .map(|file_name| app_path.join(file_name))
        .find(|candidate| candidate.exists())
}

fn is_component_tagger_upgrade_needed(app_path: &Path) -> bool {
    let Some(config_path) = vite_config_path(app_path) else {
        return false;
    };

    fs::read_to_string(config_path)
        .map(|content| !content.contains(COMPONENT_TAGGER_PACKAGE))
        .unwrap_or(false)
}

fn is_capacitor_upgrade_needed(app_path: &Path) -> bool {
    if !is_vite_app(app_path) {
        return false;
    }

    ![
        "capacitor.config.js",
        "capacitor.config.ts",
        "capacitor.config.json",
    ]
    .iter()
    .any(|file_name| app_path.join(file_name).exists())
}

fn insert_component_tagger_import(content: &str) -> String {
    if content.contains(COMPONENT_TAGGER_IMPORT) {
        return content.to_string();
    }

    let lines = content.lines().collect::<Vec<_>>();
    let last_import_index = lines
        .iter()
        .enumerate()
        .filter(|(_, line)| line.trim_start().starts_with("import "))
        .map(|(index, _)| index)
        .last();

    let mut next_lines = Vec::with_capacity(lines.len() + 1);
    match last_import_index {
        Some(index) => {
            for (line_index, line) in lines.iter().enumerate() {
                next_lines.push((*line).to_string());
                if line_index == index {
                    next_lines.push(COMPONENT_TAGGER_IMPORT.to_string());
                }
            }
        }
        None => {
            next_lines.push(COMPONENT_TAGGER_IMPORT.to_string());
            next_lines.extend(lines.into_iter().map(str::to_string));
        }
    }

    next_lines.join("\n")
}

fn insert_component_tagger_plugin(content: &str) -> Result<String, String> {
    if content.contains("dyadComponentTagger()") {
        return Ok(content.to_string());
    }

    if !content.contains("plugins: [") {
        return Err(
            "Could not find `plugins: [` in vite config. Manual installation required.".to_string(),
        );
    }

    Ok(content.replacen("plugins: [", "plugins: [dyadComponentTagger(), ", 1))
}

fn try_install_component_tagger(app: &AppHandle, app_path: &Path) -> Result<(), String> {
    run_command(
        app,
        app_path,
        "pnpm",
        &["add", "-D", COMPONENT_TAGGER_PACKAGE],
        "Failed to install component tagger with pnpm",
    )
    .or_else(|_| {
        run_command(
            app,
            app_path,
            "npm",
            &[
                "install",
                "--save-dev",
                "--legacy-peer-deps",
                COMPONENT_TAGGER_PACKAGE,
            ],
            "Failed to install component tagger with npm",
        )
    })
    .map(|_| ())
}

fn sanitize_bundle_id(name: &str) -> String {
    let sanitized = name
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .collect::<String>()
        .to_lowercase();

    if sanitized.is_empty() {
        "app".to_string()
    } else {
        sanitized
    }
}

fn apply_component_tagger(app: &AppHandle, app_path: &Path) -> Result<(), String> {
    let config_path = vite_config_path(app_path)
        .ok_or_else(|| "Could not find vite.config.js or vite.config.ts".to_string())?;
    let original = fs::read_to_string(&config_path)
        .map_err(|error| format!("failed to read vite config: {error}"))?;
    let with_import = insert_component_tagger_import(&original);
    let with_plugin = insert_component_tagger_plugin(&with_import)?;

    fs::write(&config_path, with_plugin)
        .map_err(|error| format!("failed to write vite config: {error}"))?;

    try_install_component_tagger(app, app_path)?;
    stage_and_commit_if_needed(app_path, COMPONENT_TAGGER_COMMIT_MESSAGE)
}

fn apply_capacitor(app: &AppHandle, app_name: &str, app_path: &Path) -> Result<(), String> {
    run_command(
        app,
        app_path,
        "pnpm",
        &[
            "add",
            "@capacitor/core@7.4.4",
            "@capacitor/cli@7.4.4",
            "@capacitor/ios@7.4.4",
            "@capacitor/android@7.4.4",
        ],
        "Failed to install Capacitor dependencies with pnpm",
    )
    .or_else(|_| {
        run_command(
            app,
            app_path,
            "npm",
            &[
                "install",
                "--legacy-peer-deps",
                "@capacitor/core@7.4.4",
                "@capacitor/cli@7.4.4",
                "@capacitor/ios@7.4.4",
                "@capacitor/android@7.4.4",
            ],
            "Failed to install Capacitor dependencies with npm",
        )
    })?;

    let bundle_id = format!("com.example.{}", sanitize_bundle_id(app_name));
    run_command(
        app,
        app_path,
        "npx",
        &["cap", "init", app_name, &bundle_id, "--web-dir=dist"],
        "Failed to initialize Capacitor",
    )?;
    run_command(
        app,
        app_path,
        "npx",
        &["cap", "add", "ios"],
        "Failed to add iOS platform",
    )?;
    run_command(
        app,
        app_path,
        "npx",
        &["cap", "add", "android"],
        "Failed to add Android platform",
    )?;

    stage_and_commit_if_needed(app_path, CAPACITOR_COMMIT_MESSAGE)
}

fn env_file_path(app_path: &Path) -> PathBuf {
    app_path.join(ENV_FILE_NAME)
}

fn parse_env_file(content: &str) -> Vec<EnvVarDto> {
    let mut env_vars = Vec::new();

    for raw_line in content.lines() {
        let trimmed = raw_line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let Some(equal_index) = trimmed.find('=') else {
            continue;
        };
        if equal_index == 0 {
            continue;
        }

        let key = trimmed[..equal_index].trim().to_string();
        let value = trimmed[equal_index + 1..].trim();
        let clean_value = if let Some(stripped) = value.strip_prefix('"') {
            let mut parsed = String::new();
            let mut escaped = false;
            for character in stripped.chars() {
                if escaped {
                    parsed.push(character);
                    escaped = false;
                    continue;
                }
                match character {
                    '\\' => escaped = true,
                    '"' => break,
                    _ => parsed.push(character),
                }
            }
            parsed
        } else if let Some(stripped) = value.strip_prefix('\'') {
            stripped
                .split_once('\'')
                .map(|(parsed, _)| parsed.to_string())
                .unwrap_or_else(|| stripped.to_string())
        } else {
            value.to_string()
        };

        env_vars.push(EnvVarDto {
            key,
            value: clean_value,
        });
    }

    env_vars
}

fn needs_quotes(value: &str) -> bool {
    value.chars().any(|character| {
        character.is_whitespace() || matches!(character, '#' | '"' | '\'' | '=' | '&' | '?')
    })
}

fn serialize_env_file(env_vars: &[EnvVarDto]) -> String {
    env_vars
        .iter()
        .map(|env_var| {
            let quoted_value = if needs_quotes(&env_var.value) {
                format!("\"{}\"", env_var.value.replace('"', "\\\""))
            } else {
                env_var.value.clone()
            };
            format!("{}={}", env_var.key, quoted_value)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn upsert_env_var(app_path: &Path, key: &str, value: &str) -> Result<(), String> {
    let file_path = env_file_path(app_path);
    let content = fs::read_to_string(&file_path).unwrap_or_default();
    let mut env_vars = parse_env_file(&content);
    if let Some(existing) = env_vars.iter_mut().find(|env_var| env_var.key == key) {
        existing.value = value.to_string();
    } else {
        env_vars.push(EnvVarDto {
            key: key.to_string(),
            value: value.to_string(),
        });
    }

    let serialized = serialize_env_file(&env_vars);
    fs::write(file_path, serialized).map_err(|error| format!("failed to write env file: {error}"))
}

fn switch_postgres_to_development_branch(
    app: &AppHandle,
    app_path: &Path,
    neon_project_id: &str,
    neon_development_branch_id: &str,
) -> Result<(), String> {
    let connection_uri =
        resolve_neon_connection_uri(app, neon_project_id, neon_development_branch_id)?;
    upsert_env_var(app_path, "POSTGRES_URL", &connection_uri)?;
    upsert_env_var(app_path, "DYAD_DISABLE_DB_PUSH", "false")
}

fn switch_postgres_to_preview_branch(
    app: &AppHandle,
    app_path: &Path,
    neon_project_id: &str,
    neon_development_branch_id: &str,
    neon_preview_branch_id: &str,
    db_timestamp: &str,
) -> Result<(), String> {
    upsert_env_var(app_path, "DYAD_DISABLE_DB_PUSH", "true")?;
    restore_neon_project_branch(
        app,
        neon_project_id,
        neon_preview_branch_id,
        neon_development_branch_id,
        db_timestamp,
    )?;
    let connection_uri = resolve_neon_connection_uri(app, neon_project_id, neon_preview_branch_id)?;
    upsert_env_var(app_path, "POSTGRES_URL", &connection_uri)
}

#[tauri::command]
pub fn get_app_upgrades(
    app: AppHandle,
    request: AppIdRequest,
) -> Result<Vec<AppUpgradeDto>, String> {
    let app_record = read_app_record(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.raw_path)?;

    Ok(vec![
        AppUpgradeDto {
            id: "component-tagger".to_string(),
            title: "Enable select component to edit".to_string(),
            description: "Installs the component tagger Vite plugin and its dependencies."
                .to_string(),
            manual_upgrade_url: "https://example.invalid/help".to_string(),
            is_needed: is_component_tagger_upgrade_needed(&app_path),
        },
        AppUpgradeDto {
            id: "capacitor".to_string(),
            title: "Upgrade to hybrid mobile app with Capacitor".to_string(),
            description:
                "Adds Capacitor so the app can run on iOS and Android in addition to the web."
                    .to_string(),
            manual_upgrade_url: "https://example.invalid/help".to_string(),
            is_needed: is_capacitor_upgrade_needed(&app_path),
        },
    ])
}

#[tauri::command]
pub fn execute_app_upgrade(
    app: AppHandle,
    request: ExecuteAppUpgradeRequest,
) -> Result<(), String> {
    let app_record = read_app_record(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.raw_path)?;
    let upgrade_id = request.upgrade_id.trim();

    match upgrade_id {
        "component-tagger" => apply_component_tagger(&app, &app_path),
        "capacitor" => apply_capacitor(&app, &app_record.name, &app_path),
        _ => Err(format!("Unknown upgrade id: {}", request.upgrade_id)),
    }
}

#[tauri::command]
pub fn checkout_version(app: AppHandle, request: CheckoutVersionRequest) -> Result<(), String> {
    let app_record = read_app_record(&app, request.app_id)?;
    let app_path = resolve_workspace_app_path(&app_record.raw_path)?;
    let git_ref = request.version_id.trim();
    if git_ref.is_empty() {
        return Err("versionId is required".to_string());
    }

    if let (Some(project_id), Some(development_branch_id), Some(preview_branch_id)) = (
        app_record.neon_project_id.as_deref(),
        app_record.neon_development_branch_id.as_deref(),
        app_record.neon_preview_branch_id.as_deref(),
    ) {
        if git_ref == "main" {
            switch_postgres_to_development_branch(
                &app,
                &app_path,
                project_id,
                development_branch_id,
            )?;
        } else {
            upsert_env_var(&app_path, "DYAD_DISABLE_DB_PUSH", "true")?;
            if let Some(version_record) = read_version_record(&app, request.app_id, git_ref)? {
                if let Some(db_timestamp) = version_record.neon_db_timestamp {
                    switch_postgres_to_preview_branch(
                        &app,
                        &app_path,
                        project_id,
                        development_branch_id,
                        preview_branch_id,
                        &db_timestamp,
                    )?;
                }
            }
        }
    }

    run_git(&app_path, &["checkout", git_ref]).map(|_| ())
}
