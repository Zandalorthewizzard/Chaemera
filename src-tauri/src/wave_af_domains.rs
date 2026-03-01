use crate::sqlite_support::{open_db, timestamp_to_rfc3339};
use regex::Regex;
use rusqlite::params;
use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityFindingDto {
    title: String,
    level: String,
    description: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityReviewResultDto {
    findings: Vec<SecurityFindingDto>,
    timestamp: String,
    chat_id: i64,
}

fn parse_security_findings(content: &str) -> Vec<SecurityFindingDto> {
    let regex = Regex::new(
        r#"<dyad-security-finding\s+title="([^"]+)"\s+level="(critical|high|medium|low)">([\s\S]*?)</dyad-security-finding>"#,
    )
    .expect("security finding regex must compile");

    regex
        .captures_iter(content)
        .map(|captures| SecurityFindingDto {
            title: captures
                .get(1)
                .map(|capture| capture.as_str().trim().to_string())
                .unwrap_or_default(),
            level: captures
                .get(2)
                .map(|capture| capture.as_str().trim().to_string())
                .unwrap_or_default(),
            description: captures
                .get(3)
                .map(|capture| capture.as_str().trim().to_string())
                .unwrap_or_default(),
        })
        .collect()
}

#[tauri::command]
pub fn get_latest_security_review(
    app: AppHandle,
    app_id: i64,
) -> Result<SecurityReviewResultDto, String> {
    if app_id == 0 {
        return Err("App ID is required".to_string());
    }

    let connection = open_db(&app)?;
    let row = connection
        .query_row(
            "SELECT messages.content, messages.created_at, messages.chat_id
             FROM messages
             INNER JOIN chats ON messages.chat_id = chats.id
             WHERE chats.app_id = ?1
               AND messages.role = 'assistant'
               AND messages.content LIKE '%<dyad-security-finding%'
             ORDER BY messages.created_at DESC
             LIMIT 1",
            params![app_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        )
        .map_err(|_| "No security review found for this app".to_string())?;

    let findings = parse_security_findings(&row.0);
    if findings.is_empty() {
        return Err("No security review found for this app".to_string());
    }

    Ok(SecurityReviewResultDto {
        findings,
        timestamp: timestamp_to_rfc3339(row.1),
        chat_id: row.2,
    })
}
