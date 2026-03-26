import { test as base, expect } from "@playwright/test";

type TauriSmokeSelectedAppFolder = {
  path: string | null;
  name: string | null;
  hasAiRules: boolean;
};

type TauriSmokeSelectedAppLocation = {
  path: string | null;
  canceled: boolean;
};

type TauriSmokeHarnessState = {
  settings: Record<string, unknown>;
  externalUrls: string[];
  invocations: Array<{ channel: string; payload: unknown }>;
  nextSelectedAppFolder: TauriSmokeSelectedAppFolder | null;
  nextSelectedAppLocation: TauriSmokeSelectedAppLocation | null;
};

declare global {
  interface Window {
    __CHAEMERA_TAURI_SMOKE__?: {
      emit: (channel: string, payload: unknown) => void;
      getState: () => TauriSmokeHarnessState;
      setNextSelectedAppFolder: (
        selection: Partial<TauriSmokeSelectedAppFolder> | null,
      ) => void;
      setNextSelectedAppLocation: (
        selection: Partial<TauriSmokeSelectedAppLocation> | null,
      ) => void;
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
  get_latest_security_review: "get-latest-security-review",
  get_session_debug_bundle: "get-session-debug-bundle",
  portal_migrate_create: "portal:migrate-create",
  get_proposal: "get-proposal",
  approve_proposal: "approve-proposal",
  reject_proposal: "reject-proposal",
  free_agent_quota_get_status: "free-agent-quota:get-status",
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
  chat_count_tokens: "chat:count-tokens",
  chat_add_dep: "chat:add-dep",
  nodejs_status: "nodejs-status",
  test_set_node_mock: "test:set-node-mock",
  select_node_folder: "select-node-folder",
  select_app_folder: "select-app-folder",
  select_app_location: "select-app-location",
  get_node_path: "get-node-path",
  get_user_settings: "get-user-settings",
  set_user_settings: "set-user-settings",
  check_ai_rules: "check-ai-rules",
  get_env_vars: "get-env-vars",
  get_app_env_vars: "get-app-env-vars",
  set_app_env_vars: "set-app-env-vars",
  get_context_paths: "get-context-paths",
  set_context_paths: "set-context-paths",
  is_capacitor: "is-capacitor",
  sync_capacitor: "sync-capacitor",
  open_ios: "open-ios",
  open_android: "open-android",
  import_app: "import-app",
  get_app_upgrades: "get-app-upgrades",
  execute_app_upgrade: "execute-app-upgrade",
  revert_version: "revert-version",
  check_app_name: "check-app-name",
  show_item_in_folder: "show-item-in-folder",
  take_screenshot: "take-screenshot",
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
  checkout_version: "checkout-version",
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
  github_push: "github:push",
  github_fetch: "github:fetch",
  github_pull: "github:pull",
  github_rebase: "github:rebase",
  github_rebase_abort: "github:rebase-abort",
  github_merge_abort: "github:merge-abort",
  github_rebase_continue: "github:rebase-continue",
  github_create_branch: "github:create-branch",
  github_switch_branch: "github:switch-branch",
  github_delete_branch: "github:delete-branch",
  github_rename_branch: "github:rename-branch",
  github_merge_branch: "github:merge-branch",
  github_list_local_branches: "github:list-local-branches",
  github_list_remote_branches: "github:list-remote-branches",
  github_get_conflicts: "github:get-conflicts",
  github_get_git_state: "github:get-git-state",
  github_list_collaborators: "github:list-collaborators",
  github_invite_collaborator: "github:invite-collaborator",
  github_remove_collaborator: "github:remove-collaborator",
  github_clone_repo_from_url: "github:clone-repo-from-url",
  github_disconnect: "github:disconnect",
  git_get_uncommitted_files: "git:get-uncommitted-files",
  git_commit_changes: "git:commit-changes",
  vercel_save_token: "vercel:save-token",
  vercel_list_projects: "vercel:list-projects",
  vercel_is_project_available: "vercel:is-project-available",
  vercel_create_project: "vercel:create-project",
  vercel_connect_existing_project: "vercel:connect-existing-project",
  vercel_get_deployments: "vercel:get-deployments",
  vercel_disconnect: "vercel:disconnect",
  get_language_model_providers: "get-language-model-providers",
  get_language_models: "get-language-models",
  get_language_models_by_providers: "get-language-models-by-providers",
  create_custom_language_model_provider:
    "create-custom-language-model-provider",
  edit_custom_language_model_provider: "edit-custom-language-model-provider",
  delete_custom_language_model_provider:
    "delete-custom-language-model-provider",
  create_custom_language_model: "create-custom-language-model",
  delete_custom_language_model: "delete-custom-language-model",
  delete_custom_model: "delete-custom-model",
  supabase_list_organizations: "supabase:list-organizations",
  supabase_delete_organization: "supabase:delete-organization",
  supabase_list_all_projects: "supabase:list-all-projects",
  supabase_list_branches: "supabase:list-branches",
  supabase_get_edge_logs: "supabase:get-edge-logs",
  supabase_set_app_project: "supabase:set-app-project",
  supabase_unset_app_project: "supabase:unset-app-project",
  supabase_fake_connect_and_set_project:
    "supabase:fake-connect-and-set-project",
  neon_create_project: "neon:create-project",
  neon_get_project: "neon:get-project",
  neon_fake_connect: "neon:fake-connect",
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
            supabaseProjectId: string | null;
            supabaseParentProjectId: string | null;
            supabaseOrganizationSlug: string | null;
            neonProjectId: string | null;
            neonDevelopmentBranchId: string | null;
            neonPreviewBranchId: string | null;
            vercelProjectId: string | null;
            vercelProjectName: string | null;
            vercelDeploymentUrl: string | null;
            vercelTeamId: string | null;
            installCommand: string | null;
            startCommand: string | null;
            isFavorite: boolean;
            resolvedPath: string;
            files: string[];
            supabaseProjectName: string | null;
            vercelTeamSlug: string | null;
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
        const languageModelProvidersById = new Map<
          string,
          {
            id: string;
            name: string;
            hasFreeTier?: boolean;
            websiteUrl?: string;
            gatewayPrefix?: string;
            secondary?: boolean;
            envVarName?: string;
            apiBaseUrl?: string;
            type: "custom" | "local" | "cloud";
          }
        >([
          [
            "openai",
            {
              id: "openai",
              name: "OpenAI",
              websiteUrl: "https://platform.openai.com/api-keys",
              gatewayPrefix: "",
              envVarName: "OPENAI_API_KEY",
              hasFreeTier: false,
              type: "cloud",
            },
          ],
          [
            "auto",
            {
              id: "auto",
              name: "Dyad",
              websiteUrl: "https://academy.dyad.sh/subscription",
              gatewayPrefix: "dyad/",
              type: "cloud",
            },
          ],
          [
            "ollama",
            {
              id: "ollama",
              name: "Ollama",
              hasFreeTier: true,
              type: "local",
            },
          ],
          [
            "lmstudio",
            {
              id: "lmstudio",
              name: "LM Studio",
              hasFreeTier: true,
              type: "local",
            },
          ],
        ]);
        const languageModelsByProvider = new Map<
          string,
          Array<{
            id?: number;
            apiName: string;
            displayName: string;
            description?: string;
            tag?: string;
            tagColor?: string;
            maxOutputTokens?: number;
            contextWindow?: number;
            temperature?: number;
            dollarSigns?: number;
            type?: "custom" | "cloud";
          }>
        >([
          [
            "openai",
            [
              {
                apiName: "gpt-5.2",
                displayName: "GPT 5.2",
                description: "OpenAI's latest model",
                contextWindow: 400_000,
                temperature: 1,
                dollarSigns: 3,
                type: "cloud",
              },
            ],
          ],
          [
            "auto",
            [
              {
                apiName: "auto",
                displayName: "Auto",
                description: "Automatically selects the best model",
                tag: "Default",
                maxOutputTokens: 32_000,
                contextWindow: 200_000,
                temperature: 0,
                type: "cloud",
              },
            ],
          ],
        ]);
        let nextCustomLanguageModelId = 1;
        const supabaseOrganizationsBySlug = new Map<
          string,
          {
            organizationSlug: string;
            name?: string;
            ownerEmail?: string;
          }
        >([
          [
            "fake-org-id",
            {
              organizationSlug: "fake-org-id",
              name: "Fake Organization",
              ownerEmail: "owner@example.com",
            },
          ],
        ]);
        const supabaseProjectsByOrganizationSlug = new Map<
          string,
          Array<{
            id: string;
            name: string;
            region: string;
            organizationSlug: string;
          }>
        >([
          [
            "fake-org-id",
            [
              {
                id: "fake-project-id",
                name: "Fake Supabase Project",
                region: "us-east-1",
                organizationSlug: "fake-org-id",
              },
              {
                id: "test-branch-project-id",
                name: "Test Branch Project",
                region: "us-east-1",
                organizationSlug: "fake-org-id",
              },
            ],
          ],
        ]);
        const supabaseBranchesByProjectId = new Map<
          string,
          Array<{
            id: string;
            name: string;
            isDefault: boolean;
            projectRef: string;
            parentProjectRef: string | null;
          }>
        >([
          [
            "fake-project-id",
            [
              {
                id: "default-branch-id",
                name: "Default Branch",
                isDefault: true,
                projectRef: "fake-project-id",
                parentProjectRef: "fake-project-id",
              },
              {
                id: "test-branch-id",
                name: "Test Branch",
                isDefault: false,
                projectRef: "test-branch-project-id",
                parentProjectRef: "fake-project-id",
              },
            ],
          ],
        ]);
        const neonProjectsByAppId = new Map<
          number,
          {
            projectId: string;
            projectName: string;
            orgId: string;
            developmentBranchId: string;
            previewBranchId: string;
          }
        >();
        const appEnvVarsByAppId = new Map<
          number,
          Array<{
            key: string;
            value: string;
          }>
        >([[1, []]]);
        const chatContextsByAppId = new Map<
          number,
          {
            contextPaths: Array<{ globPath: string }>;
            smartContextAutoIncludes: Array<{ globPath: string }>;
            excludePaths: Array<{ globPath: string }>;
          }
        >([
          [
            1,
            {
              contextPaths: [],
              smartContextAutoIncludes: [],
              excludePaths: [],
            },
          ],
        ]);
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
        const collaboratorsByAppId = new Map<
          number,
          Array<{
            login: string;
            avatar_url: string;
            permissions?: { push: boolean };
          }>
        >([
          [
            1,
            [
              {
                login: "chaemera-collaborator",
                avatar_url: "https://example.test/avatar.png",
                permissions: { push: true },
              },
            ],
          ],
        ]);
        const state = {
          settings: { ...initialSettings },
          externalUrls: [] as string[],
          invocations: [] as Array<{ channel: string; payload: unknown }>,
          nextSelectedAppFolder: null as TauriSmokeSelectedAppFolder | null,
          nextSelectedAppLocation: null as TauriSmokeSelectedAppLocation | null,
          nodeMockInstalled: (() => {
            const raw = window.sessionStorage.getItem(
              "chaemera-tauri-smoke-node-mock-installed",
            );
            if (raw === null) {
              return null;
            }
            return raw === "true";
          })() as boolean | null,
        };
        const appFolderSelectionsByPath = new Map<
          string,
          { hasAiRules: boolean }
        >();

        const normalizeHarnessPath = (value: string) =>
          value.replace(/[\\\\]+/g, "/");

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

        const summarizeContextPath = (globPath: string) => ({
          globPath,
          files: globPath.trim() ? 1 : 0,
          tokens: globPath.trim() ? Math.max(16, globPath.length * 4) : 0,
        });

        const getNodeStatus = () => {
          const nodeInstalled = state.nodeMockInstalled !== false;
          return {
            nodeVersion: nodeInstalled ? "v24.0.0" : null,
            pnpmVersion: nodeInstalled ? "9.0.0" : null,
            nodeDownloadUrl: "https://nodejs.org/",
          };
        };

        const persistNodeMockInstalled = (installed: boolean | null) => {
          state.nodeMockInstalled = installed;
          if (installed === null) {
            window.sessionStorage.removeItem(
              "chaemera-tauri-smoke-node-mock-installed",
            );
            return;
          }
          window.sessionStorage.setItem(
            "chaemera-tauri-smoke-node-mock-installed",
            installed ? "true" : "false",
          );
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

        const setNextSelectedAppFolder = (
          selection: Partial<TauriSmokeSelectedAppFolder> | null,
        ) => {
          if (!selection) {
            state.nextSelectedAppFolder = null;
            return;
          }

          const normalizedSelection = {
            path:
              typeof selection.path === "string"
                ? normalizeHarnessPath(selection.path)
                : null,
            name:
              typeof selection.name === "string"
                ? selection.name
                : typeof selection.path === "string"
                  ? (normalizeHarnessPath(selection.path)
                      .split("/")
                      .filter(Boolean)
                      .pop() ?? null)
                  : null,
            hasAiRules: selection.hasAiRules === true,
          };

          state.nextSelectedAppFolder = normalizedSelection;
          if (normalizedSelection.path) {
            appFolderSelectionsByPath.set(normalizedSelection.path, {
              hasAiRules: normalizedSelection.hasAiRules,
            });
          }
        };

        const setNextSelectedAppLocation = (
          selection: Partial<TauriSmokeSelectedAppLocation> | null,
        ) => {
          if (!selection) {
            state.nextSelectedAppLocation = null;
            return;
          }

          state.nextSelectedAppLocation = {
            path:
              typeof selection.path === "string"
                ? normalizeHarnessPath(selection.path)
                : null,
            canceled: selection.canceled === true,
          };
        };

        const invokeByChannel = async (channel: string, payload: unknown) => {
          state.invocations.push({ channel, payload });

          switch (channel) {
            case "get-user-settings":
              return state.settings;
            case "set-user-settings": {
              const patch =
                typeof payload === "object" &&
                payload !== null &&
                "patch" in payload &&
                typeof (payload as { patch?: unknown }).patch === "object" &&
                (payload as { patch?: unknown }).patch !== null
                  ? (((payload as { patch: Record<string, unknown> }).patch ??
                      {}) as Record<string, unknown>)
                  : ((payload as Record<string, unknown> | null) ?? {});
              state.settings = {
                ...state.settings,
                ...patch,
              };
              return state.settings;
            }
            case "get-app-version":
              return { version: "0.37.0-beta.2-tauri-smoke" };
            case "get-system-platform":
              return "tauri-smoke";
            case "get-system-debug-info": {
              const nodeStatus = getNodeStatus();
              return {
                nodeVersion: nodeStatus.nodeVersion,
                pnpmVersion: nodeStatus.pnpmVersion,
                nodePath: nodeStatus.nodeVersion
                  ? "C:/Program Files/nodejs/node.exe"
                  : null,
                telemetryId: "tauri-smoke-user",
                telemetryConsent: "unset",
                telemetryUrl: "https://us.i.posthog.com",
                dyadVersion: "0.37.0-beta.2-tauri-smoke",
                platform: "tauri-smoke",
                architecture: "x64",
                logs: "",
                selectedLanguageModel: "auto:auto",
              };
            }
            case "get-session-debug-bundle": {
              const chatId =
                typeof payload === "object" &&
                payload !== null &&
                "chatId" in payload
                  ? Number((payload as { chatId?: unknown }).chatId ?? 0)
                  : Number(payload ?? 0);
              const chat = chatsById.get(chatId) ?? chatsById.get(1);
              const app = chat ? appsById.get(chat.appId) : appsById.get(1);
              if (!chat || !app) {
                throw new Error("Smoke debug bundle state is unavailable");
              }
              const nodeStatus = getNodeStatus();
              return {
                schemaVersion: 2,
                exportedAt: "2026-03-01T00:05:00Z",
                system: {
                  dyadVersion: "0.37.0-beta.2-tauri-smoke",
                  platform: "tauri-smoke",
                  architecture: "x64",
                  nodeVersion: nodeStatus.nodeVersion,
                  pnpmVersion: nodeStatus.pnpmVersion,
                  nodePath: nodeStatus.nodeVersion
                    ? "C:/Program Files/nodejs/node.exe"
                    : null,
                  electronVersion: "tauri-2",
                  telemetryId: "tauri-smoke-user",
                },
                settings: {
                  selectedModel: {
                    name: "auto",
                    provider: "auto",
                  },
                  selectedChatMode: "build",
                  defaultChatMode: "build",
                  autoApproveChanges: null,
                  enableDyadPro: false,
                  thinkingBudget: null,
                  maxChatTurnsInContext: null,
                  enableAutoFixProblems: false,
                  enableNativeGit: true,
                  enableAutoUpdate: true,
                  releaseChannel: "stable",
                  runtimeMode2: null,
                  zoomLevel: null,
                  previewDeviceMode: null,
                  enableProLazyEditsMode: true,
                  proLazyEditsMode: null,
                  enableProSmartFilesContextMode: true,
                  enableProWebSearch: null,
                  proSmartContextOption: null,
                  enableSupabaseWriteSqlMigration: null,
                  agentToolConsents: null,
                  experiments: {},
                  customNodePath: null,
                  providerSetupStatus: {},
                },
                app: {
                  id: app.id,
                  name: app.name,
                  path: app.path,
                  createdAt: app.createdAt,
                  updatedAt: app.updatedAt,
                  githubOrg: app.githubOrg,
                  githubRepo: app.githubRepo,
                  githubBranch: app.githubBranch,
                  supabaseProjectId: app.supabaseProjectId,
                  supabaseOrganizationSlug: app.supabaseOrganizationSlug,
                  neonProjectId: app.neonProjectId,
                  vercelProjectId: app.vercelProjectId,
                  vercelProjectName: app.vercelProjectName,
                  vercelDeploymentUrl: app.vercelDeploymentUrl,
                  installCommand: app.installCommand,
                  startCommand: app.startCommand,
                  chatContext: chatContextsByAppId.get(app.id) ?? null,
                  themeId: appThemesById.get(app.id) ?? null,
                },
                chat: {
                  id: chat.id,
                  appId: chat.appId,
                  title: chat.title,
                  initialCommitHash: chat.initialCommitHash,
                  createdAt: chat.createdAt,
                  messages: chat.messages.map((message) => ({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt ?? chat.createdAt,
                    aiMessagesJson: null,
                    model: message.model ?? null,
                    totalTokens: message.totalTokens ?? null,
                    approvalState: message.approvalState ?? null,
                    sourceCommitHash: message.sourceCommitHash ?? null,
                    commitHash: message.commitHash ?? null,
                    requestId: message.requestId ?? null,
                    usingFreeAgentModeQuota: null,
                  })),
                },
                providers: {
                  customProviders: [],
                  customModels: [],
                },
                mcpServers: [],
                codebase:
                  '<dyad-file path="src/main.tsx">\nexport const smoke = true;\n</dyad-file>\n\n',
                logs: "",
              };
            }
            case "portal:migrate-create":
              return {
                output:
                  "Migration created at drizzle/0001_smoke.sql\n\n[chaemera] staged and committed migration changes.",
              };
            case "get-proposal":
              return null;
            case "approve-proposal": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const messageId = Number(request?.messageId ?? 0);
              const chat = chatsById.get(chatId);
              if (!chat) {
                throw new Error("Chat not found");
              }
              chat.messages = chat.messages.map((message) =>
                message.id === messageId
                  ? {
                      ...message,
                      approvalState: "approved" as const,
                      commitHash: "smoke-approve-commit",
                    }
                  : message,
              );
              chatsById.set(chatId, { ...chat });
              return {
                success: true,
                commitHash: "smoke-approve-commit",
              };
            }
            case "reject-proposal": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const messageId = Number(request?.messageId ?? 0);
              const chat = chatsById.get(chatId);
              if (!chat) {
                throw new Error("Chat not found");
              }
              chat.messages = chat.messages.map((message) =>
                message.id === messageId
                  ? { ...message, approvalState: "rejected" as const }
                  : message,
              );
              chatsById.set(chatId, { ...chat });
              return;
            }
            case "get-node-path":
              return "C:/Program Files/nodejs/node.exe";
            case "select-app-folder": {
              const selection = state.nextSelectedAppFolder;
              state.nextSelectedAppFolder = null;
              if (!selection) {
                return {
                  path: null,
                  name: null,
                };
              }
              return {
                path: selection.path,
                name: selection.name,
              };
            }
            case "select-app-location": {
              const selection = state.nextSelectedAppLocation;
              state.nextSelectedAppLocation = null;
              if (!selection) {
                return {
                  path: null,
                  canceled: true,
                };
              }
              return {
                path: selection.path,
                canceled: selection.canceled,
              };
            }
            case "check-ai-rules": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const requestedPath =
                typeof request?.path === "string"
                  ? normalizeHarnessPath(request.path)
                  : "";
              return {
                exists:
                  appFolderSelectionsByPath.get(requestedPath)?.hasAiRules ??
                  /ai[-_]rules/i.test(requestedPath),
              };
            }
            case "take-screenshot":
              return;
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
              appEnvVarsByAppId.set(appId, []);
              chatContextsByAppId.set(appId, {
                contextPaths: [],
                smartContextAutoIncludes: [],
                excludePaths: [],
              });

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
              appEnvVarsByAppId.delete(appId);
              chatContextsByAppId.delete(appId);
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
              appEnvVarsByAppId.set(
                nextId,
                (appEnvVarsByAppId.get(appId) ?? []).map((envVar) => ({
                  ...envVar,
                })),
              );
              chatContextsByAppId.set(nextId, {
                contextPaths: [
                  ...(chatContextsByAppId.get(appId)?.contextPaths ?? []),
                ],
                smartContextAutoIncludes: [
                  ...(chatContextsByAppId.get(appId)
                    ?.smartContextAutoIncludes ?? []),
                ],
                excludePaths: [
                  ...(chatContextsByAppId.get(appId)?.excludePaths ?? []),
                ],
              });
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
            case "chat:add-dep": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const packages = Array.isArray(request?.packages)
                ? (request.packages as string[])
                : [];
              const chat = chatsById.get(chatId);
              if (!chat) {
                throw new Error(`Chat not found: ${chatId}`);
              }
              const packageTag = `<dyad-add-dependency packages="${packages.join(
                " ",
              )}">`;
              chat.messages = chat.messages.map((message) =>
                message.content.includes(packageTag)
                  ? {
                      ...message,
                      content: message.content.replace(
                        packageTag,
                        `${packageTag}installed in tauri smoke\n`,
                      ),
                    }
                  : message,
              );
              chatsById.set(chatId, { ...chat });
              return;
            }
            case "chat:count-tokens": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const chatId = Number(request?.chatId ?? 0);
              const input = String(request?.input ?? "");
              const chat = chatsById.get(chatId);
              if (!chat) {
                throw new Error(`Chat not found: ${chatId}`);
              }
              const messageHistory = chat.messages
                .map((message) => message.content)
                .join("");
              const messageHistoryTokens = Math.ceil(messageHistory.length / 4);
              const inputTokens = Math.ceil(input.length / 4);
              const systemPromptTokens = 256;
              const codebaseTokens = 512;
              const mentionedAppsTokens = input.includes("@app:") ? 128 : 0;
              const actualMaxTokens =
                [...chat.messages]
                  .reverse()
                  .find((message) => message.role === "assistant")
                  ?.totalTokens ?? null;
              return {
                estimatedTotalTokens:
                  messageHistoryTokens +
                  inputTokens +
                  systemPromptTokens +
                  codebaseTokens +
                  mentionedAppsTokens,
                actualMaxTokens,
                messageHistoryTokens,
                codebaseTokens,
                mentionedAppsTokens,
                inputTokens,
                systemPromptTokens,
                contextWindow: 128_000,
              };
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
            case "github:clone-repo-from-url": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const url = String(request?.url ?? "");
              const match = url.match(
                /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/,
              );
              if (!match) {
                return {
                  error:
                    "Invalid GitHub URL. Expected format: https://github.com/owner/repo.git",
                };
              }
              const owner = match[1];
              const repoName = match[2];
              const appName =
                typeof request?.appName === "string" && request.appName.trim()
                  ? request.appName.trim()
                  : repoName;
              if (
                Array.from(appsById.values()).some(
                  (app) => app.name === appName,
                )
              ) {
                return {
                  error: `An app named "${appName}" already exists.`,
                };
              }
              const now = new Date().toISOString();
              const appId = nextAppId++;
              const app = {
                id: appId,
                name: appName,
                path: appName,
                createdAt: now,
                updatedAt: now,
                githubOrg: owner,
                githubRepo: repoName,
                githubBranch: "main",
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
                installCommand:
                  typeof request?.installCommand === "string" &&
                  request.installCommand.trim()
                    ? request.installCommand.trim()
                    : null,
                startCommand:
                  typeof request?.startCommand === "string" &&
                  request.startCommand.trim()
                    ? request.startCommand.trim()
                    : null,
                isFavorite: false,
                resolvedPath: `C:/Apps/${appName}`,
                files: ["package.json", "src/main.tsx"],
                supabaseProjectName: null,
                vercelTeamSlug: null,
              };
              appsById.set(appId, app);
              appEnvVarsByAppId.set(appId, []);
              chatContextsByAppId.set(appId, {
                contextPaths: [],
                smartContextAutoIncludes: [],
                excludePaths: [],
              });
              collaboratorsByAppId.set(appId, []);
              return {
                app,
                hasAiRules: false,
              };
            }
            case "github:push":
            case "github:fetch":
            case "github:pull":
            case "github:rebase":
            case "github:rebase-abort":
            case "github:merge-abort":
            case "github:rebase-continue": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              if (!app.githubOrg || !app.githubRepo) {
                throw new Error("App is not linked to a GitHub repo.");
              }
              return;
            }
            case "github:create-branch": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const branch = String(request?.branch ?? "");
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              if (!branch) {
                throw new Error(
                  "Branch name must be between 1 and 255 characters",
                );
              }
              return;
            }
            case "github:switch-branch": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const branch = String(request?.branch ?? "main");
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              appsById.set(appId, {
                ...app,
                githubBranch: branch,
              });
              return;
            }
            case "github:delete-branch":
              return;
            case "github:rename-branch": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              if (app.githubBranch === String(request?.oldBranch ?? "")) {
                appsById.set(appId, {
                  ...app,
                  githubBranch: String(request?.newBranch ?? ""),
                });
              }
              return;
            }
            case "github:merge-branch":
              return;
            case "github:list-local-branches": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              return {
                branches: ["main", "feature/tauri"],
                current: app.githubBranch ?? "main",
              };
            }
            case "github:list-remote-branches": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const remote =
                typeof request?.remote === "string" && request.remote
                  ? request.remote
                  : "origin";
              if (remote !== "origin") {
                return [];
              }
              return ["main", "feature/tauri"];
            }
            case "github:get-conflicts":
              return [];
            case "github:get-git-state":
              return {
                mergeInProgress: false,
                rebaseInProgress: false,
              };
            case "github:list-collaborators": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app?.githubOrg || !app.githubRepo) {
                throw new Error("App is not linked to a GitHub repo.");
              }
              return collaboratorsByAppId.get(appId) ?? [];
            }
            case "github:invite-collaborator": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const username = String(request?.username ?? "").trim();
              const app = appsById.get(appId);
              if (!app?.githubOrg || !app.githubRepo) {
                throw new Error("App is not linked to a GitHub repo.");
              }
              if (!username) {
                throw new Error("Username cannot be empty.");
              }
              const existing = collaboratorsByAppId.get(appId) ?? [];
              collaboratorsByAppId.set(appId, [
                ...existing.filter(
                  (collaborator) => collaborator.login !== username,
                ),
                {
                  login: username,
                  avatar_url: "https://example.test/new-avatar.png",
                  permissions: { push: true },
                },
              ]);
              return;
            }
            case "github:remove-collaborator": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const username = String(request?.username ?? "").trim();
              collaboratorsByAppId.set(
                appId,
                (collaboratorsByAppId.get(appId) ?? []).filter(
                  (collaborator) => collaborator.login !== username,
                ),
              );
              return;
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
            case "git:get-uncommitted-files":
              return [];
            case "git:commit-changes":
              return "abcdef1234567890";
            case "vercel:save-token": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const token = String(request?.token ?? "").trim();
              if (!token) {
                throw new Error("Access token is required.");
              }
              state.settings = {
                ...state.settings,
                vercelAccessToken: {
                  value: token,
                },
              };
              return;
            }
            case "vercel:list-projects":
              return [
                {
                  id: "prj_smoke_existing",
                  name: "smoke-existing-project",
                  framework: "vite",
                },
                {
                  id: "prj_smoke_docs",
                  name: "smoke-docs-project",
                  framework: "nextjs",
                },
              ];
            case "vercel:is-project-available": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const name = String(request?.name ?? "").trim();
              const unavailable = [
                "smoke-existing-project",
                ...Array.from(appsById.values())
                  .map((app) => app.vercelProjectName)
                  .filter(
                    (projectName): projectName is string =>
                      typeof projectName === "string" && projectName.length > 0,
                  ),
              ];
              const available = name.length > 0 && !unavailable.includes(name);
              return {
                available,
                error: available ? undefined : "Project name is not available.",
              };
            }
            case "vercel:create-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const name = String(request?.name ?? "").trim();
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found.");
              }
              if (!existing.githubOrg || !existing.githubRepo) {
                throw new Error(
                  "App must be connected to a GitHub repository before creating a Vercel project.",
                );
              }
              appsById.set(appId, {
                ...existing,
                vercelProjectId: `prj_${name || "smoke"}`,
                vercelProjectName: name,
                vercelTeamId: "team_smoke_default",
                vercelDeploymentUrl: `https://${name}.vercel.app`,
                updatedAt: new Date().toISOString(),
                vercelTeamSlug: "tauri-smoke-team",
              });
              return;
            }
            case "vercel:connect-existing-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const projectId = String(request?.projectId ?? "");
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found.");
              }
              const projectName =
                projectId === "prj_smoke_existing"
                  ? "smoke-existing-project"
                  : projectId;
              appsById.set(appId, {
                ...existing,
                vercelProjectId: projectId,
                vercelProjectName: projectName,
                vercelTeamId: "team_smoke_default",
                vercelDeploymentUrl: `https://${projectName}.vercel.app`,
                updatedAt: new Date().toISOString(),
                vercelTeamSlug: "tauri-smoke-team",
              });
              return;
            }
            case "vercel:get-deployments": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing?.vercelProjectId) {
                throw new Error("App is not linked to a Vercel project.");
              }
              return [
                {
                  uid: "dpl_smoke_ready",
                  url: `${existing.vercelProjectName}.vercel.app`,
                  state: "READY",
                  createdAt: Date.parse("2026-03-01T00:10:00Z"),
                  target: "production",
                  readyState: "READY",
                },
                {
                  uid: "dpl_smoke_building",
                  url: `${existing.vercelProjectName}-preview.vercel.app`,
                  state: "BUILDING",
                  createdAt: Date.parse("2026-03-01T00:12:00Z"),
                  target: "preview",
                  readyState: "BUILDING",
                },
              ];
            }
            case "vercel:disconnect": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const existing = appsById.get(appId);
              if (!existing) {
                throw new Error("App not found");
              }
              appsById.set(appId, {
                ...existing,
                vercelProjectId: null,
                vercelProjectName: null,
                vercelDeploymentUrl: null,
                vercelTeamId: null,
                updatedAt: new Date().toISOString(),
                vercelTeamSlug: null,
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
            case "get-latest-security-review":
              return {
                findings: [
                  {
                    title: "Unsanitized HTML render",
                    level: "high",
                    description:
                      "User-controlled content reaches a render path without sanitization.",
                  },
                ],
                timestamp: "2026-03-01T00:00:00.000Z",
                chatId: 1,
              };
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
            case "get-app-env-vars": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              return appEnvVarsByAppId.get(appId) ?? [];
            }
            case "set-app-env-vars": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const envVars = Array.isArray(request?.envVars)
                ? (request.envVars as Array<Record<string, unknown>>).map(
                    (envVar) => ({
                      key: String(envVar.key ?? ""),
                      value: String(envVar.value ?? ""),
                    }),
                  )
                : [];
              appEnvVarsByAppId.set(appId, envVars);
              return;
            }
            case "get-context-paths": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const chatContext = chatContextsByAppId.get(appId) ?? {
                contextPaths: [],
                smartContextAutoIncludes: [],
                excludePaths: [],
              };
              return {
                contextPaths: chatContext.contextPaths.map((contextPath) =>
                  summarizeContextPath(contextPath.globPath),
                ),
                smartContextAutoIncludes:
                  chatContext.smartContextAutoIncludes.map((contextPath) =>
                    summarizeContextPath(contextPath.globPath),
                  ),
                excludePaths: chatContext.excludePaths.map((excludePath) =>
                  summarizeContextPath(excludePath.globPath),
                ),
              };
            }
            case "set-context-paths": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const chatContext =
                typeof request?.chatContext === "object" &&
                request.chatContext !== null
                  ? (request.chatContext as {
                      contextPaths?: Array<{ globPath?: unknown }>;
                      smartContextAutoIncludes?: Array<{
                        globPath?: unknown;
                      }>;
                      excludePaths?: Array<{ globPath?: unknown }>;
                    })
                  : {};
              chatContextsByAppId.set(appId, {
                contextPaths: Array.isArray(chatContext.contextPaths)
                  ? chatContext.contextPaths.map((glob) => ({
                      globPath: String(glob.globPath ?? ""),
                    }))
                  : [],
                smartContextAutoIncludes: Array.isArray(
                  chatContext.smartContextAutoIncludes,
                )
                  ? chatContext.smartContextAutoIncludes.map((glob) => ({
                      globPath: String(glob.globPath ?? ""),
                    }))
                  : [],
                excludePaths: Array.isArray(chatContext.excludePaths)
                  ? chatContext.excludePaths.map((glob) => ({
                      globPath: String(glob.globPath ?? ""),
                    }))
                  : [],
              });
              return;
            }
            case "is-capacitor": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              return app.files.some((file) =>
                /^capacitor\.config\.(js|ts|json)$/.test(file),
              );
            }
            case "sync-capacitor":
            case "open-ios":
            case "open-android": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              const hasCapacitorConfig = app.files.some((file) =>
                /^capacitor\.config\.(js|ts|json)$/.test(file),
              );
              if (!hasCapacitorConfig) {
                throw new Error("Capacitor is not installed in this app");
              }
              return;
            }
            case "import-app": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appName = String(request?.appName ?? "").trim();
              const sourcePath = String(request?.path ?? "").trim();
              if (!appName || !sourcePath) {
                throw new Error("Source folder does not exist");
              }
              if (
                Array.from(appsById.values()).some(
                  (app) => app.name === appName,
                )
              ) {
                throw new Error("An app with this name already exists");
              }

              const now = new Date().toISOString();
              const appId = nextAppId++;
              const storedPath =
                request?.skipCopy === true ? sourcePath : appName;
              appsById.set(appId, {
                id: appId,
                name: appName,
                path: storedPath,
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
                installCommand:
                  typeof request?.installCommand === "string" &&
                  request.installCommand.trim()
                    ? request.installCommand.trim()
                    : null,
                startCommand:
                  typeof request?.startCommand === "string" &&
                  request.startCommand.trim()
                    ? request.startCommand.trim()
                    : null,
                isFavorite: false,
                resolvedPath:
                  request?.skipCopy === true
                    ? sourcePath
                    : `C:/Apps/${appName}`,
                files: ["package.json", "src/main.tsx"],
                supabaseProjectName: null,
                vercelTeamSlug: null,
              });
              appEnvVarsByAppId.set(appId, []);
              chatContextsByAppId.set(appId, {
                contextPaths: [],
                smartContextAutoIncludes: [],
                excludePaths: [],
              });
              const chatId = nextChatId++;
              chatsById.set(chatId, {
                id: chatId,
                appId,
                title: "",
                createdAt: now,
                initialCommitHash: null,
                messages: [],
              });
              return {
                appId,
                chatId,
              };
            }
            case "get-app-upgrades":
              return [
                {
                  id: "component-tagger",
                  title: "Enable select component to edit",
                  description:
                    "Installs the component tagger Vite plugin and its dependencies.",
                  manualUpgradeUrl:
                    "https://dyad.sh/docs/upgrades/select-component",
                  isNeeded: true,
                },
                {
                  id: "capacitor",
                  title: "Upgrade to hybrid mobile app with Capacitor",
                  description:
                    "Adds Capacitor so the app can run on iOS and Android in addition to the web.",
                  manualUpgradeUrl:
                    "https://dyad.sh/docs/guides/mobile-app#upgrade-your-app",
                  isNeeded: true,
                },
              ];
            case "execute-app-upgrade":
            case "checkout-version":
              return;
            case "revert-version":
              return {
                successMessage: "Restored version",
              };
            case "get-language-model-providers":
              return Array.from(languageModelProvidersById.values());
            case "get-language-models": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const providerId = String(request?.providerId ?? "");
              const provider = languageModelProvidersById.get(providerId);
              if (!provider) {
                throw new Error(`Provider with ID "${providerId}" not found`);
              }
              if (provider.type === "local") {
                throw new Error("Local models cannot be fetched");
              }
              return languageModelsByProvider.get(providerId) ?? [];
            }
            case "get-language-models-by-providers": {
              const modelsByProviders: Record<string, unknown[]> = {};
              for (const provider of languageModelProvidersById.values()) {
                if (provider.type === "local") {
                  continue;
                }
                modelsByProviders[provider.id] =
                  languageModelsByProvider.get(provider.id) ?? [];
              }
              return modelsByProviders;
            }
            case "create-custom-language-model-provider": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const rawId = String(request?.id ?? "").trim();
              const storedId = `custom::${rawId}`;
              const provider = {
                id: storedId,
                name: String(request?.name ?? "").trim(),
                apiBaseUrl: String(request?.apiBaseUrl ?? "").trim(),
                envVarName:
                  typeof request?.envVarName === "string"
                    ? request.envVarName
                    : undefined,
                type: "custom" as const,
              };
              languageModelProvidersById.set(storedId, provider);
              languageModelsByProvider.set(storedId, []);
              return {
                id: rawId,
                name: provider.name,
                apiBaseUrl: provider.apiBaseUrl,
                envVarName: provider.envVarName,
                type: "custom",
              };
            }
            case "edit-custom-language-model-provider": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const rawId = String(request?.id ?? "").trim();
              const storedId = `custom::${rawId}`;
              const existing = languageModelProvidersById.get(storedId);
              if (!existing) {
                throw new Error(`Provider with ID "${rawId}" not found`);
              }
              const updated = {
                ...existing,
                name: String(request?.name ?? existing.name).trim(),
                apiBaseUrl:
                  typeof request?.apiBaseUrl === "string"
                    ? request.apiBaseUrl.trim()
                    : existing.apiBaseUrl,
                envVarName:
                  typeof request?.envVarName === "string"
                    ? request.envVarName
                    : undefined,
              };
              languageModelProvidersById.set(storedId, updated);
              return {
                id: rawId,
                name: updated.name,
                apiBaseUrl: updated.apiBaseUrl,
                envVarName: updated.envVarName,
                type: "custom",
              };
            }
            case "delete-custom-language-model-provider": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const providerId = String(request?.providerId ?? "").trim();
              languageModelProvidersById.delete(providerId);
              languageModelsByProvider.delete(providerId);
              return;
            }
            case "create-custom-language-model": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const providerId = String(request?.providerId ?? "").trim();
              const provider = languageModelProvidersById.get(providerId);
              if (!provider) {
                throw new Error(`Provider with ID "${providerId}" not found`);
              }
              if (provider.type === "local") {
                throw new Error("Local models cannot be customized");
              }
              const existingModels =
                languageModelsByProvider.get(providerId) ?? [];
              languageModelsByProvider.set(providerId, [
                ...existingModels,
                {
                  id: nextCustomLanguageModelId++,
                  apiName: String(request?.apiName ?? ""),
                  displayName: String(request?.displayName ?? ""),
                  description:
                    typeof request?.description === "string"
                      ? request.description
                      : "",
                  maxOutputTokens:
                    typeof request?.maxOutputTokens === "number"
                      ? request.maxOutputTokens
                      : undefined,
                  contextWindow:
                    typeof request?.contextWindow === "number"
                      ? request.contextWindow
                      : undefined,
                  type: "custom",
                },
              ]);
              return;
            }
            case "delete-custom-language-model": {
              const modelId = String(payload ?? "").trim();
              for (const [providerId, models] of languageModelsByProvider) {
                const nextModels = models.filter(
                  (model) =>
                    !(model.type === "custom" && model.apiName === modelId),
                );
                if (nextModels.length !== models.length) {
                  languageModelsByProvider.set(providerId, nextModels);
                  return;
                }
              }
              throw new Error(
                `A model with API name (modelId) "${modelId}" was not found`,
              );
            }
            case "delete-custom-model": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const providerId = String(request?.providerId ?? "").trim();
              const modelApiName = String(request?.modelApiName ?? "").trim();
              const provider = languageModelProvidersById.get(providerId);
              if (!provider) {
                throw new Error(`Provider with ID "${providerId}" not found`);
              }
              if (provider.type === "local") {
                throw new Error("Local models cannot be deleted");
              }
              const existingModels =
                languageModelsByProvider.get(providerId) ?? [];
              languageModelsByProvider.set(
                providerId,
                existingModels.filter(
                  (model) =>
                    !(
                      model.type === "custom" && model.apiName === modelApiName
                    ),
                ),
              );
              return;
            }
            case "supabase:list-organizations":
              return Array.from(supabaseOrganizationsBySlug.values());
            case "supabase:delete-organization": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const organizationSlug = String(
                request?.organizationSlug ?? "",
              ).trim();
              if (!supabaseOrganizationsBySlug.has(organizationSlug)) {
                throw new Error(
                  `Supabase organization ${organizationSlug} not found`,
                );
              }
              supabaseOrganizationsBySlug.delete(organizationSlug);
              supabaseProjectsByOrganizationSlug.delete(organizationSlug);
              const supabaseSettings =
                (state.settings.supabase as
                  | { organizations?: Record<string, unknown> }
                  | undefined) ?? {};
              if (
                supabaseSettings.organizations &&
                typeof supabaseSettings.organizations === "object"
              ) {
                delete supabaseSettings.organizations[organizationSlug];
              }
              state.settings.supabase = supabaseSettings;
              return;
            }
            case "supabase:list-all-projects":
              return Array.from(
                supabaseProjectsByOrganizationSlug.values(),
              ).flat();
            case "supabase:list-branches": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const projectId = String(request?.projectId ?? "").trim();
              return supabaseBranchesByProjectId.get(projectId) ?? [];
            }
            case "supabase:get-edge-logs":
              return [];
            case "supabase:set-app-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              app.supabaseProjectId =
                typeof request?.projectId === "string"
                  ? request.projectId
                  : null;
              app.supabaseParentProjectId =
                typeof request?.parentProjectId === "string"
                  ? request.parentProjectId
                  : null;
              app.supabaseOrganizationSlug =
                typeof request?.organizationSlug === "string"
                  ? request.organizationSlug
                  : null;
              app.supabaseProjectName = app.supabaseProjectId
                ? (Array.from(supabaseProjectsByOrganizationSlug.values())
                    .flat()
                    .find((project) => project.id === app.supabaseProjectId)
                    ?.name ?? null)
                : null;
              appsById.set(appId, { ...app });
              return;
            }
            case "supabase:unset-app-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.app ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              app.supabaseProjectId = null;
              app.supabaseParentProjectId = null;
              app.supabaseOrganizationSlug = null;
              app.supabaseProjectName = null;
              appsById.set(appId, { ...app });
              return;
            }
            case "supabase:fake-connect-and-set-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const fakeProjectId = String(request?.fakeProjectId ?? "");
              if (!supabaseOrganizationsBySlug.has("fake-org-id")) {
                supabaseOrganizationsBySlug.set("fake-org-id", {
                  organizationSlug: "fake-org-id",
                  name: "Fake Organization",
                  ownerEmail: "owner@example.com",
                });
              }
              const app = appsById.get(appId);
              if (app) {
                app.supabaseProjectId = fakeProjectId;
                app.supabaseParentProjectId = null;
                app.supabaseOrganizationSlug = "fake-org-id";
                app.supabaseProjectName =
                  Array.from(supabaseProjectsByOrganizationSlug.values())
                    .flat()
                    .find((project) => project.id === fakeProjectId)?.name ??
                  "Fake Supabase Project";
                appsById.set(appId, { ...app });
              }
              state.settings.supabase = {
                ...(state.settings.supabase as Record<string, unknown>),
                organizations: {
                  ...(((
                    state.settings.supabase as {
                      organizations?: Record<string, unknown>;
                    }
                  )?.organizations ?? {}) as Record<string, unknown>),
                  "fake-org-id": {
                    accessToken: { value: "fake-access-token" },
                    refreshToken: { value: "fake-refresh-token" },
                    expiresIn: 3600,
                    tokenTimestamp: Date.now() / 1000,
                  },
                },
              };
              emit("deep-link-received", {
                type: "supabase-oauth-return",
                url: "https://supabase-oauth.dyad.sh/api/connect-supabase/login",
              });
              return;
            }
            case "neon:create-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              const projectName = String(request?.name ?? "").trim();
              if (!projectName) {
                throw new Error("Project name is required.");
              }
              const projectId = `test-neon-project-${appId}`;
              const developmentBranchId = `test-neon-branch-${appId}`;
              const previewBranchId = `test-neon-preview-${appId}`;
              app.neonProjectId = projectId;
              app.neonDevelopmentBranchId = developmentBranchId;
              app.neonPreviewBranchId = previewBranchId;
              appsById.set(appId, { ...app });
              neonProjectsByAppId.set(appId, {
                projectId,
                projectName,
                orgId: "test-org-id",
                developmentBranchId,
                previewBranchId,
              });
              return {
                id: projectId,
                name: projectName,
                connectionString: "postgresql://test:test@test.neon.tech/test",
                branchId: developmentBranchId,
              };
            }
            case "neon:get-project": {
              const request = (payload as { request?: Record<string, unknown> })
                ?.request;
              const appId = Number(request?.appId ?? 0);
              const app = appsById.get(appId);
              if (!app) {
                throw new Error("App not found");
              }
              const neonProject = neonProjectsByAppId.get(appId);
              if (!app.neonProjectId || !neonProject) {
                throw new Error("No Neon project found for this app");
              }
              return {
                projectId: neonProject.projectId,
                projectName: neonProject.projectName,
                orgId: neonProject.orgId,
                branches: [
                  {
                    type: "production",
                    branchId: neonProject.developmentBranchId,
                    branchName: "main",
                    lastUpdated: "2026-03-01T00:00:00Z",
                    parentBranchId: null,
                    parentBranchName: undefined,
                  },
                  {
                    type: "preview",
                    branchId: neonProject.previewBranchId,
                    branchName: "preview",
                    lastUpdated: "2026-03-01T00:01:00Z",
                    parentBranchId: neonProject.developmentBranchId,
                    parentBranchName: "main",
                  },
                ],
              };
            }
            case "neon:fake-connect":
              state.settings.neon = {
                accessToken: { value: "fake-neon-access-token" },
                refreshToken: { value: "fake-neon-refresh-token" },
                expiresIn: 3600,
                tokenTimestamp: Date.now() / 1000,
              };
              emit("deep-link-received", {
                type: "neon-oauth-return",
                url: "https://oauth.dyad.sh/api/integrations/neon/login",
              });
              return;
            case "does-release-note-exist":
              return { exists: false };
            case "test:set-node-mock": {
              const installed =
                typeof payload === "object" &&
                payload !== null &&
                "installed" in payload
                  ? ((payload as { installed?: boolean | null }).installed ??
                    null)
                  : null;
              persistNodeMockInstalled(installed);
              return;
            }
            case "nodejs-status":
              return getNodeStatus();
            case "select-node-folder":
              return {
                path: "C:/Program Files/nodejs",
                canceled: false,
                selectedPath: "C:/Program Files/nodejs",
              };
            case "open-external-url": {
              const url =
                typeof payload === "string"
                  ? payload
                  : typeof payload === "object" &&
                      payload !== null &&
                      "url" in payload &&
                      typeof (payload as { url?: unknown }).url === "string"
                    ? (payload as { url: string }).url
                    : null;
              if (url) {
                state.externalUrls.push(url);
              }
              return;
            }
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
          setNextSelectedAppFolder,
          setNextSelectedAppLocation,
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
