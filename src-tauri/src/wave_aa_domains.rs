use crate::core_domains::{read_settings, settings_file_path};
use crate::sqlite_support::open_db;
use reqwest::blocking::{Client, Response};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::env;
use std::fs;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const NEON_API_BASE: &str = "https://console.neon.tech/api/v2";
const NEON_REFRESH_URL: &str = "https://oauth.dyad.sh/api/integrations/neon/refresh";
const MAX_LOCKED_RETRIES: u32 = 6;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NeonCreateProjectRequest {
    name: String,
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NeonGetProjectRequest {
    app_id: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NeonProjectDto {
    id: String,
    name: String,
    connection_string: String,
    branch_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NeonBranchDto {
    branch_id: String,
    branch_name: String,
    last_updated: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_branch_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_branch_name: Option<String>,
    #[serde(rename = "type")]
    branch_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NeonProjectDetailsDto {
    project_id: String,
    project_name: String,
    org_id: String,
    branches: Vec<NeonBranchDto>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NeonRefreshResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct NeonOrganizationsResponse {
    organizations: Option<Vec<NeonOrganizationRecord>>,
}

#[derive(Debug, Deserialize)]
struct NeonOrganizationRecord {
    id: String,
}

#[derive(Debug, Deserialize)]
struct NeonProjectCreateResponse {
    project: Option<NeonProjectRecord>,
    branch: Option<NeonBranchRecord>,
    connection_uris: Option<Vec<NeonConnectionUriRecord>>,
}

#[derive(Debug, Deserialize)]
struct NeonProjectResponse {
    project: Option<NeonProjectRecord>,
}

#[derive(Debug, Deserialize)]
struct NeonProjectBranchesResponse {
    branches: Option<Vec<NeonBranchRecord>>,
}

#[derive(Debug, Deserialize)]
struct NeonBranchCreateResponse {
    branch: Option<NeonBranchRecord>,
}

#[derive(Debug, Deserialize)]
struct NeonConnectionUriRecord {
    connection_uri: String,
}

#[derive(Debug, Deserialize)]
struct NeonProjectRecord {
    id: String,
    name: String,
    org_id: Option<String>,
    default_branch_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct NeonBranchRecord {
    id: String,
    name: String,
    parent_id: Option<String>,
    updated_at: Option<String>,
    default: Option<bool>,
}

#[derive(Debug)]
struct StoredNeonAppState {
    neon_project_id: String,
    neon_development_branch_id: Option<String>,
    neon_preview_branch_id: Option<String>,
}

fn is_test_build() -> bool {
    env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn now_iso_timestamp() -> String {
    let seconds = now_unix_seconds();
    time::OffsetDateTime::from_unix_timestamp(seconds)
        .ok()
        .and_then(|value| {
            value
                .format(&time::format_description::well_known::Rfc3339)
                .ok()
        })
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

fn neon_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct Neon client: {error}"))
}

fn persist_settings_exact(app: &AppHandle, settings: &Value) -> Result<(), String> {
    let file_path = settings_file_path(app)?;
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("failed to serialize settings: {error}"))?;
    fs::write(file_path, serialized).map_err(|error| format!("failed to write settings: {error}"))
}

fn root_object_mut(settings: &mut Value) -> &mut Map<String, Value> {
    if !settings.is_object() {
        *settings = json!({});
    }

    settings
        .as_object_mut()
        .expect("settings root must be object")
}

fn set_neon_tokens(settings: &mut Value, access_token: &str, refresh_token: &str, expires_in: i64) {
    root_object_mut(settings).insert(
        "neon".to_string(),
        json!({
            "accessToken": { "value": access_token },
            "refreshToken": { "value": refresh_token },
            "expiresIn": expires_in,
            "tokenTimestamp": now_unix_seconds(),
        }),
    );
}

fn neon_token_value(secret: &Value) -> Result<String, String> {
    let value = secret
        .get("value")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Neon token value missing".to_string())?;
    let encryption_type = secret
        .get("encryptionType")
        .and_then(Value::as_str)
        .unwrap_or("plaintext");

    match encryption_type {
        "plaintext" => Ok(value.to_string()),
        "electron-safe-storage" => Err(
            "Neon token is stored with electron-safe-storage and cannot yet be decrypted in the Tauri path"
                .to_string(),
        ),
        other => Err(format!("Unsupported Neon token encryption type: {other}")),
    }
}

fn is_token_expired(settings: &Value) -> bool {
    let expires_in = settings
        .get("neon")
        .and_then(|value| value.get("expiresIn"))
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let token_timestamp = settings
        .get("neon")
        .and_then(|value| value.get("tokenTimestamp"))
        .and_then(Value::as_i64)
        .unwrap_or(0);

    if expires_in == 0 || token_timestamp == 0 {
        return true;
    }

    now_unix_seconds() >= token_timestamp + expires_in - 300
}

fn refresh_neon_token(app: &AppHandle) -> Result<(), String> {
    let mut settings = read_settings(app)?;
    let refresh_token = settings
        .get("neon")
        .and_then(|value| value.get("refreshToken"))
        .ok_or_else(|| "Neon refresh token not found. Please authenticate first.".to_string())
        .and_then(neon_token_value)?;

    let client = neon_client()?;
    let response = client
        .post(NEON_REFRESH_URL)
        .header(CONTENT_TYPE, "application/json")
        .json(&json!({ "refreshToken": refresh_token }))
        .send()
        .map_err(|error| format!("failed to refresh Neon token: {error}"))?;

    if !response.status().is_success() {
        return Err(format!("Neon token refresh failed: {}", response.status()));
    }

    let payload = response
        .json::<NeonRefreshResponse>()
        .map_err(|error| format!("failed to parse Neon refresh response: {error}"))?;

    set_neon_tokens(
        &mut settings,
        &payload.access_token,
        &payload.refresh_token,
        payload.expires_in,
    );
    persist_settings_exact(app, &settings)?;

    Ok(())
}

fn neon_access_token(app: &AppHandle) -> Result<String, String> {
    let settings = read_settings(app)?;
    let access_token = settings
        .get("neon")
        .and_then(|value| value.get("accessToken"))
        .ok_or_else(|| "Neon access token not found. Please authenticate first.".to_string())?;

    if is_token_expired(&settings) {
        refresh_neon_token(app)?;
        let refreshed = read_settings(app)?;
        return refreshed
            .get("neon")
            .and_then(|value| value.get("accessToken"))
            .ok_or_else(|| "Failed to refresh Neon access token".to_string())
            .and_then(neon_token_value);
    }

    neon_token_value(access_token)
}

fn neon_api_error(response: Response) -> String {
    let status = response.status();
    match response.json::<Value>() {
        Ok(payload) => payload
            .get("message")
            .and_then(Value::as_str)
            .or_else(|| payload.get("error").and_then(Value::as_str))
            .map(str::to_string)
            .unwrap_or_else(|| format!("Neon API error: {status}")),
        Err(_) => format!("Neon API error: {status}"),
    }
}

fn send_with_locked_retry<F>(mut operation: F) -> Result<Response, String>
where
    F: FnMut() -> Result<Response, String>,
{
    for attempt in 0..=MAX_LOCKED_RETRIES {
        let response = operation()?;
        if response.status().as_u16() != 423 {
            return Ok(response);
        }
        if attempt == MAX_LOCKED_RETRIES {
            return Ok(response);
        }

        let delay_ms = (1000_u64 * 2_u64.pow(attempt)).min(90_000);
        thread::sleep(Duration::from_millis(delay_ms));
    }

    Err("Failed to execute Neon request".to_string())
}

fn get_neon_organization_id(app: &AppHandle) -> Result<String, String> {
    if is_test_build() {
        return Ok("test-org-id".to_string());
    }

    let token = neon_access_token(app)?;
    let client = neon_client()?;
    let response = client
        .get(format!("{NEON_API_BASE}/users/me/organizations"))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("failed to fetch Neon organizations: {error}"))?;

    if !response.status().is_success() {
        return Err(neon_api_error(response));
    }

    let payload = response
        .json::<NeonOrganizationsResponse>()
        .map_err(|error| format!("failed to parse Neon organizations: {error}"))?;

    payload
        .organizations
        .unwrap_or_default()
        .into_iter()
        .next()
        .map(|org| org.id)
        .ok_or_else(|| "No organizations found for this Neon account".to_string())
}

fn load_neon_app_state(app: &AppHandle, app_id: i64) -> Result<StoredNeonAppState, String> {
    let connection = open_db(app)?;
    connection
        .query_row(
            "SELECT neon_project_id, neon_development_branch_id, neon_preview_branch_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok(StoredNeonAppState {
                    neon_project_id: row
                        .get::<_, Option<String>>(0)?
                        .ok_or(rusqlite::Error::QueryReturnedNoRows)?,
                    neon_development_branch_id: row.get(1)?,
                    neon_preview_branch_id: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|error| format!("failed to query Neon app state: {error}"))?
        .ok_or_else(|| "No Neon project found for this app".to_string())
}

fn persist_neon_project_linkage(
    app: &AppHandle,
    app_id: i64,
    project_id: &str,
    development_branch_id: &str,
    preview_branch_id: &str,
) -> Result<(), String> {
    let connection = open_db(app)?;
    let updated = connection
        .execute(
            "UPDATE apps
             SET neon_project_id = ?1,
                 neon_development_branch_id = ?2,
                 neon_preview_branch_id = ?3
             WHERE id = ?4",
            params![project_id, development_branch_id, preview_branch_id, app_id],
        )
        .map_err(|error| format!("failed to persist Neon project linkage: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn neon_create_project(
    app: AppHandle,
    request: NeonCreateProjectRequest,
) -> Result<NeonProjectDto, String> {
    let project_name = request.name.trim();
    if project_name.is_empty() {
        return Err("Project name is required.".to_string());
    }

    if is_test_build() {
        persist_neon_project_linkage(
            &app,
            request.app_id,
            "test-project-id",
            "test-branch-id",
            "test-preview-branch-id",
        )?;

        return Ok(NeonProjectDto {
            id: "test-project-id".to_string(),
            name: project_name.to_string(),
            connection_string: "postgresql://test:test@test.neon.tech/test".to_string(),
            branch_id: "test-branch-id".to_string(),
        });
    }

    let token = neon_access_token(&app)?;
    let org_id = get_neon_organization_id(&app)?;
    let client = neon_client()?;

    let create_project = send_with_locked_retry(|| {
        client
            .post(format!("{NEON_API_BASE}/projects"))
            .header(AUTHORIZATION, format!("Bearer {token}"))
            .header(CONTENT_TYPE, "application/json")
            .json(&json!({
                "project": {
                    "name": project_name,
                    "org_id": org_id,
                }
            }))
            .send()
            .map_err(|error| format!("failed to create Neon project: {error}"))
    })?;

    if !create_project.status().is_success() {
        return Err(neon_api_error(create_project));
    }

    let create_project = create_project
        .json::<NeonProjectCreateResponse>()
        .map_err(|error| format!("failed to parse created Neon project: {error}"))?;

    let project = create_project
        .project
        .ok_or_else(|| "Failed to create Neon project: No project data returned.".to_string())?;
    let connection_string = create_project
        .connection_uris
        .unwrap_or_default()
        .into_iter()
        .next()
        .map(|uri| uri.connection_uri)
        .ok_or_else(|| "Failed to create Neon project: No connection URI returned.".to_string())?;
    let development_branch_id = create_project
        .branch
        .map(|branch| branch.id)
        .or(project.default_branch_id.clone())
        .ok_or_else(|| "Failed to create Neon project: No branch data returned.".to_string())?;

    let create_preview_branch = send_with_locked_retry(|| {
        client
            .post(format!("{NEON_API_BASE}/projects/{}/branches", project.id))
            .header(AUTHORIZATION, format!("Bearer {token}"))
            .header(CONTENT_TYPE, "application/json")
            .json(&json!({
                "endpoints": [{ "type": "read_only" }],
                "branch": {
                    "name": "preview",
                    "parent_id": development_branch_id,
                }
            }))
            .send()
            .map_err(|error| format!("failed to create Neon preview branch: {error}"))
    })?;

    if !create_preview_branch.status().is_success() {
        return Err(neon_api_error(create_preview_branch));
    }

    let preview_branch = create_preview_branch
        .json::<NeonBranchCreateResponse>()
        .map_err(|error| format!("failed to parse created Neon preview branch: {error}"))?
        .branch
        .ok_or_else(|| "Failed to create preview branch: No branch data returned.".to_string())?;

    persist_neon_project_linkage(
        &app,
        request.app_id,
        &project.id,
        &development_branch_id,
        &preview_branch.id,
    )?;

    Ok(NeonProjectDto {
        id: project.id,
        name: project.name,
        connection_string,
        branch_id: development_branch_id,
    })
}

#[tauri::command]
pub fn neon_get_project(
    app: AppHandle,
    request: NeonGetProjectRequest,
) -> Result<NeonProjectDetailsDto, String> {
    let app_state = load_neon_app_state(&app, request.app_id)?;

    if is_test_build() {
        let branches = vec![
            NeonBranchDto {
                branch_id: "test-branch-id".to_string(),
                branch_name: "main".to_string(),
                last_updated: now_iso_timestamp(),
                parent_branch_id: None,
                parent_branch_name: None,
                branch_type: "production".to_string(),
            },
            NeonBranchDto {
                branch_id: "test-preview-branch-id".to_string(),
                branch_name: "preview".to_string(),
                last_updated: now_iso_timestamp(),
                parent_branch_id: Some("test-branch-id".to_string()),
                parent_branch_name: Some("main".to_string()),
                branch_type: "preview".to_string(),
            },
        ];

        return Ok(NeonProjectDetailsDto {
            project_id: app_state.neon_project_id,
            project_name: "Test Project".to_string(),
            org_id: "test-org-id".to_string(),
            branches,
        });
    }

    let token = neon_access_token(&app)?;
    let client = neon_client()?;

    let project_response = client
        .get(format!(
            "{NEON_API_BASE}/projects/{}",
            app_state.neon_project_id
        ))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("failed to fetch Neon project: {error}"))?;

    if !project_response.status().is_success() {
        return Err(neon_api_error(project_response));
    }

    let project = project_response
        .json::<NeonProjectResponse>()
        .map_err(|error| format!("failed to parse Neon project response: {error}"))?
        .project
        .ok_or_else(|| "Failed to get project: No project data returned.".to_string())?;

    let branches_response = client
        .get(format!(
            "{NEON_API_BASE}/projects/{}/branches",
            app_state.neon_project_id
        ))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("failed to list Neon branches: {error}"))?;

    if !branches_response.status().is_success() {
        return Err(neon_api_error(branches_response));
    }

    let branches = branches_response
        .json::<NeonProjectBranchesResponse>()
        .map_err(|error| format!("failed to parse Neon branches response: {error}"))?
        .branches
        .unwrap_or_default();

    let branch_dtos = branches
        .iter()
        .map(|branch| {
            let branch_type = if branch.default.unwrap_or(false) {
                "production"
            } else if app_state
                .neon_development_branch_id
                .as_deref()
                .is_some_and(|value| value == branch.id)
            {
                "development"
            } else if app_state
                .neon_preview_branch_id
                .as_deref()
                .is_some_and(|value| value == branch.id)
            {
                "preview"
            } else {
                "snapshot"
            };

            let parent_branch_name = branch.parent_id.as_ref().and_then(|parent_id| {
                branches
                    .iter()
                    .find(|candidate| candidate.id == *parent_id)
                    .map(|candidate| candidate.name.clone())
            });

            NeonBranchDto {
                branch_id: branch.id.clone(),
                branch_name: branch.name.clone(),
                last_updated: branch.updated_at.clone().unwrap_or_else(now_iso_timestamp),
                parent_branch_id: branch.parent_id.clone(),
                parent_branch_name,
                branch_type: branch_type.to_string(),
            }
        })
        .collect();

    Ok(NeonProjectDetailsDto {
        project_id: project.id,
        project_name: project.name,
        org_id: project
            .org_id
            .unwrap_or_else(|| "<unknown_org_id>".to_string()),
        branches: branch_dtos,
    })
}

#[tauri::command]
pub fn neon_fake_connect(app: AppHandle) -> Result<(), String> {
    let mut settings = read_settings(&app)?;
    set_neon_tokens(
        &mut settings,
        "fake-neon-access-token",
        "fake-neon-refresh-token",
        3600,
    );
    persist_settings_exact(&app, &settings)?;

    app.emit(
        "deep-link-received",
        json!({
            "type": "neon-oauth-return",
            "url": "https://oauth.dyad.sh/api/integrations/neon/login"
        }),
    )
    .map_err(|error| format!("failed to emit Neon deep link: {error}"))?;

    Ok(())
}
