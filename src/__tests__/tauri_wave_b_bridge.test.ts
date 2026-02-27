import { describe, expect, it, beforeEach } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import {
  clearResolvedAppPaths,
  getResolvedAppPath,
  trackResolvedAppPathFromIpc,
} from "@/ipc/runtime/app_path_registry";

describe("tauri Wave B bridge", () => {
  beforeEach(() => {
    clearResolvedAppPaths();
  });

  it("tracks resolved app paths from app IPC responses", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 7,
      resolvedPath: "C:/Apps/demo",
    });

    trackResolvedAppPathFromIpc(
      "change-app-location",
      { appId: 8 },
      {
        resolvedPath: "D:/Apps/moved",
      },
    );

    expect(getResolvedAppPath(7)).toBe("C:/Apps/demo");
    expect(getResolvedAppPath(8)).toBe("D:/Apps/moved");
  });

  it("forgets cached app paths when apps are deleted", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 9,
      resolvedPath: "C:/Apps/to-delete",
    });

    trackResolvedAppPathFromIpc("delete-app", { appId: 9 }, undefined);

    expect(getResolvedAppPath(9)).toBeNull();
  });

  it("builds Tauri args for file and version channels when app path is known", () => {
    trackResolvedAppPathFromIpc("get-app", null, {
      id: 42,
      resolvedPath: "C:/Apps/chaemera",
    });

    expect(
      buildTauriInvokeArgs("read-app-file", {
        appId: 42,
        filePath: "src/main.ts",
      }),
    ).toEqual({
      appPath: "C:/Apps/chaemera",
      filePath: "src/main.ts",
    });

    expect(
      buildTauriInvokeArgs("list-versions", {
        appId: 42,
      }),
    ).toEqual({
      appPath: "C:/Apps/chaemera",
    });
  });

  it("falls back from Tauri when path-dependent channels are missing app resolution", () => {
    expect(
      canInvokeViaTauri("read-app-file", {
        appId: 999,
        filePath: "src/main.ts",
      }),
    ).toBe(false);

    expect(
      canInvokeViaTauri("list-versions", {
        appId: 999,
      }),
    ).toBe(false);
  });

  it("keeps simple dialog and import channels Tauri-eligible without cached app paths", () => {
    expect(canInvokeViaTauri("select-app-folder", undefined)).toBe(true);
    expect(canInvokeViaTauri("select-app-location", {})).toBe(true);
    expect(canInvokeViaTauri("check-ai-rules", { path: "C:/Apps/demo" })).toBe(
      true,
    );
  });
});
