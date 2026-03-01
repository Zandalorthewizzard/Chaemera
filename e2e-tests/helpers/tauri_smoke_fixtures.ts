import { test as base, expect } from "@playwright/test";

type TauriSmokeHarnessState = {
  settings: Record<string, unknown>;
  externalUrls: string[];
  invocations: Array<{ channel: string; payload: unknown }>;
};

declare global {
  interface Window {
    __CHAEMERA_TAURI_SMOKE__?: {
      emit: (channel: string, payload: unknown) => void;
      getState: () => TauriSmokeHarnessState;
    };
  }
}

const defaultSettings = {
  selectedModel: {
    name: "auto",
    provider: "auto",
  },
  providerSettings: {},
  telemetryConsent: "unset",
  telemetryUserId: "tauri-smoke-user",
  hasRunBefore: true,
  experiments: {},
  enableProLazyEditsMode: true,
  enableProSmartFilesContextMode: true,
  selectedChatMode: "build",
  defaultChatMode: "build",
  enableAutoFixProblems: false,
  enableAutoUpdate: true,
  releaseChannel: "stable",
  selectedTemplateId: "react",
  selectedThemeId: "default",
  isRunning: false,
  enableNativeGit: true,
  autoExpandPreviewPanel: true,
  enableContextCompaction: true,
  isTestMode: true,
} as const;

const tauriCommandToChannel = {
  window_minimize: "window:minimize",
  window_maximize: "window:maximize",
  window_close: "window:close",
  get_system_platform: "get-system-platform",
  get_system_debug_info: "get-system-debug-info",
  get_app_version: "get-app-version",
  nodejs_status: "nodejs-status",
  select_node_folder: "select-node-folder",
  get_node_path: "get-node-path",
  get_user_settings: "get-user-settings",
  set_user_settings: "set-user-settings",
  show_item_in_folder: "show-item-in-folder",
  clear_session_data: "clear-session-data",
  reload_env_path: "reload-env-path",
  does_release_note_exist: "does-release-note-exist",
  get_user_budget: "get-user-budget",
  upload_to_signed_url: "upload-to-signed-url",
  restart_dyad: "restart-dyad",
  get_themes: "get-themes",
  generate_theme_prompt: "generate-theme-prompt",
  generate_theme_from_url: "generate-theme-from-url",
  save_theme_image: "save-theme-image",
  cleanup_theme_images: "cleanup-theme-images",
  apply_visual_editing_changes: "apply-visual-editing-changes",
  analyze_component: "analyze-component",
  leptos_render_route: "leptos:render-route",
} as const;

