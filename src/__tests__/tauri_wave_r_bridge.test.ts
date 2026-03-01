import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave R bridge", () => {
  it("maps GitHub branch-state payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:list-local-branches", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:list-remote-branches", {
        appId: 42,
        remote: "origin",
      }),
    ).toEqual({
      request: {
        appId: 42,
        remote: "origin",
      },
    });

    expect(
      buildTauriInvokeArgs("github:get-conflicts", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:get-git-state", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("git:get-uncommitted-files", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });
  });

  it("rejects malformed GitHub branch-state payloads", () => {
    expect(canInvokeViaTauri("github:list-local-branches", 42)).toBe(false);
    expect(canInvokeViaTauri("github:list-remote-branches", 42)).toBe(false);
    expect(canInvokeViaTauri("github:get-conflicts", 42)).toBe(false);
    expect(canInvokeViaTauri("github:get-git-state", 42)).toBe(false);
    expect(canInvokeViaTauri("git:get-uncommitted-files", 42)).toBe(false);
  });
});
