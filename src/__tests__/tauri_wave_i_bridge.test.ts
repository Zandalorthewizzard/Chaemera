import { beforeEach, describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import {
  clearResolvedAppPaths,
  trackResolvedAppPathFromIpc,
} from "@/ipc/runtime/app_path_registry";

describe("tauri Wave I bridge", () => {
  beforeEach(() => {
    clearResolvedAppPaths();
  });

  it("maps plan file operations through resolved app paths", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 24,
      resolvedPath: "C:/Apps/plans-demo",
      installCommand: null,
      startCommand: null,
    });

    expect(
      buildTauriInvokeArgs("plan:create", {
        appId: 24,
        chatId: 77,
        title: "Checkout migration",
        summary: "Break runtime work into smaller pieces",
        content: "# Plan",
      }),
    ).toEqual({
      request: {
        appId: 24,
        appPath: "C:/Apps/plans-demo",
        chatId: 77,
        title: "Checkout migration",
        summary: "Break runtime work into smaller pieces",
        content: "# Plan",
      },
    });

    expect(
      buildTauriInvokeArgs("plan:get-for-chat", {
        appId: 24,
        chatId: 77,
      }),
    ).toEqual({
      request: {
        appId: 24,
        appPath: "C:/Apps/plans-demo",
        chatId: 77,
      },
    });

    expect(
      buildTauriInvokeArgs("plan:delete", {
        appId: 24,
        planId: "chat-77-checkout-migration-1",
      }),
    ).toEqual({
      request: {
        appId: 24,
        appPath: "C:/Apps/plans-demo",
        planId: "chat-77-checkout-migration-1",
      },
    });
  });

  it("requires resolved app metadata for plan commands", () => {
    expect(
      canInvokeViaTauri("plan:create", {
        appId: 999,
        chatId: 1,
        title: "Missing app",
        content: "# nope",
      }),
    ).toBe(false);

    expect(
      canInvokeViaTauri("plan:get-for-chat", {
        appId: 999,
        chatId: 1,
      }),
    ).toBe(false);
  });
});
