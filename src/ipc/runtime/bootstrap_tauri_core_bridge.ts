import {
  SPRINT_3_TAURI_CHANNEL_TO_COMMAND,
  SPRINT_3_TAURI_INVOKE_CHANNELS,
} from "./core_domain_channels";

type TauriInvokeFn = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
type TauriListenFn = (
  event: string,
  handler: (payload: unknown) => void,
) => Promise<() => void> | (() => void);

export interface TauriCoreBridge {
  supportedChannels: readonly string[];
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
    window.__TAURI__?.core?.invoke ??
    window.__TAURI_INTERNALS__?.invoke ??
    null
  );
}

function getRawTauriListen(): TauriListenFn | null {
  return (
    window.__TAURI__?.event?.listen ??
    window.__TAURI_INTERNALS__?.event?.listen ??
    null
  );
}

function mapTauriArgs(channel: string, payload: unknown): Record<string, unknown> | undefined {
  switch (channel) {
    case "set-user-settings":
      return { patch: payload as Record<string, unknown> };
    default:
      return undefined;
  }
}

export function bootstrapTauriCoreBridge(): void {
  if (typeof window === "undefined") return;
  if (window.__CHAEMERA_TAURI_CORE__) return;

  const invoke = getRawTauriInvoke();
  if (!invoke) return;

  const listen = getRawTauriListen();

  window.__CHAEMERA_TAURI_CORE__ = {
    supportedChannels: SPRINT_3_TAURI_INVOKE_CHANNELS,
    invoke: async (channel, payload) => {
      const command =
        SPRINT_3_TAURI_CHANNEL_TO_COMMAND[
          channel as keyof typeof SPRINT_3_TAURI_CHANNEL_TO_COMMAND
        ];

      if (!command) {
        throw new Error(
          `No Tauri core command mapping is defined for channel "${channel}".`,
        );
      }

      return invoke(command, mapTauriArgs(channel, payload));
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

