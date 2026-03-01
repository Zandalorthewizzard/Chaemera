use crate::sqlite_support::open_db;
use rusqlite::params;
use serde::Serialize;
use tauri::AppHandle;

const FREE_AGENT_QUOTA_LIMIT: i64 = 5;
const QUOTA_WINDOW_MS: i64 = 23 * 60 * 60 * 1000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FreeAgentQuotaStatusDto {
    messages_used: i64,
    messages_limit: i64,
    is_quota_exceeded: bool,
    window_start_time: Option<i64>,
    reset_time: Option<i64>,
    hours_until_reset: Option<i64>,
}

fn now_ms() -> i64 {
    time::OffsetDateTime::now_utc().unix_timestamp() * 1000
}

#[tauri::command]
pub fn free_agent_quota_get_status(app: AppHandle) -> Result<FreeAgentQuotaStatusDto, String> {
    let connection = match open_db(&app) {
        Ok(connection) => connection,
        Err(error) if error == "sqlite database not found" => {
            return Ok(FreeAgentQuotaStatusDto {
                messages_used: 0,
                messages_limit: FREE_AGENT_QUOTA_LIMIT,
                is_quota_exceeded: false,
                window_start_time: None,
                reset_time: None,
                hours_until_reset: None,
            })
        }
        Err(error) => return Err(error),
    };

    let mut statement = connection
        .prepare(
            "SELECT created_at
             FROM messages
             WHERE using_free_agent_mode_quota = 1
             ORDER BY created_at ASC",
        )
        .map_err(|error| format!("failed to prepare free agent quota query: {error}"))?;

    let quota_messages = statement
        .query_map([], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("failed to execute free agent quota query: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("failed to decode free agent quota rows: {error}"))?;

    if quota_messages.is_empty() {
        return Ok(FreeAgentQuotaStatusDto {
            messages_used: 0,
            messages_limit: FREE_AGENT_QUOTA_LIMIT,
            is_quota_exceeded: false,
            window_start_time: None,
            reset_time: None,
            hours_until_reset: None,
        });
    }

    let window_start_time = quota_messages[0] * 1000;
    let reset_time = window_start_time + QUOTA_WINDOW_MS;
    let now = now_ms();

    if now >= reset_time {
        connection
            .execute(
                "UPDATE messages
                 SET using_free_agent_mode_quota = 0
                 WHERE using_free_agent_mode_quota = 1",
                params![],
            )
            .map_err(|error| format!("failed to reset expired free agent quota rows: {error}"))?;

        return Ok(FreeAgentQuotaStatusDto {
            messages_used: 0,
            messages_limit: FREE_AGENT_QUOTA_LIMIT,
            is_quota_exceeded: false,
            window_start_time: None,
            reset_time: None,
            hours_until_reset: None,
        });
    }

    let messages_used = quota_messages.len() as i64;
    let is_quota_exceeded = messages_used >= FREE_AGENT_QUOTA_LIMIT;
    let mut hours_until_reset = ((reset_time - now) + (60 * 60 * 1000 - 1)) / (60 * 60 * 1000);
    if hours_until_reset < 0 {
        hours_until_reset = 0;
    }

    Ok(FreeAgentQuotaStatusDto {
        messages_used,
        messages_limit: FREE_AGENT_QUOTA_LIMIT,
        is_quota_exceeded,
        window_start_time: Some(window_start_time),
        reset_time: Some(reset_time),
        hours_until_reset: Some(hours_until_reset),
    })
}
