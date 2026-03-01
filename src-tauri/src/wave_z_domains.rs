use crate::core_domains::{read_settings, settings_file_path};
use crate::sqlite_support::open_db;
use reqwest::blocking::Client;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use reqwest::Url;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const SUPABASE_API_BASE: &str = "https://api.supabase.com/v1";
const SUPABASE_REFRESH_URL: &str = "https://supabase-oauth.dyad.sh/api/connect-supabase/refresh";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteOrganizationRequest {
    organization_slug: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBranchesRequest {
    project_id: String,
    organization_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetEdgeLogsRequest {
    project_id: String,
    timestamp_start: Option<i64>,
    app_id: i64,
    organization_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAppProjectRequest {
    app_id: i64,
    project_id: Option<String>,
    parent_project_id: Option<String>,
    organization_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnsetAppProjectRequest {
    app: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FakeConnectAndSetProjectRequest {
    app_id: i64,
    fake_project_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupabaseOrganizationInfoDto {
    organization_slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    owner_email: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupabaseProjectDto {
    id: String,
    name: String,
    region: String,
    organization_slug: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupabaseBranchDto {
    id: String,
    name: String,
    is_default: bool,
    project_ref: String,
    parent_project_ref: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleEntryDto {
    level: String,
    #[serde(rename = "type")]
    entry_type: String,
    message: String,
    timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_name: Option<String>,
    app_id: i64,
}

#[derive(Debug, Deserialize)]
struct RefreshResponse {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "refreshToken")]
    refresh_token: String,
    #[serde(rename = "expiresIn")]
    expires_in: i64,
}

#[derive(Debug, Deserialize)]
struct SupabaseOrganizationDetailsRecord {
    name: String,
    slug: String,
}

#[derive(Debug, Deserialize)]
struct SupabaseOrganizationMemberRecord {
    primary_email: Option<String>,
    email: String,
    role_name: String,
}

#[derive(Debug, Deserialize)]
struct SupabaseProjectRecord {
    id: String,
    name: String,
    region: String,
    organization_id: String,
    organization_slug: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SupabaseBranchRecord {
    id: String,
    name: String,
    is_default: bool,
    project_ref: String,
    parent_project_ref: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SupabaseProjectLogsResponse {
    result: Option<Vec<SupabaseProjectLogRecord>>,
}

#[derive(Debug, Deserialize)]
struct SupabaseProjectLogRecord {
    timestamp: i64,
    event_message: String,
    metadata: Option<Vec<SupabaseLogMetadata>>,
}

#[derive(Debug, Deserialize)]
struct SupabaseLogMetadata {
    level: Option<String>,
}

fn is_test_build() -> bool {
    std::env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn now_unix_seconds() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or(0)
}

fn persist_settings_exact(app: &AppHandle, settings: &Value) -> Result<(), String> {
    let file_path = settings_file_path(app)?;
    let serialized = serde_json::to_string_pretty(settings)
        .map_err(|error| format!("failed to serialize settings: {error}"))?;
    fs::write(file_path, serialized).map_err(|error| format!("failed to write settings: {error}"))
}

fn supabase_root_mut<'a>(settings: &'a mut Value) -> &'a mut Map<String, Value> {
    if !settings.is_object() {
        *settings = json!({});
    }

    let root = settings
        .as_object_mut()
        .expect("settings root must be object");
    if !root.contains_key("supabase") || !root.get("supabase").unwrap().is_object() {
        root.insert("supabase".to_string(), json!({}));
    }

    root.get_mut("supabase")
        .and_then(Value::as_object_mut)
        .expect("supabase root must be object")
}

fn organizations_object_mut<'a>(settings: &'a mut Value) -> &'a mut Map<String, Value> {
    let supabase = supabase_root_mut(settings);
    if !supabase.contains_key("organizations")
        || !supabase.get("organizations").unwrap().is_object()
    {
        supabase.insert("organizations".to_string(), json!({}));
    }

    supabase
        .get_mut("organizations")
        .and_then(Value::as_object_mut)
        .expect("organizations must be object")
}

fn token_value(secret: &Value) -> Result<String, String> {
    let value = secret
        .get("value")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Supabase token value missing".to_string())?;
    let encryption_type = secret
        .get("encryptionType")
        .and_then(Value::as_str)
        .unwrap_or("plaintext");

    match encryption_type {
        "plaintext" => Ok(value.to_string()),
        "electron-safe-storage" => Err(
            "Supabase token is stored with electron-safe-storage and cannot yet be decrypted in the Tauri path"
                .to_string(),
        ),
        other => Err(format!("Unsupported Supabase token encryption type: {other}")),
    }
}

fn org_settings<'a>(settings: &'a Value, organization_slug: &str) -> Result<&'a Value, String> {
    settings
        .get("supabase")
        .and_then(|value| value.get("organizations"))
        .and_then(|value| value.get(organization_slug))
        .ok_or_else(|| format!("Supabase organization {organization_slug} not found"))
}

fn org_access_token(settings: &Value, organization_slug: &str) -> Result<String, String> {
    let organization = org_settings(settings, organization_slug)?;
    let access_token = organization
        .get("accessToken")
        .ok_or_else(|| format!("Supabase access token missing for {organization_slug}"))?;
    token_value(access_token)
}

fn refresh_supabase_org_token(app: &AppHandle, organization_slug: &str) -> Result<String, String> {
    let mut settings = read_settings(app)?;
    let organization = org_settings(&settings, organization_slug)?;
    let refresh_token = organization
        .get("refreshToken")
        .ok_or_else(|| format!("Supabase refresh token missing for {organization_slug}"))?;
    let refresh_token = token_value(refresh_token)?;

    let client = Client::new();
    let response = client
        .post(SUPABASE_REFRESH_URL)
        .header(CONTENT_TYPE, "application/json")
        .json(&json!({ "refreshToken": refresh_token }))
        .send()
        .map_err(|error| format!("failed to refresh Supabase token: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "Supabase token refresh failed: {}",
            response.status()
        ));
    }

    let payload = response
        .json::<RefreshResponse>()
        .map_err(|error| format!("failed to parse Supabase refresh response: {error}"))?;

    let organizations = organizations_object_mut(&mut settings);
    organizations.insert(
        organization_slug.to_string(),
        json!({
            "accessToken": { "value": payload.access_token },
            "refreshToken": { "value": payload.refresh_token },
            "expiresIn": payload.expires_in,
            "tokenTimestamp": now_unix_seconds(),
        }),
    );
    persist_settings_exact(app, &settings)?;

    Ok(settings
        .get("supabase")
        .and_then(|value| value.get("organizations"))
        .and_then(|value| value.get(organization_slug))
        .and_then(|value| value.get("accessToken"))
        .ok_or_else(|| "Failed to persist refreshed Supabase token".to_string())
        .and_then(token_value)?)
}

fn is_org_token_expired(org: &Value) -> bool {
    let expires_in = org.get("expiresIn").and_then(Value::as_i64).unwrap_or(0);
    let token_timestamp = org
        .get("tokenTimestamp")
        .and_then(Value::as_i64)
        .unwrap_or(0);

    if expires_in == 0 || token_timestamp == 0 {
        return true;
    }

    now_unix_seconds() >= token_timestamp + expires_in - 300
}

fn supabase_access_token(
    app: &AppHandle,
    organization_slug: Option<&str>,
) -> Result<String, String> {
    let settings = read_settings(app)?;

    if let Some(organization_slug) = organization_slug {
        let organization = org_settings(&settings, organization_slug)?;
        if is_org_token_expired(organization) {
            return refresh_supabase_org_token(app, organization_slug);
        }
        return org_access_token(&settings, organization_slug);
    }

    let access_token = settings
        .get("supabase")
        .and_then(|value| value.get("accessToken"))
        .ok_or_else(|| "Supabase access token not found. Please authenticate first.".to_string())?;

    token_value(access_token)
}

fn supabase_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct Supabase client: {error}"))
}

fn send_supabase_get(
    client: &Client,
    token: &str,
    url: &str,
) -> Result<reqwest::blocking::Response, String> {
    client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("Supabase request failed: {error}"))
}

