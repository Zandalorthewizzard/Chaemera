import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AJ bridge", () => {
  it("maps session debug bundle requests from chat ids", () => {
    expect(buildTauriInvokeArgs("get-session-debug-bundle", 42)).toEqual({
      chatId: 42,
    });
  });

  it("rejects malformed session debug bundle payloads", () => {
    expect(canInvokeViaTauri("get-session-debug-bundle", 42)).toBe(true);
    expect(canInvokeViaTauri("get-session-debug-bundle", "42")).toBe(false);
  });
});
