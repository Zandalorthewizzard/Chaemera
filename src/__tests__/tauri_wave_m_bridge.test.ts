import { beforeEach, describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import {
  clearResolvedAppPaths,
  getResolvedAppPath,
  trackResolvedAppPathFromIpc,
} from "@/ipc/runtime/app_path_registry";

describe("tauri Wave M bridge", () => {
  beforeEach(() => {
    clearResolvedAppPaths();
  });

  it("maps app CRUD payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("create-app", {
        name: "chaemera-demo",
      }),
    ).toEqual({
      request: {
        name: "chaemera-demo",
      },
    });

    expect(
      buildTauriInvokeArgs("delete-app", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("copy-app", {
        appId: 42,
        newAppName: "chaemera-demo-copy",
        withHistory: true,
      }),
    ).toEqual({
      request: {
        appId: 42,
        newAppName: "chaemera-demo-copy",
        withHistory: true,
      },
    });

    expect(
      buildTauriInvokeArgs("rename-app", {
        appId: 42,
        appName: "chaemera-renamed",
        appPath: "chaemera-renamed",
      }),
    ).toEqual({
      request: {
        appId: 42,
        appName: "chaemera-renamed",
        appPath: "chaemera-renamed",
      },
    });

    expect(
      buildTauriInvokeArgs("change-app-location", {
        appId: 42,
        parentDirectory: "D:/Apps",
      }),
    ).toEqual({
      request: {
        appId: 42,
        parentDirectory: "D:/Apps",
      },
    });

    expect(
      buildTauriInvokeArgs("rename-branch", {
        appId: 42,
        oldBranchName: "main",
        newBranchName: "feature/tauri-cutover",
      }),
    ).toEqual({
      request: {
        appId: 42,
        oldBranchName: "main",
        newBranchName: "feature/tauri-cutover",
      },
    });
  });

  it("tracks renamed app paths in the runtime registry", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 42,
      resolvedPath: "C:/Apps/chaemera-demo",
    });

    trackResolvedAppPathFromIpc(
      "rename-app",
      {
        appId: 42,
        appName: "chaemera-renamed",
        appPath: "chaemera-renamed",
      },
      {
        resolvedPath: "C:/Apps/chaemera-renamed",
      },
    );

    expect(getResolvedAppPath(42)).toBe("C:/Apps/chaemera-renamed");
  });

  it("rejects malformed app CRUD payloads", () => {
    expect(canInvokeViaTauri("create-app", "chaemera-demo")).toBe(false);
    expect(canInvokeViaTauri("delete-app", 42)).toBe(false);
    expect(canInvokeViaTauri("copy-app", 42)).toBe(false);
    expect(canInvokeViaTauri("rename-app", "chaemera-renamed")).toBe(false);
    expect(canInvokeViaTauri("change-app-location", "D:/Apps")).toBe(false);
    expect(canInvokeViaTauri("rename-branch", "main")).toBe(false);
  });
});
