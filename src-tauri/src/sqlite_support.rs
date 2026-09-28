use rusqlite::{params, Connection, OptionalExtension};
use serde::Deserialize;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use walkdir::WalkDir;

#[derive(Debug, Clone, Copy, Default)]
pub struct CopyDirOptions {
    pub exclude_node_modules: bool,
    pub exclude_git: bool,
}

const USER_DATA_DIR_OVERRIDE_ENV: &str = "CHAEMERA_TAURI_USER_DATA_DIR";
const CHAEMERA_APPS_DIR_OVERRIDE_ENV: &str = "CHAEMERA_TAURI_CHAEMERA_APPS_DIR";
const DRIZZLE_MIGRATIONS_TABLE: &str = "__drizzle_migrations";

#[derive(Debug, Deserialize)]
struct MigrationJournal {
    entries: Vec<MigrationJournalEntry>,
}

#[derive(Debug, Deserialize)]
struct MigrationJournalEntry {
    idx: usize,
    tag: String,
    when: i64,
}

pub fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap_or(Path::new(env!("CARGO_MANIFEST_DIR")))
        .to_path_buf()
}

fn override_dir(env_key: &str) -> Option<PathBuf> {
    env::var_os(env_key).map(PathBuf::from)
}

fn resolve_existing_asset_path(relative_path: &str, roots: &[PathBuf]) -> Option<PathBuf> {
    let relative_candidates = [
        PathBuf::from(relative_path),
        PathBuf::from("_up_").join(relative_path),
    ];

    for root in roots {
        for candidate in &relative_candidates {
            let full_path = root.join(candidate);
            if full_path.exists() {
                return Some(full_path);
            }
        }
    }

    None
}

pub fn resolve_runtime_asset(app: &AppHandle, relative_path: &str) -> Result<PathBuf, String> {
    let mut roots = vec![workspace_root()];

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir);
    }

    resolve_existing_asset_path(relative_path, &roots)
        .ok_or_else(|| format!("failed to resolve runtime asset: {relative_path}"))
}

fn migration_journal_path(app: &AppHandle) -> Result<PathBuf, String> {
    resolve_runtime_asset(app, "drizzle/meta/_journal.json")
}

fn migration_sql_path(app: &AppHandle, tag: &str) -> Result<PathBuf, String> {
    resolve_runtime_asset(app, &format!("drizzle/{tag}.sql"))
}

fn create_directory(path: &Path, label: &str) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| format!("failed to create {label}: {error}"))
}

fn read_migration_journal(app: &AppHandle) -> Result<Vec<MigrationJournalEntry>, String> {
    let raw = fs::read_to_string(migration_journal_path(app)?)
        .map_err(|error| format!("failed to read migration journal: {error}"))?;
    let mut journal: MigrationJournal = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse migration journal: {error}"))?;
    journal.entries.sort_by_key(|entry| entry.idx);
    Ok(journal.entries)
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, String> {
    let exists = connection
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1 LIMIT 1",
            params![table_name],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("failed to inspect sqlite schema: {error}"))?;

    Ok(exists.is_some())
}

fn apply_pending_migrations(
    app: &AppHandle,
    connection: &Connection,
    database_preexisted: bool,
) -> Result<(), String> {
    connection
        .execute(
            &format!(
                "CREATE TABLE IF NOT EXISTS {DRIZZLE_MIGRATIONS_TABLE} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    hash text NOT NULL,
                    created_at numeric
                )"
            ),
            [],
        )
        .map_err(|error| format!("failed to create drizzle migrations table: {error}"))?;

    let last_applied = connection
        .query_row(
            &format!(
                "SELECT created_at FROM {DRIZZLE_MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1"
            ),
            [],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("failed to query latest drizzle migration: {error}"))?;

    if last_applied.is_none() && database_preexisted && table_exists(connection, "apps")? {
        return Ok(());
    }

    for entry in read_migration_journal(app)? {
        if last_applied.is_some_and(|timestamp| timestamp >= entry.when) {
            continue;
        }

        let migration_sql = fs::read_to_string(migration_sql_path(app, &entry.tag)?)
            .map_err(|error| format!("failed to read migration {}: {error}", entry.tag))?;

        connection
            .execute_batch(&migration_sql)
            .map_err(|error| format!("failed to apply migration {}: {error}", entry.tag))?;
        connection
            .execute(
                &format!(
                    "INSERT INTO {DRIZZLE_MIGRATIONS_TABLE} (hash, created_at) VALUES (?1, ?2)"
                ),
                params![entry.tag, entry.when],
            )
            .map_err(|error| format!("failed to record migration {}: {error}", entry.tag))?;
    }

    Ok(())
}

pub fn user_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let path = if let Some(override_dir) = override_dir(USER_DATA_DIR_OVERRIDE_ENV) {
        override_dir
    } else if cfg!(debug_assertions) {
        let path = workspace_root().join("userData");
        path
    } else {
        app.path()
            .app_data_dir()
            .map_err(|error| format!("failed to resolve app data dir: {error}"))?
    };

    create_directory(&path, "app data dir")?;
    Ok(path)
}

pub fn sqlite_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(user_data_dir(app)?.join("sqlite.db"))
}

pub fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = sqlite_path(app)?;
    if let Some(parent) = path.parent() {
        create_directory(parent, "sqlite parent dir")?;
    }

    let database_preexisted = path.exists();
    let connection = Connection::open(path)
        .map_err(|error| format!("failed to open sqlite database: {error}"))?;

    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|error| format!("failed to configure sqlite pragmas: {error}"))?;
    apply_pending_migrations(app, &connection, database_preexisted)?;

    Ok(connection)
}

