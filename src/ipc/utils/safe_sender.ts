import log from "electron-log";
import type { IpcSenderLike } from "./ipc_sender_types";

/**
 * Sends an IPC message to the renderer only if the provided sender is
 * still alive. This prevents `Object has been destroyed` errors that can occur
 * when asynchronous callbacks attempt to communicate after the window has
 * already been closed (e.g. during e2e test teardown).
 */
export function safeSend(
  sender: IpcSenderLike | null | undefined,
  channel: string,
  ...args: unknown[]
): void {
  if (!sender) return;
  if (typeof sender.isDestroyed === "function" && sender.isDestroyed()) return;
  // @ts-ignore – `isCrashed` exists at runtime but is not in the type defs
  if (typeof sender.isCrashed === "function" && sender.isCrashed()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – allow variadic args beyond `data`
    sender.send(channel, ...args);
  } catch (error) {
    log.debug(
      `safeSend: failed to send on channel "${channel}" because: ${(error as Error).message}`,
    );
  }
}
