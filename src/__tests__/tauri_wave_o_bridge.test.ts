import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave O bridge", () => {
  it("maps GitHub API and disconnect payloads for Tauri commands", () => {
    expect(buildTauriInvokeArgs("github:list-repos", undefined)).toBe(
      undefined,
    );

    expect(
      buildTauriInvokeArgs("github:get-repo-branches", {
        owner: "chaemera",
        repo: "core",
      }),
    ).toEqual({
      request: {
        owner: "chaemera",
        repo: "core",
      },
    });

    expect(
      buildTauriInvokeArgs("github:is-repo-available", {
        org: "chaemera",
        repo: "core",
      }),
    ).toEqual({
      request: {
        org: "chaemera",
        repo: "core",
      },
    });

    expect(
      buildTauriInvokeArgs("github:list-collaborators", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("github:disconnect", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });
  });

  it("rejects malformed GitHub payloads", () => {
    expect(canInvokeViaTauri("github:list-repos", undefined)).toBe(true);
    expect(canInvokeViaTauri("github:get-repo-branches", "chaemera/core")).toBe(
      false,
    );
    expect(canInvokeViaTauri("github:is-repo-available", "chaemera/core")).toBe(
      false,
    );
    expect(canInvokeViaTauri("github:list-collaborators", 42)).toBe(false);
    expect(canInvokeViaTauri("github:disconnect", 42)).toBe(false);
  });
});
