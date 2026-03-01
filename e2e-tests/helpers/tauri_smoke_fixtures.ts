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
  create_app: "create-app",
  get_app: "get-app",
  list_apps: "list-apps",
  search_app: "search-app",
  delete_app: "delete-app",
  copy_app: "copy-app",
  rename_app: "rename-app",
  get_chat: "get-chat",
  get_chats: "get-chats",
  create_chat: "create-chat",
  update_chat: "update-chat",
  delete_chat: "delete-chat",
  delete_messages: "delete-messages",
  search_chats: "search-chats",
  nodejs_status: "nodejs-status",
  select_node_folder: "select-node-folder",
  get_node_path: "get-node-path",
  get_user_settings: "get-user-settings",
  set_user_settings: "set-user-settings",
  check_app_name: "check-app-name",
  show_item_in_folder: "show-item-in-folder",
  clear_session_data: "clear-session-data",
  reset_all: "reset-all",
  reload_env_path: "reload-env-path",
  does_release_note_exist: "does-release-note-exist",
  get_user_budget: "get-user-budget",
  upload_to_signed_url: "upload-to-signed-url",
  restart_dyad: "restart-dyad",
  add_to_favorite: "add-to-favorite",
  update_app_commands: "update-app-commands",
  change_app_location: "change-app-location",
  rename_branch: "rename-branch",
  plan_create: "plan:create",
  plan_get: "plan:get",
  plan_get_for_chat: "plan:get-for-chat",
  plan_update: "plan:update-plan",
  plan_delete: "plan:delete",
  github_start_flow: "github:start-flow",
  github_list_repos: "github:list-repos",
  github_get_repo_branches: "github:get-repo-branches",
  github_is_repo_available: "github:is-repo-available",
  github_create_repo: "github:create-repo",
  github_connect_existing_repo: "github:connect-existing-repo",
  github_list_collaborators: "github:list-collaborators",
  github_disconnect: "github:disconnect",
  get_themes: "get-themes",
  set_app_theme: "set-app-theme",
  get_app_theme: "get-app-theme",
  get_custom_themes: "get-custom-themes",
  create_custom_theme: "create-custom-theme",
  update_custom_theme: "update-custom-theme",
  delete_custom_theme: "delete-custom-theme",
  prompts_list: "prompts:list",
  prompts_create: "prompts:create",
  prompts_update: "prompts:update",
  prompts_delete: "prompts:delete",
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
        const appsById = new Map<
          number,
          {
            id: number;
            name: string;
            path: string;
            createdAt: string;
            updatedAt: string;
            githubOrg: string | null;
            githubRepo: string | null;
            githubBranch: string | null;
            supabaseProjectId: null;
            supabaseParentProjectId: null;
            supabaseOrganizationSlug: null;
            neonProjectId: null;
            neonDevelopmentBranchId: null;
            neonPreviewBranchId: null;
            vercelProjectId: null;
            vercelProjectName: null;
            vercelDeploymentUrl: null;
            vercelTeamId: null;
            installCommand: string | null;
            startCommand: string | null;
            isFavorite: boolean;
            resolvedPath: string;
            files: string[];
            supabaseProjectName: null;
            vercelTeamSlug: null;
          }
        >([
          [
            1,
            {
              id: 1,
              name: "smoke-app",
              path: "smoke-app",
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: "2026-03-01T00:00:00Z",
              githubOrg: null,
              githubRepo: null,
              githubBranch: null,
              supabaseProjectId: null,
              supabaseParentProjectId: null,
              supabaseOrganizationSlug: null,
              neonProjectId: null,
              neonDevelopmentBranchId: null,
              neonPreviewBranchId: null,
              vercelProjectId: null,
              vercelProjectName: null,
              vercelDeploymentUrl: null,
              vercelTeamId: null,
              installCommand: null,
              startCommand: null,
              isFavorite: false,
              resolvedPath: "C:/Apps/smoke-app",
              files: ["src/main.tsx", "package.json"],
              supabaseProjectName: null,
              vercelTeamSlug: null,
            },
          ],
        ]);
        let nextAppId = 2;
        const chatsById = new Map<
          number,
          {
            id: number;
            appId: number;
            title: string | null;
            createdAt: string;
            initialCommitHash: string | null;
            messages: Array<{
              id: number;
              role: "user" | "assistant";
              content: string;
              approvalState?: "approved" | "rejected" | null;
              commitHash?: string | null;
              sourceCommitHash?: string | null;
              dbTimestamp?: string | null;
              createdAt?: string;
              requestId?: string | null;
              totalTokens?: number | null;
              model?: string | null;
            }>;
          }
        >([
          [
            1,
            {
              id: 1,
              appId: 1,
              title: "Smoke migration chat",
              createdAt: "2026-03-01T00:00:00Z",
              initialCommitHash: "abc123def456",
              messages: [
                {
                  id: 1,
                  role: "user",
                  content: "What changed in the migration?",
                  createdAt: "2026-03-01T00:00:00Z",
                },
                {
                  id: 2,
                  role: "assistant",
                  content: "Tauri route shells are active.",
                  createdAt: "2026-03-01T00:01:00Z",
                  commitHash: "abc123def456",
                  sourceCommitHash: "abc123def456",
                  totalTokens: 128,
                  model: "auto",
                },
              ],
            },
          ],
        ]);
        let nextChatId = 2;
        const appThemesById = new Map<number, string | null>([[1, "default"]]);
        const customThemesById = new Map<
          number,
          {
            id: number;
            name: string;
            description: string | null;
            prompt: string;
            createdAt: string;
            updatedAt: string;
          }
        >();
        let nextCustomThemeId = 1;
        const promptsById = new Map<
          number,
          {
            id: number;
            title: string;
            description: string | null;
            content: string;
            createdAt: string;
            updatedAt: string;
          }
        >([
          [
            1,
            {
              id: 1,
              title: "Regression sweep",
              description: "Smoke checklist prompt",
              content: "Verify the migrated desktop shell paths.",
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: "2026-03-01T00:00:00Z",
            },
          ],
        ]);
        let nextPromptId = 2;
        const plansById = new Map<
          string,
          {
            id: string;
            appId: number;
            chatId: number | null;
            title: string;
            summary: string | null;
            content: string;
            createdAt: string;
            updatedAt: string;
          }
        >();
        const latestPlanIdByChatId = new Map<number, string>();
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
            case "create-app": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appName = String(request?.name ?? "").trim();
              const appId = nextAppId++;
              const now = new Date().toISOString();
              const app = {
                id: appId,
                name: appName,
                path: appName,
                createdAt: now,
                updatedAt: now,
                githubOrg: null,
                githubRepo: null,
                githubBranch: null,
                supabaseProjectId: null,
                supabaseParentProjectId: null,
                supabaseOrganizationSlug: null,
                neonProjectId: null,
                neonDevelopmentBranchId: null,
                neonPreviewBranchId: null,
                vercelProjectId: null,
                vercelProjectName: null,
                vercelDeploymentUrl: null,
                vercelTeamId: null,
                installCommand: null,
                startCommand: null,
                isFavorite: false,
                resolvedPath: `C:/Apps/${appName}`,
                files: ["src/main.tsx", "package.json"],
                supabaseProjectName: null,
                vercelTeamSlug: null,
              };
              appsById.set(appId, app);

              const chatId = nextChatId++;
              chatsById.set(chatId, {
                id: chatId,
                appId,
                title: "",
                createdAt: now,
                initialCommitHash: "abc123def456",
                messages: [],
              });

              return {
                app,
                chatId,
              };
            }
            case "list-apps":
              return {
                apps: Array.from(appsById.values()).map((app) => ({
                  ...app,
                  files: undefined,
                  supabaseProjectName: undefined,
                  vercelTeamSlug: undefined,
                })),
              };
            case "get-app": {
              const appId =
                typeof payload === "object" &&
                payload !== null &&
                "appId" in payload
                  ? Number((payload as { appId?: unknown }).appId ?? 0)
                  : Number(payload ?? 0);
              return (
                appsById.get(appId) ?? {
                  ...appsById.get(1),
                  id: appId,
                }
              );
            }
            case "delete-app": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              appsById.delete(appId);
              for (const [chatId, chat] of chatsById.entries()) {
                if (chat.appId === appId) {
                  chatsById.delete(chatId);
                }
              }
              return;
            }
            case "copy-app": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const newAppName = String(request?.newAppName ?? "").trim();
              const original = appsById.get(appId);
              if (!original) {
                throw new Error("Original app not found.");
              }
              const nextId = nextAppId++;
              const now = new Date().toISOString();
              const copiedApp = {
                ...original,
                id: nextId,
                name: newAppName,
                path: newAppName,
                createdAt: now,
                updatedAt: now,
                githubOrg: null,
                githubRepo: null,
                githubBranch: null,
                supabaseProjectId: null,
                supabaseParentProjectId: null,
                supabaseOrganizationSlug: null,
                neonProjectId: null,
                neonDevelopmentBranchId: null,
                neonPreviewBranchId: null,
                vercelProjectId: null,
                vercelProjectName: null,
                vercelDeploymentUrl: null,
                vercelTeamId: null,
                isFavorite: false,
                resolvedPath: `C:/Apps/${newAppName}`,
              };
              appsById.set(nextId, copiedApp);
              return {
                app: copiedApp,
              };
            }
            case "rename-app": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const nextName = String(request?.appName ?? "");
              const nextPath = String(request?.appPath ?? "");
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              const currentPathIsAbsolute =
                existing.path.includes(":") || existing.path.startsWith("/");
              const resolvedPath =
                nextPath === existing.path
                  ? existing.resolvedPath
                  : currentPathIsAbsolute
                    ? `${existing.resolvedPath.replace(/[/\\\\][^/\\\\]*$/, "")}/${nextPath}`
                    : `C:/Apps/${nextPath}`;
              appsById.set(appId, {
                ...existing,
                name: nextName,
                path: currentPathIsAbsolute ? resolvedPath : nextPath,
                resolvedPath,
              });
              return {
                resolvedPath,
              };
            }
            case "get-chat": {
              const chatId =
                typeof payload === "object" &&
                payload !== null &&
                "chatId" in payload
                  ? Number((payload as { chatId?: unknown }).chatId ?? 0)
                  : Number(payload ?? 0);
              const existing = chatsById.get(chatId);
              if (!existing) {
                throw new Error("Chat not found");
              }
              return {
                id: existing.id,
                title: existing.title ?? "",
                messages: existing.messages,
                initialCommitHash: existing.initialCommitHash,
                dbTimestamp: null,
              };
            }
            case "get-chats": {
              const appId =
                typeof payload === "object" &&
                payload !== null &&
                "appId" in payload
                  ? Number((payload as { appId?: unknown }).appId ?? 0)
                  : typeof payload === "number"
                    ? payload
                    : null;
              return Array.from(chatsById.values())
                .filter((chat) => (appId == null ? true : chat.appId === appId))
                .map((chat) => ({
                  id: chat.id,
                  appId: chat.appId,
                  title: chat.title,
                  createdAt: chat.createdAt,
                }))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            }
            case "create-chat": {
              const appId =
                typeof payload === "object" &&
                payload !== null &&
                "appId" in payload
                  ? Number((payload as { appId?: unknown }).appId ?? 0)
                  : Number(payload ?? 0);
              const chatId = nextChatId++;
              chatsById.set(chatId, {
                id: chatId,
                appId,
                title: null,
                createdAt: new Date().toISOString(),
                initialCommitHash: "abc123def456",
                messages: [],
              });
              return chatId;
            }
            case "update-chat": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const existing = chatsById.get(chatId);
              if (!existing) {
                return;
              }
              chatsById.set(chatId, {
                ...existing,
                title: String(request?.title ?? ""),
              });
              return;
            }
            case "delete-chat": {
              const chatId =
                typeof payload === "object" &&
                payload !== null &&
                "chatId" in payload
                  ? Number((payload as { chatId?: unknown }).chatId ?? 0)
                  : Number(payload ?? 0);
              chatsById.delete(chatId);
              return;
            }
            case "delete-messages": {
              const chatId =
                typeof payload === "object" &&
                payload !== null &&
                "chatId" in payload
                  ? Number((payload as { chatId?: unknown }).chatId ?? 0)
                  : Number(payload ?? 0);
              const existing = chatsById.get(chatId);
              if (!existing) {
                return;
              }
              chatsById.set(chatId, {
                ...existing,
                messages: [],
              });
              return;
            }
            case "search-chats": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const query = String(request?.query ?? "").toLowerCase();
              return Array.from(chatsById.values())
                .filter((chat) => chat.appId === appId)
                .filter((chat) => {
                  const titleMatch = (chat.title ?? "")
                    .toLowerCase()
                    .includes(query);
                  const messageMatch = chat.messages.some((message) =>
                    message.content.toLowerCase().includes(query),
                  );
                  return titleMatch || messageMatch;
                })
                .map((chat) => {
                  const matchedMessage = chat.messages.find((message) =>
                    message.content.toLowerCase().includes(query),
                  );
                  return {
                    id: chat.id,
                    appId: chat.appId,
                    title: chat.title,
                    createdAt: chat.createdAt,
                    matchedMessageContent: matchedMessage?.content ?? null,
                  };
                })
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            }
            case "search-app": {
              const query = String(
                (payload as { query?: unknown } | undefined)?.query ?? "",
              ).toLowerCase();
              if (!query) {
                return [];
              }

              const deduped = new Map<
                number,
                {
                  id: number;
                  name: string;
                  createdAt: string;
                  matchedChatTitle: string | null;
                  matchedChatMessage: string | null;
                }
              >();

              for (const app of appsById.values()) {
                if (app.name.toLowerCase().includes(query)) {
                  deduped.set(app.id, {
                    id: app.id,
                    name: app.name,
                    createdAt: app.createdAt,
                    matchedChatTitle: null,
                    matchedChatMessage: null,
                  });
                }
              }

              for (const chat of chatsById.values()) {
                if (
                  (chat.title ?? "").toLowerCase().includes(query) &&
                  appsById.has(chat.appId)
                ) {
                  const app = appsById.get(chat.appId)!;
                  deduped.set(app.id, {
                    id: app.id,
                    name: app.name,
                    createdAt: app.createdAt,
                    matchedChatTitle: chat.title ?? null,
                    matchedChatMessage: null,
                  });
                }
              }

              for (const chat of chatsById.values()) {
                const matchedMessage = chat.messages.find((message) =>
                  message.content.toLowerCase().includes(query),
                );
                if (!matchedMessage || !appsById.has(chat.appId)) {
                  continue;
                }

                const app = appsById.get(chat.appId)!;
                deduped.set(app.id, {
                  id: app.id,
                  name: app.name,
                  createdAt: app.createdAt,
                  matchedChatTitle: chat.title ?? null,
                  matchedChatMessage: matchedMessage.content,
                });
              }

              return Array.from(deduped.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            }
            case "github:list-repos":
              return [
                {
                  name: "chaemera-smoke-repo",
                  full_name: "chaemera/chaemera-smoke-repo",
                  private: true,
                },
              ];
            case "github:start-flow": {
              window.setTimeout(() => {
                emit("github:flow-update", {
                  message: "Requesting device code from GitHub...",
                });
                emit("github:flow-update", {
                  userCode: "CHAEMERA-CODE",
                  verificationUri: "https://github.com/login/device",
                  message: "Please authorize in your browser.",
                });
              }, 0);

              window.setTimeout(() => {
                state.settings = {
                  ...state.settings,
                  githubAccessToken: {
                    value: "tauri-smoke-github-token",
                  },
                  githubUser: {
                    email: "tauri-smoke@example.com",
                  },
                };
                emit("github:flow-success", {
                  message: "Successfully connected!",
                });
              }, 10);

              return;
            }
            case "github:get-repo-branches": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const repo = String(request?.repo ?? "");
              return [
                {
                  name: "main",
                  commit: {
                    sha: `${repo || "repo"}-main-sha`,
                  },
                },
                {
                  name: "feature/tauri",
                  commit: {
                    sha: `${repo || "repo"}-feature-sha`,
                  },
                },
              ];
            }
            case "github:is-repo-available": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const repo = String(request?.repo ?? "");
              const normalizedRepo = repo.trim().replace(/\s+/g, "-");
              const exists = normalizedRepo === "chaemera-smoke-repo";
              return {
                available: !exists,
                error: exists ? "Repository already exists." : undefined,
              };
            }
            case "github:create-repo": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              const repo = String(request?.repo ?? "")
                .trim()
                .replace(/\s+/g, "-");
              const owner = String(request?.org ?? "").trim() || "testuser";
              const branch =
                typeof request?.branch === "string" && request.branch
                  ? request.branch
                  : "main";
              appsById.set(appId, {
                ...existing,
                githubOrg: owner,
                githubRepo: repo,
                githubBranch: branch,
              });
              return;
            }
            case "github:connect-existing-repo": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              appsById.set(appId, {
                ...existing,
                githubOrg: String(request?.owner ?? ""),
                githubRepo: String(request?.repo ?? ""),
                githubBranch: String(request?.branch ?? "main"),
              });
              return;
            }
            case "github:list-collaborators": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app?.githubOrg || !app.githubRepo) {
                throw new Error("App is not linked to a GitHub repo.");
              }
              return [
                {
                  login: "chaemera-collaborator",
                  avatar_url: "https://example.test/avatar.png",
                  permissions: { push: true },
                },
              ];
            }
            case "github:disconnect": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              appsById.set(appId, {
                ...existing,
                githubOrg: null,
                githubRepo: null,
                githubBranch: null,
              });
              return;
            }
            case "check-app-name": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const name = String(request?.appName ?? "");
              return {
                exists: Array.from(appsById.values()).some(
                  (app) => app.name === name,
                ),
              };
            }
            case "add-to-favorite": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                return { isFavorite: false };
              }
              const next = {
                ...existing,
                isFavorite: !existing.isFavorite,
                updatedAt: new Date().toISOString(),
              };
              appsById.set(appId, next);
              return { isFavorite: next.isFavorite };
            }
            case "update-app-commands": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                return;
              }
              appsById.set(appId, {
                ...existing,
                installCommand:
                  typeof request?.installCommand === "string"
                    ? request.installCommand
                    : null,
                startCommand:
                  typeof request?.startCommand === "string"
                    ? request.startCommand
                    : null,
                updatedAt: new Date().toISOString(),
              });
              return;
            }
            case "change-app-location": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const parentDirectory = String(request?.parentDirectory ?? "");
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              const folderName =
                existing.path
                  .split(/[/\\\\]/)
                  .filter(Boolean)
                  .pop() ?? existing.name;
              const resolvedPath = `${parentDirectory.replace(/[\\\\]+/g, "/")}/${folderName}`;
              appsById.set(appId, {
                ...existing,
                path: resolvedPath,
                resolvedPath,
              });
              return {
                resolvedPath,
              };
            }
            case "rename-branch":
              return;
            case "get-app-theme": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              return appThemesById.get(appId) ?? null;
            }
            case "set-app-theme": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const themeId =
                typeof request?.themeId === "string" ? request.themeId : null;
              appThemesById.set(appId, themeId);
              return;
            }
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
            case "plan:create": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const chatId = Number(request?.chatId ?? 0);
              const now = new Date().toISOString();
              const slug = `chat-${chatId}-tauri-smoke-plan`;
              const plan = {
                id: slug,
                appId,
                chatId,
                title: String(request?.title ?? ""),
                summary:
                  typeof request?.summary === "string" ? request.summary : null,
                content: String(request?.content ?? ""),
                createdAt: now,
                updatedAt: now,
              };
              plansById.set(slug, plan);
              latestPlanIdByChatId.set(chatId, slug);
              return slug;
            }
            case "plan:get": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              return plansById.get(String(request?.planId ?? "")) ?? null;
            }
            case "plan:get-for-chat": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const planId = latestPlanIdByChatId.get(chatId);
              return planId ? (plansById.get(planId) ?? null) : null;
            }
            case "plan:update-plan": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const planId = String(request?.id ?? "");
              const existing = plansById.get(planId);
              if (!existing) {
                return;
              }
              plansById.set(planId, {
                ...existing,
                title:
                  typeof request?.title === "string"
                    ? request.title
                    : existing.title,
                summary:
                  typeof request?.summary === "string"
                    ? request.summary
                    : existing.summary,
                content:
                  typeof request?.content === "string"
                    ? request.content
                    : existing.content,
                updatedAt: new Date().toISOString(),
              });
              return;
            }
            case "plan:delete": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const planId = String(request?.planId ?? "");
              const existing = plansById.get(planId);
              plansById.delete(planId);
              if (existing && existing.chatId !== null) {
                const current = latestPlanIdByChatId.get(existing.chatId);
                if (current === planId) {
                  latestPlanIdByChatId.delete(existing.chatId);
                }
              }
              return;
            }
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
              return Array.from(customThemesById.values());
            case "create-custom-theme": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const now = new Date().toISOString();
              const theme = {
                id: nextCustomThemeId++,
                name: String(request?.name ?? ""),
                description:
                  typeof request?.description === "string"
                    ? request.description
                    : null,
                prompt: String(request?.prompt ?? ""),
                createdAt: now,
                updatedAt: now,
              };
              customThemesById.set(theme.id, theme);
              return theme;
            }
            case "update-custom-theme": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const themeId = Number(request?.id ?? 0);
              const existing = customThemesById.get(themeId);
              if (!existing) {
                return undefined;
              }
              const updated = {
                ...existing,
                name:
                  typeof request?.name === "string"
                    ? request.name
                    : existing.name,
                description:
                  typeof request?.description === "string"
                    ? request.description
                    : existing.description,
                prompt:
                  typeof request?.prompt === "string"
                    ? request.prompt
                    : existing.prompt,
                updatedAt: new Date().toISOString(),
              };
              customThemesById.set(themeId, updated);
              return updated;
            }
            case "delete-custom-theme": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              customThemesById.delete(Number(request?.id ?? 0));
              return;
            }
            case "prompts:list":
              return Array.from(promptsById.values());
            case "prompts:create": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const now = new Date().toISOString();
              const prompt = {
                id: nextPromptId++,
                title: String(request?.title ?? ""),
                description:
                  typeof request?.description === "string"
                    ? request.description
                    : null,
                content: String(request?.content ?? ""),
                createdAt: now,
                updatedAt: now,
              };
              promptsById.set(prompt.id, prompt);
              return prompt;
            }
            case "prompts:update": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const promptId = Number(request?.id ?? 0);
              const existing = promptsById.get(promptId);
              if (!existing) {
                return;
              }
              promptsById.set(promptId, {
                ...existing,
                title:
                  typeof request?.title === "string"
                    ? request.title
                    : existing.title,
                description:
                  typeof request?.description === "string"
                    ? request.description
                    : existing.description,
                content:
                  typeof request?.content === "string"
                    ? request.content
                    : existing.content,
                updatedAt: new Date().toISOString(),
              });
              return;
            }
            case "prompts:delete":
              promptsById.delete(
                typeof payload === "object" &&
                  payload !== null &&
                  "promptId" in payload
                  ? Number((payload as { promptId?: unknown }).promptId ?? 0)
                  : Number(payload ?? 0),
              );
              return;
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
