import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave J bridge", () => {
  it("maps app read and update payloads for Tauri commands", () => {
    expect(buildTauriInvokeArgs("get-app", 42)).toEqual({
      appId: 42,
    });

    expect(
      buildTauriInvokeArgs("add-to-favorite", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("update-app-commands", {
        appId: 42,
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
      }),
    ).toEqual({
      request: {
        appId: 42,
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
      },
    });

    expect(
      buildTauriInvokeArgs("check-app-name", {
        appName: "chaemera-demo",
      }),
    ).toEqual({
      request: {
        appName: "chaemera-demo",
      },
    });
  });

  it("rejects malformed app bridge payloads", () => {
    expect(canInvokeViaTauri("get-app", { appId: 42 })).toBe(false);
    expect(canInvokeViaTauri("add-to-favorite", 42)).toBe(false);
    expect(canInvokeViaTauri("update-app-commands", "pnpm dev")).toBe(false);
    expect(canInvokeViaTauri("check-app-name", "chaemera-demo")).toBe(false);
  });
});
