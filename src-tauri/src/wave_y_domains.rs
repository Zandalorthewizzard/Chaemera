use crate::sqlite_support::{now_unix_timestamp, open_db};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::OnceLock;
use tauri::AppHandle;

const CUSTOM_PROVIDER_PREFIX: &str = "custom::";
const LANGUAGE_MODEL_CATALOG_JSON: &str = include_str!("../catalog_assets/language_models.json");
const HARD_CODED_PROVIDER_ORDER: &[&str] = &[
    "openai",
    "anthropic",
    "google",
    "vertex",
    "openrouter",
    "auto",
    "azure",
    "xai",
    "bedrock",
    "ollama",
    "lmstudio",
];

#[derive(Debug, Deserialize)]
struct LanguageModelCatalog {
    #[serde(rename = "MODEL_OPTIONS")]
    model_options: HashMap<String, Vec<CatalogModel>>,
    #[serde(rename = "PROVIDER_TO_ENV_VAR")]
    provider_to_env_var: HashMap<String, String>,
    #[serde(rename = "CLOUD_PROVIDERS")]
    cloud_providers: HashMap<String, CatalogProviderDetails>,
    #[serde(rename = "LOCAL_PROVIDERS")]
    local_providers: HashMap<String, CatalogLocalProviderDetails>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogModel {
    name: String,
    display_name: String,
    description: String,
    tag: Option<String>,
    tag_color: Option<String>,
    max_output_tokens: Option<i64>,
    context_window: Option<i64>,
    temperature: Option<f64>,
    dollar_signs: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogProviderDetails {
    display_name: String,
    has_free_tier: Option<bool>,
    website_url: Option<String>,
    gateway_prefix: String,
    secondary: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CatalogLocalProviderDetails {
    display_name: String,
    has_free_tier: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LanguageModelProviderDto {
    id: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    has_free_tier: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    website_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    gateway_prefix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    secondary: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    env_var_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    api_base_url: Option<String>,
    #[serde(rename = "type")]
    provider_type: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LanguageModelDto {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    api_name: String,
    display_name: String,
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tag_color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_output_tokens: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    context_window: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dollar_signs: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "type")]
    model_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetLanguageModelsRequest {
    provider_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomLanguageModelProviderRequest {
    id: String,
    name: String,
    api_base_url: String,
    env_var_name: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCustomLanguageModelProviderRequest {
    provider_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCustomLanguageModelRequest {
    api_name: String,
    display_name: String,
    provider_id: String,
    description: Option<String>,
    max_output_tokens: Option<i64>,
    context_window: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCustomModelRequest {
    provider_id: String,
    model_api_name: String,
}

fn language_model_catalog() -> &'static LanguageModelCatalog {
    static CATALOG: OnceLock<LanguageModelCatalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(LANGUAGE_MODEL_CATALOG_JSON)
            .expect("language model catalog asset must be valid JSON")
    })
}

fn trim_to_none(value: Option<String>) -> Option<String> {
    value.and_then(|candidate| {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn hardcoded_language_model_providers() -> Vec<LanguageModelProviderDto> {
    let catalog = language_model_catalog();
    let mut providers = Vec::new();

    for provider_id in HARD_CODED_PROVIDER_ORDER {
        if let Some(provider) = catalog.cloud_providers.get(*provider_id) {
            providers.push(LanguageModelProviderDto {
                id: provider_id.to_string(),
                name: provider.display_name.clone(),
                has_free_tier: provider.has_free_tier,
                website_url: provider.website_url.clone(),
                gateway_prefix: Some(provider.gateway_prefix.clone()),
                secondary: provider.secondary,
                env_var_name: catalog.provider_to_env_var.get(*provider_id).cloned(),
                api_base_url: None,
                provider_type: "cloud".to_string(),
            });
            continue;
        }

        if let Some(provider) = catalog.local_providers.get(*provider_id) {
            providers.push(LanguageModelProviderDto {
                id: provider_id.to_string(),
                name: provider.display_name.clone(),
                has_free_tier: Some(provider.has_free_tier),
                website_url: None,
                gateway_prefix: None,
                secondary: None,
                env_var_name: None,
                api_base_url: None,
                provider_type: "local".to_string(),
            });
        }
    }

    providers
}

fn custom_language_model_providers(
    connection: Option<&Connection>,
) -> Result<Vec<LanguageModelProviderDto>, String> {
    let Some(connection) = connection else {
        return Ok(Vec::new());
    };

    let mut statement = connection
        .prepare(
            "SELECT id, name, api_base_url, env_var_name
             FROM language_model_providers
             ORDER BY created_at ASC, id ASC",
        )
        .map_err(|error| format!("failed to prepare language model provider query: {error}"))?;

    let providers = statement
        .query_map([], |row| {
            Ok(LanguageModelProviderDto {
                id: row.get("id")?,
                name: row.get("name")?,
                has_free_tier: None,
                website_url: None,
                gateway_prefix: None,
                secondary: None,
                env_var_name: row.get("env_var_name")?,
                api_base_url: row.get("api_base_url")?,
                provider_type: "custom".to_string(),
            })
        })
        .map_err(|error| format!("failed to execute language model provider query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode language model providers: {error}"))?;

    Ok(providers)
}

fn get_language_model_providers_internal(
    app: &AppHandle,
) -> Result<Vec<LanguageModelProviderDto>, String> {
    let connection = match open_db(app) {
        Ok(connection) => Some(connection),
        Err(error) if error == "sqlite database not found" => None,
        Err(error) => return Err(error),
    };

    let mut providers = hardcoded_language_model_providers();
    providers.extend(custom_language_model_providers(connection.as_ref())?);
    Ok(providers)
}

pub(crate) fn get_language_model_provider_env_var_names(
    app: &AppHandle,
) -> Result<Vec<String>, String> {
    Ok(get_language_model_providers_internal(app)?
        .into_iter()
        .filter_map(|provider| provider.env_var_name)
        .collect())
}

fn is_custom_provider(provider_id: &str) -> bool {
    provider_id.starts_with(CUSTOM_PROVIDER_PREFIX)
}

fn hardcoded_models_for_provider(provider_id: &str) -> Vec<LanguageModelDto> {
    let catalog = language_model_catalog();
    let Some(models) = catalog.model_options.get(provider_id) else {
        return Vec::new();
    };

    models
        .iter()
        .map(|model| LanguageModelDto {
            id: None,
            api_name: model.name.clone(),
            display_name: model.display_name.clone(),
            description: model.description.clone(),
            tag: model.tag.clone(),
            tag_color: model.tag_color.clone(),
            max_output_tokens: model.max_output_tokens,
            context_window: model.context_window,
            temperature: model.temperature,
            dollar_signs: model.dollar_signs,
            model_type: Some("cloud".to_string()),
        })
        .collect()
}

fn custom_models_for_provider(
    connection: Option<&Connection>,
    provider_id: &str,
) -> Result<Vec<LanguageModelDto>, String> {
    let Some(connection) = connection else {
        return Ok(Vec::new());
    };

    let sql = if is_custom_provider(provider_id) {
        "SELECT id, display_name, api_name, description, max_output_tokens, context_window
         FROM language_models
         WHERE custom_provider_id = ?1
         ORDER BY id ASC"
    } else {
        "SELECT id, display_name, api_name, description, max_output_tokens, context_window
         FROM language_models
         WHERE builtin_provider_id = ?1
         ORDER BY id ASC"
    };

    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("failed to prepare language model query: {error}"))?;

    let models = statement
        .query_map(params![provider_id], |row| {
            Ok(LanguageModelDto {
                id: row.get("id")?,
                api_name: row.get("api_name")?,
                display_name: row.get("display_name")?,
                description: row
                    .get::<_, Option<String>>("description")?
                    .unwrap_or_default(),
                tag: None,
                tag_color: None,
                max_output_tokens: row.get("max_output_tokens")?,
                context_window: row.get("context_window")?,
                temperature: None,
                dollar_signs: None,
                model_type: Some("custom".to_string()),
            })
        })
        .map_err(|error| format!("failed to execute language model query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode language models: {error}"))?;

    Ok(models)
}

fn get_language_models_internal(
    app: &AppHandle,
    provider_id: &str,
) -> Result<Vec<LanguageModelDto>, String> {
    let providers = get_language_model_providers_internal(app)?;
    let provider = providers
        .iter()
        .find(|candidate| candidate.id == provider_id)
        .ok_or_else(|| format!("Provider with ID \"{provider_id}\" not found"))?;

    if provider.provider_type == "local" {
        return Err("Local models cannot be fetched".to_string());
    }

    let connection = match open_db(app) {
        Ok(connection) => Some(connection),
        Err(error) if error == "sqlite database not found" => None,
        Err(error) => return Err(error),
    };

    let mut models = if provider.provider_type == "cloud" {
        hardcoded_models_for_provider(provider_id)
    } else {
        Vec::new()
    };
    models.extend(custom_models_for_provider(
        connection.as_ref(),
        provider_id,
    )?);
    Ok(models)
}

#[tauri::command]
pub fn get_language_model_providers(
    app: AppHandle,
) -> Result<Vec<LanguageModelProviderDto>, String> {
    get_language_model_providers_internal(&app)
}

#[tauri::command]
pub fn get_language_models(
    app: AppHandle,
    request: GetLanguageModelsRequest,
) -> Result<Vec<LanguageModelDto>, String> {
    get_language_models_internal(&app, &request.provider_id)
}

#[tauri::command]
pub fn get_language_models_by_providers(
    app: AppHandle,
) -> Result<HashMap<String, Vec<LanguageModelDto>>, String> {
    let providers = get_language_model_providers_internal(&app)?;
    let mut models_by_provider = HashMap::new();

    for provider in providers
        .iter()
        .filter(|provider| provider.provider_type != "local")
    {
        models_by_provider.insert(
            provider.id.clone(),
            get_language_models_internal(&app, &provider.id)?,
        );
    }

    Ok(models_by_provider)
}

#[tauri::command]
pub fn create_custom_language_model_provider(
    app: AppHandle,
    request: CreateCustomLanguageModelProviderRequest,
) -> Result<LanguageModelProviderDto, String> {
    let id = request.id.trim();
    let name = request.name.trim();
    let api_base_url = request.api_base_url.trim();
    let env_var_name = trim_to_none(request.env_var_name);

    if id.is_empty() {
        return Err("Provider ID is required".to_string());
    }
    if name.is_empty() {
        return Err("Provider name is required".to_string());
    }
    if api_base_url.is_empty() {
        return Err("API base URL is required".to_string());
    }

    let stored_id = format!("{CUSTOM_PROVIDER_PREFIX}{id}");
    let connection = open_db(&app)?;
    let existing_provider: Option<String> = connection
        .query_row(
            "SELECT id FROM language_model_providers WHERE id = ?1",
            params![stored_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to check existing provider: {error}"))?;

    if existing_provider.is_some() {
        return Err(format!("A provider with ID \"{id}\" already exists"));
    }

    let now = now_unix_timestamp();
    connection
        .execute(
            "INSERT INTO language_model_providers (id, name, api_base_url, env_var_name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![stored_id, name, api_base_url, env_var_name, now, now],
        )
        .map_err(|error| format!("failed to create custom language model provider: {error}"))?;

    Ok(LanguageModelProviderDto {
        id: id.to_string(),
        name: name.to_string(),
        has_free_tier: None,
        website_url: None,
        gateway_prefix: None,
        secondary: None,
        env_var_name,
        api_base_url: Some(api_base_url.to_string()),
        provider_type: "custom".to_string(),
    })
}

#[tauri::command]
pub fn edit_custom_language_model_provider(
    app: AppHandle,
    request: CreateCustomLanguageModelProviderRequest,
) -> Result<LanguageModelProviderDto, String> {
    let id = request.id.trim();
    let name = request.name.trim();
    let api_base_url = request.api_base_url.trim();
    let env_var_name = trim_to_none(request.env_var_name);

    if id.is_empty() {
        return Err("Provider ID is required".to_string());
    }
    if name.is_empty() {
        return Err("Provider name is required".to_string());
    }
    if api_base_url.is_empty() {
        return Err("API base URL is required".to_string());
    }

    let stored_id = format!("{CUSTOM_PROVIDER_PREFIX}{id}");
    let connection = open_db(&app)?;
    let updated = connection
        .execute(
            "UPDATE language_model_providers
             SET name = ?1, api_base_url = ?2, env_var_name = ?3, updated_at = ?4
             WHERE id = ?5",
            params![
                name,
                api_base_url,
                env_var_name,
                now_unix_timestamp(),
                stored_id
            ],
        )
        .map_err(|error| format!("failed to update custom language model provider: {error}"))?;

    if updated == 0 {
        return Err(format!("Provider with ID \"{id}\" not found"));
    }

    Ok(LanguageModelProviderDto {
        id: id.to_string(),
        name: name.to_string(),
        has_free_tier: None,
        website_url: None,
        gateway_prefix: None,
        secondary: None,
        env_var_name,
        api_base_url: Some(api_base_url.to_string()),
        provider_type: "custom".to_string(),
    })
}

#[tauri::command]
pub fn delete_custom_language_model_provider(
    app: AppHandle,
    request: DeleteCustomLanguageModelProviderRequest,
) -> Result<(), String> {
    if request.provider_id.trim().is_empty() {
        return Err("Provider ID is required".to_string());
    }

    let mut connection = open_db(&app)?;
    let existing_provider: Option<String> = connection
        .query_row(
            "SELECT id FROM language_model_providers WHERE id = ?1",
            params![request.provider_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to read custom language model provider: {error}"))?;

    if existing_provider.is_none() {
        return Ok(());
    }

    let transaction = connection
        .transaction()
        .map_err(|error| format!("failed to start language model transaction: {error}"))?;
    transaction
        .execute(
            "DELETE FROM language_models WHERE custom_provider_id = ?1",
            params![request.provider_id],
        )
        .map_err(|error| format!("failed to delete custom provider models: {error}"))?;
    transaction
        .execute(
            "DELETE FROM language_model_providers WHERE id = ?1",
            params![request.provider_id],
        )
        .map_err(|error| format!("failed to delete custom language model provider: {error}"))?;
    transaction
        .commit()
        .map_err(|error| format!("failed to commit language model transaction: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn create_custom_language_model(
    app: AppHandle,
    request: CreateCustomLanguageModelRequest,
) -> Result<(), String> {
    let api_name = request.api_name.trim();
    let display_name = request.display_name.trim();
    let provider_id = request.provider_id.trim();
    let description = trim_to_none(request.description);

    if api_name.is_empty() {
        return Err("Model API name is required".to_string());
    }
    if display_name.is_empty() {
        return Err("Model display name is required".to_string());
    }
    if provider_id.is_empty() {
        return Err("Provider ID is required".to_string());
    }

    let providers = get_language_model_providers_internal(&app)?;
    let provider = providers
        .iter()
        .find(|candidate| candidate.id == provider_id)
        .ok_or_else(|| format!("Provider with ID \"{provider_id}\" not found"))?;

    if provider.provider_type == "local" {
        return Err("Local models cannot be customized".to_string());
    }

    let connection = open_db(&app)?;
    let now = now_unix_timestamp();
    connection
        .execute(
            "INSERT INTO language_models (
               display_name,
               api_name,
               builtin_provider_id,
               custom_provider_id,
               description,
               max_output_tokens,
               context_window,
               created_at,
               updated_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                display_name,
                api_name,
                if provider.provider_type == "cloud" {
                    Some(provider_id.to_string())
                } else {
                    None
                },
                if provider.provider_type == "custom" {
                    Some(provider_id.to_string())
                } else {
                    None
                },
                description,
                request.max_output_tokens,
                request.context_window,
                now,
                now
            ],
        )
        .map_err(|error| format!("failed to create custom language model: {error}"))?;

    Ok(())
}

#[tauri::command]
pub fn delete_custom_language_model(app: AppHandle, model_id: String) -> Result<(), String> {
    let api_name = model_id.trim();
    if api_name.is_empty() {
        return Err("Model API name (modelId) is required".to_string());
    }

    let connection = open_db(&app)?;
    let existing: Option<i64> = connection
        .query_row(
            "SELECT id FROM language_models WHERE api_name = ?1",
            params![api_name],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("failed to read custom language model: {error}"))?;

    if existing.is_none() {
        return Err(format!(
            "A model with API name (modelId) \"{api_name}\" was not found"
        ));
    }

    connection
        .execute(
            "DELETE FROM language_models WHERE api_name = ?1",
            params![api_name],
        )
        .map_err(|error| format!("failed to delete custom language model: {error}"))?;
    Ok(())
}

#[tauri::command]
pub fn delete_custom_model(
    app: AppHandle,
    request: DeleteCustomModelRequest,
) -> Result<(), String> {
    let provider_id = request.provider_id.trim();
    let model_api_name = request.model_api_name.trim();

    if provider_id.is_empty() || model_api_name.is_empty() {
        return Err("Provider ID and Model API Name are required.".to_string());
    }

    let providers = get_language_model_providers_internal(&app)?;
    let provider = providers
        .iter()
        .find(|candidate| candidate.id == provider_id)
        .ok_or_else(|| format!("Provider with ID \"{provider_id}\" not found"))?;

    if provider.provider_type == "local" {
        return Err("Local models cannot be deleted".to_string());
    }

    let connection = open_db(&app)?;
    connection
        .execute(
            if provider.provider_type == "cloud" {
                "DELETE FROM language_models
                 WHERE builtin_provider_id = ?1 AND api_name = ?2"
            } else {
                "DELETE FROM language_models
                 WHERE custom_provider_id = ?1 AND api_name = ?2"
            },
            params![provider_id, model_api_name],
        )
        .map_err(|error| format!("failed to delete custom model: {error}"))?;

    Ok(())
}
