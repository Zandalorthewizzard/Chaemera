import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEventTransport,
  getInvokeTransport,
} from "@/ipc/runtime/desktop_runtime";

type ElectronRendererMock = {
  invoke: (channel: string, payload: unknown) => Promise<unknown>;
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void;
};

type ElectronWindowMock = Window & {
  electron?: {
    ipcRenderer?: ElectronRendererMock;
  };
};

describe("desktop runtime transport selection", () => {
  beforeEach(() => {
    delete (
      window as typeof window & {
        __CHAEMERA_TAURI_CORE__?: unknown;
      }
    ).__CHAEMERA_TAURI_CORE__;

    delete (
      window as typeof window & {
        electron?: unknown;
      }
    ).electron;
  });

  it("does not fall back to Electron for migrated invoke channels when Tauri is present", () => {
    const electronInvoke = vi.fn();

    (window as ElectronWindowMock).electron = {
      ipcRenderer: {
        invoke: electronInvoke,
        on: () => () => {},
      },
    };

    window.__CHAEMERA_TAURI_CORE__ = {
      supportedChannels: [],
      invoke: vi.fn().mockResolvedValue(undefined),
      on: () => () => {},
    };

    expect(() => getInvokeTransport("create-app", { name: "demo" })).toThrow(
      "Tauri core bridge is present",
    );
    expect(electronInvoke).not.toHaveBeenCalled();
  });

  it("still allows Electron fallback for non-migrated channels", async () => {
    const electronInvoke = vi.fn().mockResolvedValue({ ok: true });

    (window as ElectronWindowMock).electron = {
      ipcRenderer: {
        invoke: electronInvoke,
        on: () => () => {},
      },
    };

    window.__CHAEMERA_TAURI_CORE__ = {
      supportedChannels: ["create-app"],
      invoke: vi.fn().mockResolvedValue(undefined),
      on: () => () => {},
    };

    const transport = getInvokeTransport("legacy:test-channel", {
      nodePath: "C:/Program Files/nodejs",
    });

    expect(transport?.kind).toBe("electron");
    await transport?.invoke("legacy:test-channel", {
      nodePath: "C:/Program Files/nodejs",
    });
    expect(electronInvoke).toHaveBeenCalledWith("legacy:test-channel", {
      nodePath: "C:/Program Files/nodejs",
    });
  });

  it("does not fall back to Electron for migrated event channels when Tauri is present", () => {
    const electronOn = vi.fn();

    (window as ElectronWindowMock).electron = {
      ipcRenderer: {
        invoke: vi.fn().mockResolvedValue(undefined),
        on: electronOn,
      },
    };

    window.__CHAEMERA_TAURI_CORE__ = {
      supportedChannels: [],
      invoke: vi.fn().mockResolvedValue(undefined),
      on: () => () => {},
    };

    expect(() => getEventTransport("chat:response:end")).toThrow(
      "Tauri core bridge is present",
    );
    expect(electronOn).not.toHaveBeenCalled();
  });
});
