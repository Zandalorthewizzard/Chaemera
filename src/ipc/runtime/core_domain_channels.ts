export const SPRINT_3_TAURI_CHANNEL_TO_COMMAND = {
  "window:minimize": "window_minimize",
  "window:maximize": "window_maximize",
  "window:close": "window_close",
  "get-system-platform": "get_system_platform",
  "get-app-version": "get_app_version",
  "get-user-settings": "get_user_settings",
  "set-user-settings": "set_user_settings",
} as const;

export const SPRINT_3_TAURI_INVOKE_CHANNELS = Object.keys(
  SPRINT_3_TAURI_CHANNEL_TO_COMMAND,
);

export const CORE_DOMAIN_EVENT_CHANNELS = ["telemetry:event"] as const;

export function isSprint3TauriInvokeChannel(
  channel: string,
): channel is keyof typeof SPRINT_3_TAURI_CHANNEL_TO_COMMAND {
  return channel in SPRINT_3_TAURI_CHANNEL_TO_COMMAND;
}

export function isCoreDomainEventChannel(channel: string): boolean {
  return (CORE_DOMAIN_EVENT_CHANNELS as readonly string[]).includes(channel);
}

