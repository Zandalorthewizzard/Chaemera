import {
  isCoreDomainEventChannel,
  isSprint3TauriInvokeChannel,
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
  return ((window as unknown as { electron?: { ipcRenderer?: ElectronIpcRenderer } })
    .electron?.ipcRenderer ??
    null);
}

function getTauriCoreBridge(): TauriBridge | null {
  return window.__CHAEMERA_TAURI_CORE__ ?? null;
}

function tauriSupportsChannel(bridge: TauriBridge, channel: string): boolean {
  return bridge.supportedChannels.includes(channel);
}

export function getInvokeTransport(channel: string): InvokeTransport | null {
  const tauri = getTauriCoreBridge();
  if (tauri && isSprint3TauriInvokeChannel(channel) && tauriSupportsChannel(tauri, channel)) {
    return {
      kind: "tauri",
      invoke: (targetChannel, payload) => tauri.invoke(targetChannel, payload),
    };
  }

  const electron = getElectronIpcRenderer();
  if (electron) {
    return {
      kind: "electron",
      invoke: (targetChannel, payload) => electron.invoke(targetChannel, payload),
    };
  }

  if (tauri && isSprint3TauriInvokeChannel(channel)) {
    throw new Error(
      `[${channel}] Tauri core bridge is present but this channel is not marked as supported yet.`,
    );
  }

  return null;
}

export function getEventTransport(channel: string): EventTransport | null {
  const tauri = getTauriCoreBridge();
  if (tauri?.on && isCoreDomainEventChannel(channel) && tauriSupportsChannel(tauri, channel)) {
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

