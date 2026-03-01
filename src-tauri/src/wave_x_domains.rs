use crate::core_domains::read_settings;
use crate::sqlite_support::{open_db, resolve_workspace_app_path};
use reqwest::blocking::{Client, Response};
use reqwest::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const VERCEL_API_BASE: &str = "https://api.vercel.com";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VercelCreateProjectRequest {
    name: String,
    app_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VercelConnectExistingProjectRequest {
    app_id: i64,
    project_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VercelAppRequest {
    app_id: i64,
}

#[derive(Debug, Deserialize)]
struct VercelProjectsEnvelope {
    projects: Option<Vec<VercelProjectRecord>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VercelProjectRecord {
    id: String,
    name: String,
    targets: Option<VercelProjectTargets>,
}

#[derive(Debug, Deserialize)]
struct VercelProjectTargets {
    production: Option<VercelProjectProductionTarget>,
}

#[derive(Debug, Deserialize)]
struct VercelProjectProductionTarget {
    url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct VercelTeamsEnvelope {
    teams: Option<Vec<VercelTeamRecord>>,
}

#[derive(Debug, Deserialize)]
struct VercelTeamRecord {
    id: String,
}

#[derive(Debug, Deserialize)]
struct VercelDomainsEnvelope {
    domains: Option<Vec<VercelDomainRecord>>,
}

#[derive(Debug, Deserialize)]
struct VercelDomainRecord {
    name: String,
}

#[derive(Debug, Deserialize)]
struct VercelCreateProjectResponse {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
struct VercelDeploymentsEnvelope {
    deployments: Option<Vec<VercelDeploymentRecord>>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct VercelDeploymentRecord {
    uid: String,
    url: String,
    state: Option<String>,
    created_at: Option<i64>,
    target: Option<String>,
    ready_state: Option<String>,
}

#[derive(Debug)]
struct AppVercelContext {
    github_org: Option<String>,
    github_repo: Option<String>,
    github_branch: Option<String>,
    app_path: PathBuf,
    vercel_project_id: Option<String>,
}

fn is_test_build() -> bool {
    env::var("E2E_TEST_BUILD")
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn vercel_api_base() -> String {
    if is_test_build() {
        let port = env::var("FAKE_LLM_PORT").unwrap_or_else(|_| "3500".to_string());
        format!("http://localhost:{port}/vercel/api")
    } else {
        VERCEL_API_BASE.to_string()
    }
}

fn http_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Chaemera-Tauri")
        .build()
        .map_err(|error| format!("failed to construct http client: {error}"))
}

fn vercel_token(app: &AppHandle) -> Result<String, String> {
    let settings = read_settings(app)?;
    settings
        .get("vercelAccessToken")
        .and_then(|value| value.get("value"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "Not authenticated with Vercel.".to_string())
}

fn vercel_api_error(response: Response) -> String {
    let status = response.status();
    match response.json::<Value>() {
        Ok(payload) => payload
            .get("error")
            .and_then(Value::as_str)
            .or_else(|| payload.get("message").and_then(Value::as_str))
            .map(str::to_string)
            .unwrap_or_else(|| format!("Vercel API error: {status}")),
        Err(_) => format!("Vercel API error: {status}"),
    }
}

fn fetch_vercel_projects(
    client: &Client,
    token: &str,
    search: Option<&str>,
) -> Result<Vec<VercelProjectRecord>, String> {
    let mut request = client
        .get(format!("{}/v9/projects", vercel_api_base()))
        .header(AUTHORIZATION, format!("Bearer {token}"));

    if let Some(search) = search {
        request = request.query(&[("search", search)]);
    }

    let response = request
        .send()
        .map_err(|error| format!("Failed to fetch Vercel projects: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    let payload = response
        .json::<VercelProjectsEnvelope>()
        .map_err(|error| format!("Failed to parse Vercel projects: {error}"))?;
    Ok(payload.projects.unwrap_or_default())
}

fn get_default_team_id(client: &Client, token: &str) -> Result<String, String> {
    let response = client
        .get(format!("{}/v2/teams?limit=1", vercel_api_base()))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("Failed to fetch teams: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    let payload = response
        .json::<VercelTeamsEnvelope>()
        .map_err(|error| format!("Failed to parse teams: {error}"))?;
    payload
        .teams
        .unwrap_or_default()
        .into_iter()
        .next()
        .map(|team| team.id)
        .ok_or_else(|| "No teams found for this user".to_string())
}

fn get_project_domain(
    client: &Client,
    token: &str,
    project_id: &str,
) -> Result<Option<String>, String> {
    let response = client
        .get(format!(
            "{}/v9/projects/{}/domains?limit=1",
            vercel_api_base(),
            project_id
        ))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .map_err(|error| format!("Failed to fetch project domains: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    let payload = response
        .json::<VercelDomainsEnvelope>()
        .map_err(|error| format!("Failed to parse project domains: {error}"))?;
    Ok(payload
        .domains
        .unwrap_or_default()
        .into_iter()
        .next()
        .map(|domain| format!("https://{}", domain.name)))
}

fn detect_framework(app_path: &Path) -> Option<String> {
    let config_files = [
        ("next.config.js", "nextjs"),
        ("next.config.mjs", "nextjs"),
        ("next.config.ts", "nextjs"),
        ("vite.config.js", "vite"),
        ("vite.config.ts", "vite"),
        ("vite.config.mjs", "vite"),
        ("nuxt.config.js", "nuxtjs"),
        ("nuxt.config.ts", "nuxtjs"),
        ("astro.config.js", "astro"),
        ("astro.config.mjs", "astro"),
        ("astro.config.ts", "astro"),
        ("svelte.config.js", "svelte"),
    ];

    for (file, framework) in config_files {
        if app_path.join(file).exists() {
            return Some(framework.to_string());
        }
    }

    let package_json_path = app_path.join("package.json");
    if !package_json_path.exists() {
        return None;
    }

    let package_json = fs::read_to_string(package_json_path).ok()?;
    let package_json = serde_json::from_str::<Value>(&package_json).ok()?;
    let dependencies = package_json
        .get("dependencies")
        .and_then(Value::as_object)
        .into_iter()
        .chain(
            package_json
                .get("devDependencies")
                .and_then(Value::as_object)
                .into_iter(),
        )
        .flat_map(|dependencies| dependencies.keys())
        .map(String::as_str)
        .collect::<Vec<_>>();

    if dependencies.contains(&"next") {
        return Some("nextjs".to_string());
    }
    if dependencies.contains(&"vite") {
        return Some("vite".to_string());
    }
    if dependencies.contains(&"nuxt") {
        return Some("nuxtjs".to_string());
    }
    if dependencies.contains(&"astro") {
        return Some("astro".to_string());
    }
    if dependencies.contains(&"svelte") {
        return Some("svelte".to_string());
    }
    if dependencies.contains(&"@angular/core") {
        return Some("angular".to_string());
    }
    if dependencies.contains(&"vue") {
        return Some("vue".to_string());
    }
    if dependencies.contains(&"react-scripts") {
        return Some("create-react-app".to_string());
    }
    if dependencies.contains(&"gatsby") {
        return Some("gatsby".to_string());
    }
    if dependencies.contains(&"remix") {
        return Some("remix".to_string());
    }

    None
}

fn app_vercel_context(app: &AppHandle, app_id: i64) -> Result<AppVercelContext, String> {
    let connection = open_db(app)?;
    let row = connection
        .query_row(
            "SELECT path, github_org, github_repo, github_branch, vercel_project_id
             FROM apps
             WHERE id = ?1",
            params![app_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, Option<String>>(4)?,
                ))
            },
        )
        .optional()
        .map_err(|error| format!("failed to query Vercel app context: {error}"))?
        .ok_or_else(|| "App not found.".to_string())?;

    Ok(AppVercelContext {
        app_path: resolve_workspace_app_path(&row.0)?,
        github_org: row.1,
        github_repo: row.2,
        github_branch: row.3,
        vercel_project_id: row.4,
    })
}

fn update_app_vercel_project(
    app: &AppHandle,
    app_id: i64,
    project_id: &str,
    project_name: &str,
    team_id: &str,
    deployment_url: Option<&str>,
) -> Result<(), String> {
    let connection = open_db(app)?;
    let updated = connection
        .execute(
            "UPDATE apps
             SET vercel_project_id = ?1,
                 vercel_project_name = ?2,
                 vercel_team_id = ?3,
                 vercel_deployment_url = ?4
             WHERE id = ?5",
            params![project_id, project_name, team_id, deployment_url, app_id],
        )
        .map_err(|error| format!("failed to update Vercel project linkage: {error}"))?;

    if updated == 0 {
        return Err("App not found.".to_string());
    }

    Ok(())
}

fn disconnect_app_vercel_project(app: &AppHandle, app_id: i64) -> Result<(), String> {
    let connection = open_db(app)?;
    let updated = connection
        .execute(
            "UPDATE apps
             SET vercel_project_id = NULL,
                 vercel_project_name = NULL,
                 vercel_team_id = NULL,
                 vercel_deployment_url = NULL
             WHERE id = ?1",
            params![app_id],
        )
        .map_err(|error| format!("failed to disconnect Vercel project: {error}"))?;

    if updated == 0 {
        return Err("App not found".to_string());
    }

    Ok(())
}

fn trigger_initial_deployment(
    client: &Client,
    token: &str,
    project_id: &str,
    project_name: &str,
    github_org: &str,
    github_repo: &str,
    github_branch: &str,
) -> Result<(), String> {
    let response = client
        .post(format!("{}/v13/deployments", vercel_api_base()))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/json")
        .header(CONTENT_TYPE, "application/json")
        .json(&json!({
            "name": project_name,
            "project": project_id,
            "target": "production",
            "gitSource": {
                "type": "github",
                "org": github_org,
                "repo": github_repo,
                "ref": github_branch,
            },
        }))
        .send()
        .map_err(|error| format!("Failed to trigger Vercel deployment: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    Ok(())
}

#[tauri::command]
pub fn vercel_create_project(
    app: AppHandle,
    request: VercelCreateProjectRequest,
) -> Result<(), String> {
    let token = vercel_token(&app)?;
    let client = http_client()?;
    let app_context = app_vercel_context(&app, request.app_id)?;
    let github_org = app_context.github_org.ok_or_else(|| {
        "App must be connected to a GitHub repository before creating a Vercel project.".to_string()
    })?;
    let github_repo = app_context.github_repo.ok_or_else(|| {
        "App must be connected to a GitHub repository before creating a Vercel project.".to_string()
    })?;
    let project_name = request.name.trim();
    if project_name.is_empty() {
        return Err("Project name is required.".to_string());
    }

    let response = client
        .post(format!("{}/v11/projects", vercel_api_base()))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .header(ACCEPT, "application/json")
        .header(CONTENT_TYPE, "application/json")
        .json(&json!({
            "name": project_name,
            "gitRepository": {
                "type": "github",
                "repo": format!("{github_org}/{github_repo}"),
            },
            "framework": detect_framework(&app_context.app_path),
        }))
        .send()
        .map_err(|error| format!("Failed to create Vercel project: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    let project = response
        .json::<VercelCreateProjectResponse>()
        .map_err(|error| format!("Failed to parse created Vercel project: {error}"))?;
    let team_id = get_default_team_id(&client, &token)?;
    let deployment_url = get_project_domain(&client, &token, &project.id)
        .ok()
        .flatten();

    update_app_vercel_project(
        &app,
        request.app_id,
        &project.id,
        &project.name,
        &team_id,
        deployment_url.as_deref(),
    )?;

    let github_branch = app_context
        .github_branch
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("main");
    let _ = trigger_initial_deployment(
        &client,
        &token,
        &project.id,
        &project.name,
        &github_org,
        &github_repo,
        github_branch,
    );

    Ok(())
}

#[tauri::command]
pub fn vercel_connect_existing_project(
    app: AppHandle,
    request: VercelConnectExistingProjectRequest,
) -> Result<(), String> {
    let token = vercel_token(&app)?;
    let client = http_client()?;
    let project = fetch_vercel_projects(&client, &token, None)?
        .into_iter()
        .find(|project| project.id == request.project_id || project.name == request.project_id)
        .ok_or_else(|| "Project not found. Please check the project ID.".to_string())?;
    let team_id = get_default_team_id(&client, &token)?;
    let deployment_url = project
        .targets
        .and_then(|targets| targets.production)
        .and_then(|production| production.url)
        .map(|url| format!("https://{url}"));

    update_app_vercel_project(
        &app,
        request.app_id,
        &project.id,
        &project.name,
        &team_id,
        deployment_url.as_deref(),
    )
}

#[tauri::command]
pub fn vercel_get_deployments(app: AppHandle, request: VercelAppRequest) -> Result<Value, String> {
    let token = vercel_token(&app)?;
    let client = http_client()?;
    let app_context = app_vercel_context(&app, request.app_id)?;
    let project_id = app_context
        .vercel_project_id
        .ok_or_else(|| "App is not linked to a Vercel project.".to_string())?;

    let response = client
        .get(format!("{}/v6/deployments", vercel_api_base()))
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .query(&[("projectId", project_id.as_str()), ("limit", "5")])
        .send()
        .map_err(|error| format!("Failed to fetch Vercel deployments: {error}"))?;

    if !response.status().is_success() {
        return Err(vercel_api_error(response));
    }

    let deployments = response
        .json::<VercelDeploymentsEnvelope>()
        .map_err(|error| format!("Failed to parse Vercel deployments: {error}"))?
        .deployments
        .unwrap_or_default();

    if let Some(deployment_url) = deployments
        .iter()
        .find(|deployment| {
            deployment.ready_state.as_deref() == Some("READY")
                && deployment.target.as_deref() == Some("production")
        })
        .map(|deployment| format!("https://{}", deployment.url))
    {
        let connection = open_db(&app)?;
        connection
            .execute(
                "UPDATE apps SET vercel_deployment_url = ?1 WHERE id = ?2",
                params![deployment_url, request.app_id],
            )
            .map_err(|error| format!("failed to update Vercel deployment URL: {error}"))?;
    }

    serde_json::to_value(
        deployments
            .into_iter()
            .map(|deployment| {
                json!({
                    "uid": deployment.uid,
                    "url": deployment.url,
                    "state": deployment.state.unwrap_or_else(|| "unknown".to_string()),
                    "createdAt": deployment.created_at.unwrap_or(0),
                    "target": deployment.target.unwrap_or_else(|| "production".to_string()),
                    "readyState": deployment.ready_state.unwrap_or_else(|| "unknown".to_string()),
                })
            })
            .collect::<Vec<_>>(),
    )
    .map_err(|error| format!("Failed to serialize Vercel deployments: {error}"))
}

#[tauri::command]
pub fn vercel_disconnect(app: AppHandle, request: VercelAppRequest) -> Result<(), String> {
    disconnect_app_vercel_project(&app, request.app_id)
}
