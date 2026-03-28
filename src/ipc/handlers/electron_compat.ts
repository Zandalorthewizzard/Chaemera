import type { IpcSenderLike } from "../utils/ipc_sender_types";

type IpcMainInvokeEvent = {
  sender: IpcSenderLike;
  frameId: number;
  processId: number;
  senderFrame: unknown;
  type: string;
};

type DialogResult = {
  canceled: boolean;
  filePaths: string[];
};

type BrowserWindowLike = {
  isDestroyed?: () => boolean;
  webContents?: IpcSenderLike;
  capturePage?: () => Promise<{ isEmpty: () => boolean } | null>;
};

function noopAsync<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export const ipcMain = {
  handle: (_channel: string, _listener: (...args: any[]) => any) => {
    // Legacy registration is intentionally inert in the Tauri runtime.
  },
};

export const app = {
  relaunch: () => {
    // No-op in the Tauri runtime.
  },
  quit: () => {
    // No-op in the Tauri runtime.
  },
};

export const dialog = {
  showOpenDialog: async (_options?: unknown): Promise<DialogResult> =>
    noopAsync({ canceled: true, filePaths: [] }),
};

export const shell = {
  openExternal: async (_url: string) => {
    // No-op in the Tauri runtime.
  },
  showItemInFolder: (_path: string) => {
    // No-op in the Tauri runtime.
  },
};

export const session = {
  defaultSession: {
    clearStorageData: async (_options: unknown) => {
      // No-op in the Tauri runtime.
    },
  },
};

export const clipboard = {
  writeImage: (_image: unknown) => {
    // No-op in the Tauri runtime.
  },
};

export const BrowserWindow = {
  fromWebContents: (_sender: IpcSenderLike): BrowserWindowLike | null => null,
  getFocusedWindow: (): BrowserWindowLike | null => null,
};

export type { IpcMainInvokeEvent };
