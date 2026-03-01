import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AE bridge", () => {
  it("wraps upgrade and checkout payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("get-app-upgrades", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("execute-app-upgrade", {
        appId: 7,
        upgradeId: "capacitor",
      }),
    ).toEqual({
      request: {
        appId: 7,
        upgradeId: "capacitor",
      },
    });

    expect(
      buildTauriInvokeArgs("checkout-version", {
        appId: 7,
        versionId: "abc123",
      }),
    ).toEqual({
      request: {
        appId: 7,
        versionId: "abc123",
      },
    });
  });

  it("rejects malformed upgrade and version payloads", () => {
    expect(canInvokeViaTauri("get-app-upgrades", 7)).toBe(false);
    expect(canInvokeViaTauri("execute-app-upgrade", "capacitor")).toBe(false);
    expect(canInvokeViaTauri("checkout-version", "abc123")).toBe(false);
  });
});
