import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave V bridge", () => {
  it("maps GitHub clone-from-url payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("github:clone-repo-from-url", {
        url: "https://github.com/chaemera/core.git",
        appName: "core-clone",
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
      }),
    ).toEqual({
      request: {
        url: "https://github.com/chaemera/core.git",
        appName: "core-clone",
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
      },
    });
  });

  it("rejects malformed clone-from-url payloads", () => {
    expect(canInvokeViaTauri("github:clone-repo-from-url", 42)).toBe(false);
  });
});
