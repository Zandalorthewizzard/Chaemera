import {
  TAURI_MIGRATION_CHANNEL_TO_COMMAND,
  TAURI_MIGRATION_INVOKE_CHANNELS,
} from "./core_domain_channels";
import { getResolvedAppPath } from "./app_path_registry";

type TauriInvokeFn = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>;
type TauriListenFn = (
  event: string,
  handler: (payload: unknown) => void,
) => Promise<() => void> | (() => void);

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

export function buildTauriInvokeArgs(
  channel: string,
  payload: unknown,
): Record<string, unknown> | undefined {
  const payloadRecord =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;

  switch (channel) {
    case "set-user-settings":
      return payloadRecord ? { patch: payloadRecord } : undefined;
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
    case "check-ai-rules":
    case "read-app-file":
    case "search-app-files":
    case "list-versions":
    case "get-current-branch":
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
    supportedChannels: TAURI_MIGRATION_INVOKE_CHANNELS,
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
          const unlisten = listen(channel, handler);
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
