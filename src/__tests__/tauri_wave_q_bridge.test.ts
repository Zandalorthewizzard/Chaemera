import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave Q bridge", () => {
  it("maps GitHub repo setup payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:create-repo", {
        org: "",
        repo: "Chaemera Demo",
        appId: 42,
        branch: "main",
      }),
    ).toEqual({
      request: {
        org: "",
        repo: "Chaemera Demo",
        appId: 42,
        branch: "main",
      },
    });

    expect(
      buildTauriInvokeArgs("github:connect-existing-repo", {
        owner: "chaemera",
        repo: "core",
        branch: "main",
        appId: 42,
      }),
    ).toEqual({
      request: {
        owner: "chaemera",
        repo: "core",
        branch: "main",
        appId: 42,
      },
    });
  });

  it("rejects malformed GitHub repo setup payloads", () => {
    expect(canInvokeViaTauri("github:create-repo", "chaemera/core")).toBe(
      false,
    );
    expect(
      canInvokeViaTauri("github:connect-existing-repo", "chaemera/core"),
    ).toBe(false);
  });
});