export const test = base.extend<{
  tauriSmokeState: TauriSmokeHarnessState;
}>({
  page: async ({ page }, use) => {
    await page.addInitScript(
      ({
        initialSettings,
        commandToChannel,
      }: {
        initialSettings: Record<string, unknown>;
        commandToChannel: Record<string, string>;
      }) => {
        const listeners = new Map<string, Set<(payload: unknown) => void>>();
        const state = {
          settings: { ...initialSettings },
          externalUrls: [] as string[],
          invocations: [] as Array<{ channel: string; payload: unknown }>,
        };

        const themePromptFrom = ({
          source,
          sourceValue,
          keywords,
          generationMode,
        }: {
          source: "images" | "url";
          sourceValue: string;
          keywords: string;
          generationMode: string;
        }) => {
          const modeText =
            generationMode === "high-fidelity"
              ? "High-fidelity visual matching"
              : "Inspired interpretation";

          return [
            "<theme>",
            `Style mode: ${modeText}.`,
            `Reference source (${source}): ${sourceValue}.`,
            `Keywords: ${keywords || "none provided"}.`,
            "Build an intentional, responsive UI direction with clear typography, spacing, and color hierarchy.",
            "</theme>",
          ].join("\n");
        };

        const on = (channel: string, listener: (payload: unknown) => void) => {
          const group = listeners.get(channel) ?? new Set();
          group.add(listener);
          listeners.set(channel, group);
          return () => {
            group.delete(listener);
            if (group.size === 0) {
              listeners.delete(channel);
            }
          };
        };

        const emit = (channel: string, payload: unknown) => {
          const group = listeners.get(channel);
          if (!group) return;
          for (const listener of group) {
            listener(payload);
          }
        };

        const invokeByChannel = async (channel: string, payload: unknown) => {
          state.invocations.push({ channel, payload });

          switch (channel) {
            case "get-user-settings":
              return state.settings;
            case "set-user-settings":
              state.settings = {
                ...state.settings,
                ...(payload as Record<string, unknown>),
              };
              return state.settings;
            case "get-app-version":
              return { version: "0.37.0-beta.2-tauri-smoke" };
            case "get-system-platform":
              return "tauri-smoke";
            case "get-system-debug-info":
              return {
                nodeVersion: "v24.0.0",
                pnpmVersion: "9.0.0",
                nodePath: "C:/Program Files/nodejs/node.exe",
                telemetryId: "tauri-smoke-user",
                telemetryConsent: "unset",
                telemetryUrl: "https://us.i.posthog.com",
                dyadVersion: "0.37.0-beta.2-tauri-smoke",
                platform: "tauri-smoke",
                architecture: "x64",
                logs: "",
                selectedLanguageModel: "auto:auto",
              };
            case "get-node-path":
              return "C:/Program Files/nodejs/node.exe";
            case "get-user-budget":
              return null;
            case "free-agent-quota:get-status":
              return {
                messagesUsed: 0,
                messagesLimit: 5,
                isQuotaExceeded: false,
                windowStartTime: null,
                resetTime: null,
                hoursUntilReset: null,
              };
            case "get-env-vars":
              return {};
            case "get-language-model-providers":
              return [];
            case "get-language-models":
              return [];
            case "get-language-models-by-providers":
              return {};
            case "list-apps":
              return { apps: [] };
            case "prompts:list":
              return [];
            case "does-release-note-exist":
              return { exists: false };
            case "nodejs-status":
              return {
                nodeVersion: "v24.0.0",
                pnpmVersion: "9.0.0",
                nodeDownloadUrl: "https://nodejs.org/",
              };
            case "select-node-folder":
              return {
                path: "C:/Program Files/nodejs",
                canceled: false,
                selectedPath: "C:/Program Files/nodejs",
              };
            case "open-external-url":
              if (typeof payload === "string") {
                state.externalUrls.push(payload);
              }
              return;
            case "show-item-in-folder":
            case "upload-to-signed-url":
            case "window:minimize":
            case "window:maximize":
            case "window:close":
            case "clear-session-data":
            case "reset-all":
            case "reload-env-path":
            case "restart-dyad":
              return;
            case "get-themes":
              return [
                {
                  id: "default",
                  name: "Default Theme",
                  description:
                    "Balanced design system emphasizing aesthetics, contrast, and functionality.",
                  icon: "palette",
                  prompt:
                    "<theme>\nStyle mode: Inspired interpretation.\nReference source (images): no images provided.\nKeywords: none provided.\nBuild an intentional, responsive UI direction with clear typography, spacing, and color hierarchy.\n</theme>",
                },
              ];
            case "get-custom-themes":
              return [];
            case "generate-theme-prompt": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const imagePaths = Array.isArray(request?.imagePaths)
                ? (request.imagePaths as string[])
                : [];
              return {
                prompt: themePromptFrom({
                  source: "images",
                  sourceValue:
                    imagePaths.length > 0
                      ? imagePaths.join(", ")
                      : "no images provided",
                  keywords: String(request?.keywords ?? ""),
                  generationMode: String(request?.generationMode ?? "inspired"),
                }),
              };
            }
            case "generate-theme-from-url": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              return {
                prompt: themePromptFrom({
                  source: "url",
                  sourceValue: String(request?.url ?? ""),
                  keywords: String(request?.keywords ?? ""),
                  generationMode: String(request?.generationMode ?? "inspired"),
                }),
              };
            }
            case "save-theme-image":
              return { path: "C:/tmp/chaemera-theme-smoke.png" };
            case "cleanup-theme-images":
            case "apply-visual-editing-changes":
              return;
            case "analyze-component":
              return { isDynamic: false, hasStaticText: false };
            case "leptos:render-route": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const routeId = String(request?.routeId ?? "settings");
              const providerId =
                typeof request?.providerId === "string"
                  ? request.providerId
                  : null;
              const title =
                routeId === "apps-home"
                  ? "Apps"
                  : routeId === "chat-workspace"
                    ? "Chat Workspace"
                    : routeId === "app-details"
                      ? "App Details"
                      : routeId === "provider-settings" && providerId
                        ? `Provider Setup: ${providerId}`
                        : routeId === "library"
                          ? "Library"
                          : routeId === "themes"
                            ? "Themes"
                            : routeId === "help"
                              ? "Help"
                              : "Settings";
              return {
                routeId,
                title,
                html: `<section class="tauri-smoke-leptos-shell"><h1>${title}</h1><p>Leptos shell smoke route for ${routeId}.</p></section>`,
              };
            }
            default:
              return undefined;
          }
        };

        const tauriInvoke = async (
          command: string,
          args?: Record<string, unknown>,
        ) => {
          const channel = commandToChannel[command] ?? command;
          return invokeByChannel(channel, args);
        };

        const electronInvoke = async (channel: string, payload: unknown) =>
          invokeByChannel(channel, payload);

        (window as Window).__CHAEMERA_TAURI_SMOKE__ = {
          emit,
          getState: () => state,
        };

        (
          window as Window & {
            __TAURI__?: {
              core?: {
                invoke?: (
                  command: string,
                  args?: Record<string, unknown>,
                ) => Promise<unknown>;
              };
              event?: {
                listen?: (
                  channel: string,
                  handler: (payload: unknown) => void,
                ) => Promise<(() => void) | void> | (() => void);
              };
            };
          }
        ).__TAURI__ = {
          core: {
            invoke: tauriInvoke,
          },
          event: {
            listen: async (
              channel: string,
              handler: (payload: unknown) => void,
            ) => on(channel, (payload) => handler({ payload })),
          },
        };

        (
          window as Window & {
            electron?: {
              ipcRenderer?: {
                invoke: (channel: string, payload: unknown) => Promise<unknown>;
                on: (
                  channel: string,
                  listener: (_event: unknown, payload: unknown) => void,
                ) => () => void;
              };
            };
          }
        ).electron = {
          ipcRenderer: {
            invoke: electronInvoke,
            on: (channel, listener) =>
              on(channel, (payload) => listener({}, payload)),
          },
        };
      },
      {
        initialSettings: defaultSettings,
        commandToChannel: tauriCommandToChannel,
      },
    );

    await use(page);
  },
  tauriSmokeState: async ({ page }, use) => {
    const state = await page.evaluate(() =>
      window.__CHAEMERA_TAURI_SMOKE__!.getState(),
    );
    await use(state);
  },
});

export { expect };