fn extract_function_name(event_message: &str) -> Option<String> {
    let start = event_message.strip_prefix('[')?;
    let end = start.find(']')?;
    Some(start[..end].to_string())
}

#[tauri::command]
pub fn supabase_list_organizations(
    app: AppHandle,
) -> Result<Vec<SupabaseOrganizationInfoDto>, String> {
    let settings = read_settings(&app)?;
    let organizations = settings
        .get("supabase")
        .and_then(|value| value.get("organizations"))
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    let client = supabase_client()?;
    let mut results = Vec::new();

    for organization_slug in organizations.keys() {
        if is_test_build() {
            results.push(SupabaseOrganizationInfoDto {
                organization_slug: organization_slug.to_string(),
                name: Some("Fake Organization".to_string()),
                owner_email: Some("owner@example.com".to_string()),
            });
            continue;
        }

        let token = match supabase_access_token(&app, Some(organization_slug)) {
            Ok(token) => token,
            Err(_) => {
                results.push(SupabaseOrganizationInfoDto {
                    organization_slug: organization_slug.to_string(),
                    name: None,
                    owner_email: None,
                });
                continue;
            }
        };

        let details_url = format!("{SUPABASE_API_BASE}/organizations/{organization_slug}");
        let members_url = format!("{SUPABASE_API_BASE}/organizations/{organization_slug}/members");
        let details = send_supabase_get(&client, &token, &details_url).and_then(|response| {
            if !response.status().is_success() {
                return Err(format!("Supabase API error: {}", response.status()));
            }
            response
                .json::<SupabaseOrganizationDetailsRecord>()
                .map_err(|error| format!("Failed to parse Supabase organization details: {error}"))
        });
        let members = send_supabase_get(&client, &token, &members_url).and_then(|response| {
            if !response.status().is_success() {
                return Err(format!("Supabase API error: {}", response.status()));
            }
            response
                .json::<Vec<SupabaseOrganizationMemberRecord>>()
                .map_err(|error| format!("Failed to parse Supabase organization members: {error}"))
        });

        match (details, members) {
            (Ok(details), Ok(members)) => {
                let owner = members.iter().find(|member| member.role_name == "Owner");
                results.push(SupabaseOrganizationInfoDto {
                    organization_slug: details.slug,
                    name: Some(details.name),
                    owner_email: owner.map(|owner| {
                        owner
                            .primary_email
                            .clone()
                            .unwrap_or_else(|| owner.email.clone())
                    }),
                });
            }
            _ => {
                results.push(SupabaseOrganizationInfoDto {
                    organization_slug: organization_slug.to_string(),
                    name: None,
                    owner_email: None,
                });
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn supabase_delete_organization(
    app: AppHandle,
    request: DeleteOrganizationRequest,
) -> Result<(), String> {
    let mut settings = read_settings(&app)?;
    let organizations = organizations_object_mut(&mut settings);
    if organizations.remove(&request.organization_slug).is_none() {
        return Err(format!(
            "Supabase organization {} not found",
            request.organization_slug
        ));
    }

    persist_settings_exact(&app, &settings)
}

#[tauri::command]
pub fn supabase_list_all_projects(app: AppHandle) -> Result<Vec<SupabaseProjectDto>, String> {
    let settings = read_settings(&app)?;
    let organizations = settings
        .get("supabase")
        .and_then(|value| value.get("organizations"))
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    let client = supabase_client()?;
    let mut projects = Vec::new();

    for organization_slug in organizations.keys() {
        if is_test_build() {
            projects.push(SupabaseProjectDto {
                id: "fake-project-id".to_string(),
                name: "Fake Supabase Project".to_string(),
                region: "us-east-1".to_string(),
                organization_slug: organization_slug.to_string(),
            });
            continue;
        }

        let token = match supabase_access_token(&app, Some(organization_slug)) {
            Ok(token) => token,
            Err(_) => continue,
        };

        let response =
            send_supabase_get(&client, &token, &format!("{SUPABASE_API_BASE}/projects"))?;
        if !response.status().is_success() {
            continue;
        }

        let items = match response.json::<Vec<SupabaseProjectRecord>>() {
            Ok(items) => items,
            Err(_) => continue,
        };

        for project in items {
            let project_org = project
                .organization_slug
                .unwrap_or(project.organization_id.clone());
            projects.push(SupabaseProjectDto {
                id: project.id,
                name: project.name,
                region: project.region,
                organization_slug: project_org,
            });
        }
    }

    Ok(projects)
}

#[tauri::command]
pub fn supabase_list_branches(
    app: AppHandle,
    request: ListBranchesRequest,
) -> Result<Vec<SupabaseBranchDto>, String> {
    if is_test_build() {
        return Ok(vec![
            SupabaseBranchDto {
                id: "default-branch-id".to_string(),
                name: "Default Branch".to_string(),
                is_default: true,
                project_ref: "fake-project-id".to_string(),
                parent_project_ref: Some("fake-project-id".to_string()),
            },
            SupabaseBranchDto {
                id: "test-branch-id".to_string(),
                name: "Test Branch".to_string(),
                is_default: false,
                project_ref: "test-branch-project-id".to_string(),
                parent_project_ref: Some("fake-project-id".to_string()),
            },
        ]);
    }

    let token = supabase_access_token(&app, request.organization_slug.as_deref())?;
    let client = supabase_client()?;
    let response = send_supabase_get(
        &client,
        &token,
        &format!(
            "{SUPABASE_API_BASE}/projects/{}/branches",
            request.project_id
        ),
    )?;

    if response.status().as_u16() == 403 {
        return Err("Branches are only supported for Supabase paid customers".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "Failed to list Supabase branches: {}",
            response.status()
        ));
    }

    let branches = response
        .json::<Vec<SupabaseBranchRecord>>()
        .map_err(|error| format!("Failed to parse Supabase branches: {error}"))?;

    Ok(branches
        .into_iter()
        .map(|branch| SupabaseBranchDto {
            id: branch.id,
            name: branch.name,
            is_default: branch.is_default,
            project_ref: branch.project_ref,
            parent_project_ref: branch.parent_project_ref,
        })
        .collect())
}

#[tauri::command]
pub fn supabase_get_edge_logs(
    app: AppHandle,
    request: GetEdgeLogsRequest,
) -> Result<Vec<ConsoleEntryDto>, String> {
    if is_test_build() {
        return Ok(Vec::new());
    }

    let token = supabase_access_token(&app, request.organization_slug.as_deref())?;
    let client = supabase_client()?;

    let now_millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0);
    let iso_timestamp_end = chrono_like_iso(now_millis)?;
    let iso_timestamp_start = chrono_like_iso(
        request
            .timestamp_start
            .unwrap_or(now_millis - 10 * 60 * 1000),
    )?;

    let mut url = Url::parse(&format!(
        "{SUPABASE_API_BASE}/projects/{}/analytics/endpoints/logs.all",
        request.project_id
    ))
    .map_err(|error| format!("failed to build Supabase logs url: {error}"))?;
    let sql = if let Some(timestamp_start) = request.timestamp_start {
        format!(
            "SELECT \n  timestamp,\n  event_message,\n  metadata\nFROM function_logs\nWHERE timestamp > TIMESTAMP_MICROS({})\nORDER BY timestamp ASC\nLIMIT 1000",
            timestamp_start * 1000
        )
    } else {
        "SELECT \n  timestamp,\n  event_message,\n  metadata\nFROM function_logs\nORDER BY timestamp ASC\nLIMIT 1000".to_string()
    };
    url.query_pairs_mut()
        .append_pair("sql", &sql)
        .append_pair("iso_timestamp_start", &iso_timestamp_start)
        .append_pair("iso_timestamp_end", &iso_timestamp_end);

    let response = send_supabase_get(&client, &token, url.as_str())?;
    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch Supabase logs: {}",
            response.status()
        ));
    }

    let logs = response
        .json::<SupabaseProjectLogsResponse>()
        .map_err(|error| format!("Failed to parse Supabase logs: {error}"))?
        .result
        .unwrap_or_default();

    Ok(logs
        .into_iter()
        .map(|log_entry| {
            let metadata = log_entry.metadata.unwrap_or_default();
            let level = metadata
                .first()
                .and_then(|metadata| metadata.level.clone())
                .unwrap_or_else(|| "info".to_string());
            ConsoleEntryDto {
                level: match level.as_str() {
                    "error" => "error".to_string(),
                    "warn" => "warn".to_string(),
                    _ => "info".to_string(),
                },
                entry_type: "edge-function".to_string(),
                message: log_entry.event_message.clone(),
                timestamp: log_entry.timestamp / 1000,
                source_name: extract_function_name(&log_entry.event_message),
                app_id: request.app_id,
            }
        })
        .collect())
}

