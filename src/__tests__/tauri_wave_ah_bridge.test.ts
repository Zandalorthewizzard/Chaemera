import { describe, expect, it } from "vitest";
import { canInvokeViaTauri } from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AH bridge", () => {
  it("supports free agent quota status without payload", () => {
    expect(canInvokeViaTauri("free-agent-quota:get-status", undefined)).toBe(
      true,
    );
  });
});
