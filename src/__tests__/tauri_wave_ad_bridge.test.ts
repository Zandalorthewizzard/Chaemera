import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AD bridge", () => {
  it("wraps import-app payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("import-app", {
        path: "C:/Projects/source-app",
        appName: "source-app",
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
        skipCopy: false,
      }),
    ).toEqual({
      request: {
        path: "C:/Projects/source-app",
        appName: "source-app",
        installCommand: "pnpm install",
        startCommand: "pnpm dev",
        skipCopy: false,
      },
    });
  });

  it("rejects malformed import-app payloads", () => {
    expect(canInvokeViaTauri("import-app", undefined)).toBe(false);
  });
});
