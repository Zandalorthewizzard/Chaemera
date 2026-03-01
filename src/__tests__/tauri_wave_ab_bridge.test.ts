import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AB bridge", () => {
  it("wraps workspace-config payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("get-app-env-vars", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("set-app-env-vars", {
        appId: 7,
        envVars: [{ key: "OPENAI_API_KEY", value: "test-key" }],
      }),
    ).toEqual({
      request: {
        appId: 7,
        envVars: [{ key: "OPENAI_API_KEY", value: "test-key" }],
      },
    });

    expect(
      buildTauriInvokeArgs("get-context-paths", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("set-context-paths", {
        appId: 7,
        chatContext: {
          contextPaths: [{ globPath: "src/**/*.ts" }],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
      }),
    ).toEqual({
      request: {
        appId: 7,
        chatContext: {
          contextPaths: [{ globPath: "src/**/*.ts" }],
          smartContextAutoIncludes: [],
          excludePaths: [],
        },
      },
    });
  });

  it("accepts argument-less get-env-vars through the Tauri bridge", () => {
    expect(canInvokeViaTauri("get-env-vars", undefined)).toBe(true);
  });

  it("rejects malformed workspace-config payloads", () => {
    expect(canInvokeViaTauri("get-app-env-vars", undefined)).toBe(false);
    expect(canInvokeViaTauri("set-app-env-vars", undefined)).toBe(false);
    expect(canInvokeViaTauri("get-context-paths", undefined)).toBe(false);
    expect(canInvokeViaTauri("set-context-paths", undefined)).toBe(false);
  });
});
