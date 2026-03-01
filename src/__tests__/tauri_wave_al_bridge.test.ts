import { describe, expect, it } from "vitest";
import { canInvokeViaTauri } from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AL bridge", () => {
  it("supports void screenshot invocations", () => {
    expect(canInvokeViaTauri("take-screenshot", undefined)).toBe(true);
  });
});
