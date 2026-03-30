import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave G bridge", () => {
  it("maps system utility invoke payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("show-item-in-folder", "C:/Apps/demo-app"),
    ).toEqual({
      fullPath: "C:/Apps/demo-app",
    });

    expect(
      buildTauriInvokeArgs("does-release-note-exist", {
        version: "0.37.0-beta.2",
      }),
    ).toEqual({
      request: {
        version: "0.37.0-beta.2",
      },
    });

    expect(
      buildTauriInvokeArgs("upload-to-signed-url", {
        url: "https://example.com/upload",
        contentType: "application/json",
        data: { ok: true },
      }),
    ).toEqual({
      request: {
        url: "https://example.com/upload",
        contentType: "application/json",
        data: { ok: true },
      },
    });
  });

  it("keeps no-arg system utility commands eligible for Tauri", () => {
    expect(canInvokeViaTauri("get-system-debug-info", undefined)).toBe(true);
    expect(canInvokeViaTauri("nodejs-status", undefined)).toBe(true);
    expect(canInvokeViaTauri("select-node-folder", undefined)).toBe(true);
    expect(canInvokeViaTauri("get-node-path", undefined)).toBe(true);
    expect(canInvokeViaTauri("clear-session-data", undefined)).toBe(true);
    expect(canInvokeViaTauri("reload-env-path", undefined)).toBe(true);
    expect(canInvokeViaTauri("get-user-budget", undefined)).toBe(true);
    expect(canInvokeViaTauri("restart-desktop", undefined)).toBe(true);
    expect(canInvokeViaTauri("test:set-node-mock", { installed: true })).toBe(
      true,
    );
  });

  it("rejects malformed payloads for mapped system utility commands", () => {
    expect(
      canInvokeViaTauri("show-item-in-folder", { path: "C:/Apps/demo" }),
    ).toBe(false);
    expect(canInvokeViaTauri("does-release-note-exist", "0.37.0-beta.2")).toBe(
      false,
    );
    expect(
      canInvokeViaTauri("upload-to-signed-url", "https://example.com/upload"),
    ).toBe(false);
  });
});
