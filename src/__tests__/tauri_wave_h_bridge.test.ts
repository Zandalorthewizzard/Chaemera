import { describe, expect, it } from "vitest";
import { canInvokeViaTauri } from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave H bridge", () => {
  it("keeps reset-all eligible for Tauri invoke transport", () => {
    expect(canInvokeViaTauri("reset-all", undefined)).toBe(true);
  });
});
