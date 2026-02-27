export const TAURI_MIGRATION_CHANNEL_TO_COMMAND = {
  "window:minimize": "window_minimize",
  "window:maximize": "window_maximize",
  "window:close": "window_close",
  "get-system-platform": "get_system_platform",
  "get-app-version": "get_app_version",
  "get-user-settings": "get_user_settings",
  "set-user-settings": "set_user_settings",
  "select-app-folder": "select_app_folder",
  "select-app-location": "select_app_location",
  "check-ai-rules": "check_ai_rules",
  "get-templates": "get_templates",
  "read-app-file": "read_app_file",
  "search-app-files": "search_app_files",
  "list-versions": "list_versions",
  "get-current-branch": "get_current_branch",
  "chat:stream": "chat_stream",
  "chat:cancel": "chat_cancel",
  "agent-tool:get-tools": "agent_tool_get_tools",
  "agent-tool:set-consent": "agent_tool_set_consent",
  "agent-tool:consent-response": "agent_tool_consent_response",
  "mcp:list-servers": "mcp_list_servers",
  "mcp:create-server": "mcp_create_server",
  "mcp:update-server": "mcp_update_server",
  "mcp:delete-server": "mcp_delete_server",
  "mcp:list-tools": "mcp_list_tools",
  "mcp:get-tool-consents": "mcp_get_tool_consents",
  "mcp:set-tool-consent": "mcp_set_tool_consent",
  "mcp:tool-consent-response": "mcp_tool_consent_response",
} as const;

export const TAURI_MIGRATION_INVOKE_CHANNELS = Object.keys(
  TAURI_MIGRATION_CHANNEL_TO_COMMAND,
);

export const TAURI_MIGRATION_EVENT_CHANNELS = [
  "telemetry:event",
  "force-close-detected",
  "chat:stream:start",
  "chat:stream:end",
  "chat:response:chunk",
  "chat:response:end",
  "chat:response:error",
  "agent-tool:consent-request",
  "agent-tool:todos-update",
  "agent-tool:problems-update",
  "mcp:tool-consent-request",
] as const;

export function isTauriMigrationInvokeChannel(
  channel: string,
): channel is keyof typeof TAURI_MIGRATION_CHANNEL_TO_COMMAND {
  return channel in TAURI_MIGRATION_CHANNEL_TO_COMMAND;
}

export function isTauriMigrationEventChannel(channel: string): boolean {
  return (TAURI_MIGRATION_EVENT_CHANNELS as readonly string[]).includes(
    channel,
  );
}