#[tauri::command]
pub fn supabase_set_app_project(
    app: AppHandle,
    request: SetAppProjectRequest,
) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE apps
             SET supabase_project_id = ?1,
                 supabase_parent_project_id = ?2,
                 supabase_organization_slug = ?3
             WHERE id = ?4",
            params![
                request.project_id,
                request.parent_project_id,
                request.organization_slug,
                request.app_id
            ],
        )
        .map_err(|error| format!("failed to set Supabase app project: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn supabase_unset_app_project(
    app: AppHandle,
    request: UnsetAppProjectRequest,
) -> Result<(), String> {
    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE apps
             SET supabase_project_id = NULL,
                 supabase_parent_project_id = NULL,
                 supabase_organization_slug = NULL
             WHERE id = ?1",
            params![request.app],
        )
        .map_err(|error| format!("failed to unset Supabase app project: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn supabase_fake_connect_and_set_project(
    app: AppHandle,
    request: FakeConnectAndSetProjectRequest,
) -> Result<(), String> {
    let fake_org_id = "fake-org-id";
    let mut settings = read_settings(&app)?;
    let organizations = organizations_object_mut(&mut settings);
    organizations.insert(
        fake_org_id.to_string(),
        json!({
            "accessToken": { "value": "fake-access-token" },
            "refreshToken": { "value": "fake-refresh-token" },
            "expiresIn": 3600,
            "tokenTimestamp": now_unix_seconds(),
        }),
    );
    persist_settings_exact(&app, &settings)?;

    let connection = open_db(&app)?;
    connection
        .execute(
            "UPDATE apps
             SET supabase_project_id = ?1,
                 supabase_organization_slug = ?2
             WHERE id = ?3",
            params![request.fake_project_id, fake_org_id, request.app_id],
        )
        .map_err(|error| format!("failed to set fake Supabase project: {error}"))?;

    app.emit(
        "deep-link-received",
        json!({
            "type": "supabase-oauth-return",
            "url": "https://supabase-oauth.dyad.sh/api/connect-supabase/login"
        }),
    )
    .map_err(|error| format!("failed to emit Supabase deep link: {error}"))?;

    Ok(())
}

fn chrono_like_iso(timestamp_millis: i64) -> Result<String, String> {
    let seconds = timestamp_millis.div_euclid(1000);
    let milliseconds = timestamp_millis.rem_euclid(1000);
    let datetime = time::OffsetDateTime::from_unix_timestamp(seconds)
        .map_err(|error| format!("failed to build timestamp: {error}"))?
        .replace_millisecond(milliseconds as u16)
        .map_err(|error| format!("failed to build timestamp millis: {error}"))?;
    Ok(datetime
        .format(&time::format_description::well_known::Rfc3339)
        .map_err(|error| format!("failed to format timestamp: {error}"))?)
}
