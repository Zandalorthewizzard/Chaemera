import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave P bridge", () => {
  it("maps GitHub auth flow payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:start-flow", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });
  });

  it("rejects malformed GitHub auth flow payloads", () => {
    expect(canInvokeViaTauri("github:start-flow", 42)).toBe(false);
    expect(canInvokeViaTauri("github:start-flow", null)).toBe(false);
  });
});
