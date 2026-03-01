import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave U bridge", () => {
  it("maps collaborator mutation payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:invite-collaborator", {
        appId: 42,
        username: "chaemera-user",
      }),
    ).toEqual({
      request: {
        appId: 42,
        username: "chaemera-user",
      },
    });

    expect(
      buildTauriInvokeArgs("github:remove-collaborator", {
        appId: 42,
        username: "chaemera-user",
      }),
    ).toEqual({
      request: {
        appId: 42,
        username: "chaemera-user",
      },
    });
  });

  it("rejects malformed collaborator mutation payloads", () => {
    expect(canInvokeViaTauri("github:invite-collaborator", 42)).toBe(false);
    expect(canInvokeViaTauri("github:remove-collaborator", 42)).toBe(false);
  });
});
