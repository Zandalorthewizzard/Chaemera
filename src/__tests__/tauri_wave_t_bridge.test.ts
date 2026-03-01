import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave T bridge", () => {
  it("maps GitHub branch mutation and git commit payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:create-branch", {
        appId: 42,
        branch: "feature/tauri",
        from: "main",
      }),
    ).toEqual({
      request: {
        appId: 42,
        branch: "feature/tauri",
        from: "main",
      },
    });

    expect(
      buildTauriInvokeArgs("github:switch-branch", {
        appId: 42,
        branch: "feature/tauri",
      }),
    ).toEqual({
      request: {
        appId: 42,
        branch: "feature/tauri",
      },
    });

    expect(
      buildTauriInvokeArgs("github:delete-branch", {
        appId: 42,
        branch: "feature/tauri",
      }),
    ).toEqual({
      request: {
        appId: 42,
        branch: "feature/tauri",
      },
    });

    expect(
      buildTauriInvokeArgs("github:rename-branch", {
        appId: 42,
        oldBranch: "feature/tauri",
        newBranch: "feature/leptos",
      }),
    ).toEqual({
      request: {
        appId: 42,
        oldBranch: "feature/tauri",
        newBranch: "feature/leptos",
      },
    });

    expect(
      buildTauriInvokeArgs("github:merge-branch", {
        appId: 42,
        branch: "feature/leptos",
      }),
    ).toEqual({
      request: {
        appId: 42,
        branch: "feature/leptos",
      },
    });

    expect(
      buildTauriInvokeArgs("git:commit-changes", {
        appId: 42,
        message: "chore: checkpoint",
      }),
    ).toEqual({
      request: {
        appId: 42,
        message: "chore: checkpoint",
      },
    });
  });

  it("rejects malformed branch mutation and git commit payloads", () => {
    expect(canInvokeViaTauri("github:create-branch", 42)).toBe(false);
    expect(canInvokeViaTauri("github:switch-branch", 42)).toBe(false);
    expect(canInvokeViaTauri("github:delete-branch", 42)).toBe(false);
    expect(canInvokeViaTauri("github:rename-branch", 42)).toBe(false);
    expect(canInvokeViaTauri("github:merge-branch", 42)).toBe(false);
    expect(canInvokeViaTauri("git:commit-changes", 42)).toBe(false);
  });
});
