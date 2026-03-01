import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave S bridge", () => {
  it("maps GitHub sync payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:push", {
        appId: 42,
        force: true,
        forceWithLease: false,
      }),
    ).toEqual({
      request: {
        appId: 42,
        force: true,
        forceWithLease: false,
      },
    });

    expect(
      buildTauriInvokeArgs("github:fetch", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:pull", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:rebase", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:rebase-abort", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:merge-abort", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:rebase-continue", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });
  });

  it("rejects malformed GitHub sync payloads", () => {
    expect(canInvokeViaTauri("github:push", 42)).toBe(false);
    expect(canInvokeViaTauri("github:fetch", 42)).toBe(false);
    expect(canInvokeViaTauri("github:pull", 42)).toBe(false);
    expect(canInvokeViaTauri("github:rebase", 42)).toBe(false);
    expect(canInvokeViaTauri("github:rebase-abort", 42)).toBe(false);
    expect(canInvokeViaTauri("github:merge-abort", 42)).toBe(false);
    expect(canInvokeViaTauri("github:rebase-continue", 42)).toBe(false);
  });
});
