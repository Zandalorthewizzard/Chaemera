import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AF bridge", () => {
  it("maps security review requests from app ids", () => {
    expect(buildTauriInvokeArgs("get-latest-security-review", 7)).toEqual({
      appId: 7,
    });
  });

  it("rejects malformed security review payloads", () => {
    expect(canInvokeViaTauri("get-latest-security-review", 7)).toBe(true);
    expect(canInvokeViaTauri("get-latest-security-review", "7")).toBe(false);
  });
});