#[cfg(test)]
mod tests {
    use super::resolve_existing_asset_path;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_test_dir(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("chaemera-{label}-{unique}"));
        fs::create_dir_all(&dir).expect("create temp dir");
        dir
    }

    #[test]
    fn resolve_existing_asset_path_prefers_first_existing_root() {
        let first_root = temp_test_dir("asset-first");
        let second_root = temp_test_dir("asset-second");
        let relative_path = PathBuf::from("drizzle/meta/_journal.json");

        fs::create_dir_all(first_root.join("drizzle/meta")).expect("create first asset dir");
        fs::create_dir_all(second_root.join("drizzle/meta")).expect("create second asset dir");
        fs::write(first_root.join(&relative_path), "first").expect("write first asset");
        fs::write(second_root.join(&relative_path), "second").expect("write second asset");

        let resolved = resolve_existing_asset_path(
            "drizzle/meta/_journal.json",
            &[first_root.clone(), second_root.clone()],
        )
        .expect("resolve asset");

        assert_eq!(resolved, first_root.join(&relative_path));

        fs::remove_dir_all(first_root).ok();
        fs::remove_dir_all(second_root).ok();
    }

    #[test]
    fn resolve_existing_asset_path_uses_packaged_root_when_dev_root_missing() {
        let missing_root = temp_test_dir("asset-missing");
        let packaged_root = temp_test_dir("asset-packaged");
        let relative_path = PathBuf::from("drizzle/0025_lush_stark_industries.sql");

        fs::create_dir_all(packaged_root.join("drizzle")).expect("create packaged asset dir");
        fs::write(packaged_root.join(&relative_path), "select 1;").expect("write packaged asset");
        fs::remove_dir_all(&missing_root).ok();

        let resolved = resolve_existing_asset_path(
            "drizzle/0025_lush_stark_industries.sql",
            &[missing_root, packaged_root.clone()],
        )
        .expect("resolve packaged asset");

        assert_eq!(resolved, packaged_root.join(&relative_path));

        fs::remove_dir_all(packaged_root).ok();
    }

    #[test]
    fn resolve_existing_asset_path_falls_back_to_up_directory() {
        let packaged_root = temp_test_dir("asset-up");
        let relative_path = PathBuf::from("drizzle/meta/_journal.json");

        fs::create_dir_all(packaged_root.join("_up_/drizzle/meta")).expect("create up asset dir");
        fs::write(packaged_root.join("_up_").join(&relative_path), "journal")
            .expect("write up asset");

        let resolved =
            resolve_existing_asset_path("drizzle/meta/_journal.json", &[packaged_root.clone()])
                .expect("resolve up asset");

        assert_eq!(resolved, packaged_root.join("_up_").join(&relative_path));

        fs::remove_dir_all(packaged_root).ok();
    }
}

pub fn dyad_apps_base_directory() -> Result<PathBuf, String> {
    let path = if let Some(override_dir) = override_dir(CHAEMERA_APPS_DIR_OVERRIDE_ENV) {
        override_dir
    } else {
        let home_dir = env::var_os("USERPROFILE")
            .or_else(|| env::var_os("HOME"))
            .map(PathBuf::from)
            .ok_or_else(|| "failed to resolve home directory".to_string())?;
        home_dir.join("chaemera-apps")
    };

    create_directory(&path, "chaemera-apps directory")?;
    Ok(path)
}

pub fn resolve_workspace_app_path(raw_path: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(raw_path);
    if candidate.is_absolute() {
        Ok(candidate)
    } else {
        Ok(dyad_apps_base_directory()?.join(candidate))
    }
}

pub fn resolve_workspace_app_path_by_id(app: &AppHandle, app_id: i64) -> Result<PathBuf, String> {
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

pub fn normalize_path(path: &str) -> String {
    path.replace('\\', "/")
}

pub fn timestamp_to_rfc3339(timestamp: i64) -> String {
    OffsetDateTime::from_unix_timestamp(timestamp)
        .unwrap_or(OffsetDateTime::UNIX_EPOCH)
        .format(&Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

pub fn now_unix_timestamp() -> i64 {
    OffsetDateTime::now_utc().unix_timestamp()
}

pub fn run_git(app_path: &Path, args: &[&str]) -> Result<String, String> {
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

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn should_skip_entry(path: &Path, options: CopyDirOptions) -> bool {
    path.components().any(|component| match component {
        std::path::Component::Normal(part) => {
            let part = part.to_string_lossy();
            (options.exclude_node_modules && part == "node_modules")
                || (options.exclude_git && part == ".git")
        }
        _ => false,
    })
}

pub fn copy_dir_recursive(
    source: &Path,
    destination: &Path,
    options: CopyDirOptions,
) -> Result<(), String> {
    if !source.exists() {
        return Err(format!(
            "source path does not exist: {}",
            source.to_string_lossy()
        ));
    }

    fs::create_dir_all(destination)
        .map_err(|error| format!("failed to create destination directory: {error}"))?;

    for entry in WalkDir::new(source)
        .into_iter()
        .filter_entry(|entry| !should_skip_entry(entry.path(), options))
    {
        let entry = entry.map_err(|error| format!("failed to walk source directory: {error}"))?;
        let path = entry.path();

        if should_skip_entry(path, options) {
            continue;
        }

        let relative = path
            .strip_prefix(source)
            .map_err(|error| format!("failed to build relative path: {error}"))?;

        if relative.as_os_str().is_empty() {
            continue;
        }

        let target = destination.join(relative);
        if entry.file_type().is_dir() {
            fs::create_dir_all(&target)
                .map_err(|error| format!("failed to create directory during copy: {error}"))?;
            continue;
        }

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!("failed to create parent directory during copy: {error}")
            })?;
        }

        fs::copy(path, &target).map_err(|error| format!("failed to copy file: {error}"))?;
    }

    Ok(())
}
