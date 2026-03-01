import { beforeEach, describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import {
  clearResolvedAppPaths,
  getAppRuntimeMetadata,
  trackResolvedAppPathFromIpc,
} from "@/ipc/runtime/app_path_registry";

describe("tauri Wave F bridge", () => {
  beforeEach(() => {
    clearResolvedAppPaths();
  });

  it("tracks app runtime metadata from app IPC responses", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 12,
      resolvedPath: "C:/Apps/preview-app",
      installCommand: "pnpm install",
      startCommand: "pnpm dev --port 32112",
    });

    expect(getAppRuntimeMetadata(12)).toEqual({
      resolvedPath: "C:/Apps/preview-app",
      installCommand: "pnpm install",
      startCommand: "pnpm dev --port 32112",
    });
  });

  it("updates stored runtime commands when app commands change", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 13,
      resolvedPath: "C:/Apps/custom-commands",
      installCommand: null,
      startCommand: null,
    });

    trackResolvedAppPathFromIpc(
      "update-app-commands",
      {
        appId: 13,
        installCommand: "pnpm install --frozen-lockfile",
        startCommand: "pnpm preview --port 32113",
      },
      undefined,
    );

    expect(getAppRuntimeMetadata(13)).toEqual({
      resolvedPath: "C:/Apps/custom-commands",
      installCommand: "pnpm install --frozen-lockfile",
      startCommand: "pnpm preview --port 32113",
    });
  });

  it("builds Tauri args for app runtime and edit-file channels", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 99,
      resolvedPath: "C:/Apps/runtime-app",
      installCommand: "pnpm install",
      startCommand: "pnpm dev --port 32199",
    });

    expect(
      buildTauriInvokeArgs("run-app", {
        appId: 99,
      }),
    ).toEqual({
      request: {
        appId: 99,
        appPath: "C:/Apps/runtime-app",
        installCommand: "pnpm install",
        startCommand: "pnpm dev --port 32199",
      },
    });

    expect(
      buildTauriInvokeArgs("restart-app", {
        appId: 99,
        removeNodeModules: true,
      }),
    ).toEqual({
      request: {
        appId: 99,
        appPath: "C:/Apps/runtime-app",
        installCommand: "pnpm install",
        startCommand: "pnpm dev --port 32199",
        removeNodeModules: true,
      },
    });

    expect(
      buildTauriInvokeArgs("edit-app-file", {
        appId: 99,
        filePath: "src/main.ts",
        content: "console.log('hi')",
      }),
    ).toEqual({
      request: {
        appId: 99,
        appPath: "C:/Apps/runtime-app",
        filePath: "src/main.ts",
        content: "console.log('hi')",
      },
    });
  });

  it("marks app runtime channels as unavailable for Tauri without cached metadata", () => {
    expect(
      canInvokeViaTauri("run-app", {
        appId: 404,
      }),
    ).toBe(false);

    expect(
      canInvokeViaTauri("edit-app-file", {
        appId: 404,
        filePath: "src/main.ts",
        content: "console.log('nope')",
      }),
    ).toBe(false);
  });

  it("keeps non-path utility cutover channels Tauri-eligible", () => {
    expect(
      buildTauriInvokeArgs("open-external-url", "https://example.com"),
    ).toEqual({
      url: "https://example.com",
    });

    expect(
      canInvokeViaTauri("clear-logs", {
        appId: 15,
      }),
    ).toBe(true);
  });
});
