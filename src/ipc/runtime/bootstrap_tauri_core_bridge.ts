import {
  TAURI_MIGRATION_CHANNEL_TO_COMMAND,
  TAURI_MIGRATION_EVENT_CHANNELS,
  TAURI_MIGRATION_INVOKE_CHANNELS,
} from "./core_domain_channels";
import { getAppRuntimeMetadata, getResolvedAppPath } from "./app_path_registry";

type TauriInvokeFn = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;
type TauriListenFn = (
  event: string,
  handler: (payload: unknown) => void,
) => Promise<() => void> | (() => void);

type TauriEventEnvelope = {
  payload?: unknown;
};

export interface TauriCoreBridge {
  supportedChannels: readonly string[];
  supportsInvoke?: (channel: string, payload: unknown) => boolean;
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
  on?: (channel: string, handler: (payload: unknown) => void) => () => void;
}

declare global {
  interface Window {
    __CHAEMERA_TAURI_CORE__?: TauriCoreBridge;
    __TAURI__?: {
      core?: {
        invoke?: TauriInvokeFn;
      };
      event?: {
        listen?: TauriListenFn;
      };
    };
    __TAURI_INTERNALS__?: {
      invoke?: TauriInvokeFn;
      event?: {
        listen?: TauriListenFn;
      };
    };
  }
}

function getRawTauriInvoke(): TauriInvokeFn | null {
  return (
    window.__TAURI__?.core?.invoke ?? window.__TAURI_INTERNALS__?.invoke ?? null
  );
}

function getRawTauriListen(): TauriListenFn | null {
  return (
    window.__TAURI__?.event?.listen ??
    window.__TAURI_INTERNALS__?.event?.listen ??
    null
  );
}

function normalizeTauriEventPayload(payload: unknown): unknown {
  if (typeof payload === "object" && payload !== null && "payload" in payload) {
    return (payload as TauriEventEnvelope).payload;
  }
  return payload;
}

export function buildTauriInvokeArgs(
  channel: string,
  payload: unknown,
): Record<string, unknown> | undefined {
  const payloadRecord =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;

  switch (channel) {
    case "create-app":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "get-app":
      return typeof payload === "number" ? { appId: payload } : undefined;
    case "delete-app":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "copy-app":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "rename-app":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "get-chat":
      return typeof payload === "number" ? { chatId: payload } : undefined;
    case "get-chats":
      return typeof payload === "number" ? { appId: payload } : undefined;
    case "create-chat":
      return typeof payload === "number" ? { appId: payload } : undefined;
    case "set-user-settings":
      return payloadRecord ? { patch: payloadRecord } : undefined;
    case "show-item-in-folder":
      return typeof payload === "string" ? { fullPath: payload } : undefined;
    case "select-app-location":
      return payloadRecord?.defaultPath
        ? { defaultPath: payloadRecord.defaultPath }
        : undefined;
    case "check-ai-rules":
      return payloadRecord?.path ? { path: payloadRecord.path } : undefined;
    case "read-app-file": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const filePath =
        typeof payloadRecord?.filePath === "string"
          ? payloadRecord.filePath
          : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath || !filePath) {
        return undefined;
      }
      return { appPath, filePath };
    }
    case "edit-app-file": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const filePath =
        typeof payloadRecord?.filePath === "string"
          ? payloadRecord.filePath
          : null;
      const content =
        typeof payloadRecord?.content === "string"
          ? payloadRecord.content
          : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath || !filePath || content === null) {
        return undefined;
      }
      return { request: { appId, appPath, filePath, content } };
    }
    case "check-problems": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath) {
        return undefined;
      }
      return { request: { appId, appPath } };
    }
    case "plan:create":
    case "plan:get":
    case "plan:get-for-chat":
    case "plan:update-plan":
    case "plan:delete": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath || !payloadRecord) {
        return undefined;
      }
      return { request: { ...payloadRecord, appId, appPath } };
    }
    case "add-to-favorite":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "update-app-commands":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "check-app-name":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "search-app":
      return typeof payload === "string" ? { query: payload } : undefined;
    case "update-chat":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "search-chats":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "set-app-theme":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "get-app-theme":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "create-custom-theme":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "update-custom-theme":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "delete-custom-theme":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "prompts:create":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "prompts:update":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:start-flow":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:get-repo-branches":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:is-repo-available":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:create-repo":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:connect-existing-repo":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:push":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:fetch":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:pull":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:rebase":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:rebase-abort":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:merge-abort":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:rebase-continue":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:list-local-branches":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:list-remote-branches":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:get-conflicts":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:get-git-state":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "github:list-collaborators":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "delete-chat":
      return typeof payload === "number" ? { chatId: payload } : undefined;
    case "delete-messages":
      return typeof payload === "number" ? { chatId: payload } : undefined;
    case "prompts:delete":
      return typeof payload === "number" ? { promptId: payload } : undefined;
    case "github:disconnect":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "git:get-uncommitted-files":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "search-app-files": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const query =
        typeof payloadRecord?.query === "string" ? payloadRecord.query : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath || !query) {
        return undefined;
      }
      return { appPath, query };
    }
    case "change-app-location":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "list-versions":
    case "get-current-branch": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const appPath = appId !== null ? getResolvedAppPath(appId) : null;
      if (!appPath) {
        return undefined;
      }
      return { appPath };
    }
    case "rename-branch":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "run-app":
    case "restart-app": {
      const appId =
        typeof payloadRecord?.appId === "number" ? payloadRecord.appId : null;
      const metadata = appId !== null ? getAppRuntimeMetadata(appId) : null;
      if (!metadata) {
        return undefined;
      }
      return {
        request: {
          appId,
          appPath: metadata.resolvedPath,
          installCommand: metadata.installCommand,
          startCommand: metadata.startCommand,
          ...(channel === "restart-app"
            ? {
                removeNodeModules:
                  typeof payloadRecord?.removeNodeModules === "boolean"
                    ? payloadRecord.removeNodeModules
                    : false,
              }
            : {}),
        },
      };
    }
    case "stop-app":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "respond-to-app-input":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "chat:stream":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "does-release-note-exist":
    case "upload-to-signed-url":
    case "agent-tool:set-consent":
    case "agent-tool:consent-response":
    case "mcp:create-server":
    case "mcp:update-server":
    case "mcp:set-tool-consent":
    case "mcp:tool-consent-response":
    case "vercel:save-token":
    case "vercel:is-project-available":
    case "generate-theme-prompt":
    case "generate-theme-from-url":
    case "save-theme-image":
    case "cleanup-theme-images":
    case "apply-visual-editing-changes":
    case "analyze-component":
    case "leptos:render-route":
    case "add-log":
    case "clear-logs":
      return payloadRecord ? { request: payloadRecord } : undefined;
    case "open-external-url":
      return typeof payload === "string" ? { url: payload } : undefined;
    case "chat:cancel":
      return typeof payload === "number" ? { chatId: payload } : undefined;
    case "mcp:delete-server":
    case "mcp:list-tools":
      return typeof payload === "number" ? { serverId: payload } : undefined;
    default:
      return undefined;
  }
}

