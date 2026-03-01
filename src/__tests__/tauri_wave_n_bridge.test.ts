import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave N bridge", () => {
  it("maps app search payloads for Tauri commands", () => {
    expect(buildTauriInvokeArgs("search-app", "chaemera")).toEqual({
      query: "chaemera",
    });
  });

  it("rejects malformed app search payloads", () => {
    expect(canInvokeViaTauri("search-app", { query: "chaemera" })).toBe(false);
    expect(canInvokeViaTauri("search-app", 42)).toBe(false);
  });
});
