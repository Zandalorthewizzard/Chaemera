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
} as const;

export const TAURI_MIGRATION_INVOKE_CHANNELS = Object.keys(
  TAURI_MIGRATION_CHANNEL_TO_COMMAND,
);

export const CORE_DOMAIN_EVENT_CHANNELS = ["telemetry:event"] as const;

export function isTauriMigrationInvokeChannel(
  channel: string,
): channel is keyof typeof TAURI_MIGRATION_CHANNEL_TO_COMMAND {
  return channel in TAURI_MIGRATION_CHANNEL_TO_COMMAND;
}

export function isCoreDomainEventChannel(channel: string): boolean {
  return (CORE_DOMAIN_EVENT_CHANNELS as readonly string[]).includes(channel);
}