export function canInvokeViaTauri(channel: string, payload: unknown): boolean {
  if (!(channel in TAURI_MIGRATION_CHANNEL_TO_COMMAND)) {
    return false;
  }

  const mappedArgs = buildTauriInvokeArgs(channel, payload);
  switch (channel) {
    case "set-user-settings":
    case "create-app":
    case "get-app":
    case "search-app":
    case "delete-app":
    case "copy-app":
    case "rename-app":
    case "get-chat":
    case "create-chat":
    case "show-item-in-folder":
    case "check-ai-rules":
    case "add-to-favorite":
    case "update-app-commands":
    case "check-app-name":
    case "update-chat":
    case "delete-chat":
    case "delete-messages":
    case "search-chats":
    case "set-app-theme":
    case "get-app-theme":
    case "create-custom-theme":
    case "update-custom-theme":
    case "delete-custom-theme":
    case "github:start-flow":
    case "github:get-repo-branches":
    case "github:is-repo-available":
    case "github:create-repo":
    case "github:connect-existing-repo":
    case "github:push":
    case "github:fetch":
    case "github:pull":
    case "github:rebase":
    case "github:rebase-abort":
    case "github:merge-abort":
    case "github:rebase-continue":
    case "github:list-local-branches":
    case "github:list-remote-branches":
    case "github:get-conflicts":
    case "github:get-git-state":
    case "github:list-collaborators":
    case "prompts:create":
    case "prompts:update":
    case "prompts:delete":
    case "github:disconnect":
    case "git:get-uncommitted-files":
    case "read-app-file":
    case "edit-app-file":
    case "check-problems":
    case "plan:create":
    case "plan:get":
    case "plan:get-for-chat":
    case "plan:update-plan":
    case "plan:delete":
    case "search-app-files":
    case "change-app-location":
    case "list-versions":
    case "get-current-branch":
    case "rename-branch":
    case "run-app":
    case "restart-app":
    case "chat:stream":
    case "chat:cancel":
    case "stop-app":
    case "respond-to-app-input":
    case "agent-tool:set-consent":
    case "agent-tool:consent-response":
    case "mcp:create-server":
    case "mcp:update-server":
    case "mcp:delete-server":
    case "mcp:list-tools":
    case "mcp:set-tool-consent":
    case "mcp:tool-consent-response":
    case "vercel:save-token":
    case "vercel:is-project-available":
    case "does-release-note-exist":
    case "upload-to-signed-url":
    case "generate-theme-prompt":
    case "generate-theme-from-url":
    case "save-theme-image":
    case "cleanup-theme-images":
    case "apply-visual-editing-changes":
    case "analyze-component":
    case "leptos:render-route":
    case "add-log":
    case "clear-logs":
    case "open-external-url":
      return mappedArgs !== undefined;
    default:
      return true;
  }
}

export function bootstrapTauriCoreBridge(): void {
  if (typeof window === "undefined") return;
  if (window.__CHAEMERA_TAURI_CORE__) return;

  const invoke = getRawTauriInvoke();
  if (!invoke) return;

  const listen = getRawTauriListen();

  window.__CHAEMERA_TAURI_CORE__ = {
    supportedChannels: [
      ...TAURI_MIGRATION_INVOKE_CHANNELS,
      ...TAURI_MIGRATION_EVENT_CHANNELS,
    ],
    supportsInvoke: (channel, payload) => canInvokeViaTauri(channel, payload),
    invoke: async (channel, payload) => {
      const command =
        TAURI_MIGRATION_CHANNEL_TO_COMMAND[
          channel as keyof typeof TAURI_MIGRATION_CHANNEL_TO_COMMAND
        ];

      if (!command) {
        throw new Error(
          `No Tauri core command mapping is defined for channel "${channel}".`,
        );
      }

      const args = buildTauriInvokeArgs(channel, payload);
      return invoke(command, args);
    },
    on: listen
      ? (channel, handler) => {
          const unlisten = listen(channel, (eventPayload) => {
            handler(normalizeTauriEventPayload(eventPayload));
          });
          if (typeof unlisten === "function") {
            return unlisten;
          }
          let disposed = false;
          void unlisten.then((dispose) => {
            if (disposed) {
              dispose();
            } else {
              cleanup = dispose;
            }
          });

          let cleanup = () => {
            disposed = true;
          };
          return () => cleanup();
        }
      : undefined,
  };
}
