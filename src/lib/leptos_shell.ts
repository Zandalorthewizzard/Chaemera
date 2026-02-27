export function hasTauriLeptosShellSupport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const bridge = window.__CHAEMERA_TAURI_CORE__;
  return bridge?.supportedChannels.includes("leptos:render-route") ?? false;
}
