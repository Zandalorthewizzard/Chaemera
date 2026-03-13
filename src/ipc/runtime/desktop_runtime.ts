import {
  isTauriMigrationEventChannel,
  isTauriMigrationInvokeChannel,
} from "./core_domain_channels";

type ElectronIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
};

type TauriBridge = NonNullable<Window["__CHAEMERA_TAURI_CORE__"]>;

type InvokeTransport = {
  kind: "electron" | "tauri";
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
};

type EventTransport = {
  kind: "electron" | "tauri";
  on: (channel: string, handler: (payload: unknown) => void) => () => void;
};

function getElectronIpcRenderer(): ElectronIpcRenderer | null {
  return (
    (window as unknown as { electron?: { ipcRenderer?: ElectronIpcRenderer } })
      .electron?.ipcRenderer ?? null
  );
}

function getTauriCoreBridge(): TauriBridge | null {
  return window.__CHAEMERA_TAURI_CORE__ ?? null;
}

function tauriSupportsChannel(bridge: TauriBridge, channel: string): boolean {
  return bridge.supportedChannels.includes(channel);
}

function tauriCanInvoke(
  bridge: TauriBridge,
  channel: string,
  payload: unknown,
): boolean {
  if (typeof bridge.supportsInvoke === "function") {
    return bridge.supportsInvoke(channel, payload);
  }
  return true;
}

export function getInvokeTransport(
  channel: string,
  payload: unknown,
): InvokeTransport | null {
  const tauri = getTauriCoreBridge();
  if (tauri && isTauriMigrationInvokeChannel(channel)) {
    if (!tauriSupportsChannel(tauri, channel)) {
      throw new Error(
        `[${channel}] Tauri core bridge is present but this channel is not marked as supported yet.`,
      );
    }

    if (!tauriCanInvoke(tauri, channel, payload)) {
      throw new Error(
        `[${channel}] Tauri core bridge is present but the payload is not ready for the mapped command arguments yet.`,
      );
    }

    return {
      kind: "tauri",
      invoke: (targetChannel, invokePayload) =>
        tauri.invoke(targetChannel, invokePayload),
    };
  }

  const electron = getElectronIpcRenderer();
  if (electron) {
    return {
      kind: "electron",
      invoke: (targetChannel, payload) =>
        electron.invoke(targetChannel, payload),
    };
  }

  return null;
}

export function getEventTransport(channel: string): EventTransport | null {
  const tauri = getTauriCoreBridge();
  if (tauri && isTauriMigrationEventChannel(channel)) {
    if (!tauri.on) {
      throw new Error(
        `[${channel}] Tauri core bridge is present but no event bridge is available.`,
      );
    }

    if (!tauriSupportsChannel(tauri, channel)) {
      throw new Error(
        `[${channel}] Tauri core bridge is present but this event channel is not marked as supported yet.`,
      );
    }

    return {
      kind: "tauri",
      on: (targetChannel, handler) => tauri.on!(targetChannel, handler),
    };
  }

  const electron = getElectronIpcRenderer();
  if (electron) {
    return {
      kind: "electron",
      on: (targetChannel, handler) => electron.on(targetChannel, handler),
    };
  }

  return null;
}
