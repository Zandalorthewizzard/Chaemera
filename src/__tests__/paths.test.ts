import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import os from "node:os";

import {
  getAppPath,
  getAppsBaseDirectory,
  getTypeScriptCachePath,
  getUserDataPath,
} from "@/paths/paths";

describe("paths helpers", () => {
  const originalUserDataDir = process.env.CHAEMERA_TAURI_APP_DATA_DIR;
  const originalDyadAppsDir = process.env.CHAEMERA_TAURI_APPS_DIR;

  afterEach(() => {
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = originalUserDataDir;
    process.env.CHAEMERA_TAURI_APPS_DIR = originalDyadAppsDir;
  });

  it("uses Tauri override env vars when present", () => {
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = "/tmp/chaemera-user-data";
    process.env.CHAEMERA_TAURI_APPS_DIR = "/tmp/chaemera-apps";

    expect(getUserDataPath()).toBe("/tmp/chaemera-user-data");
    expect(getTypeScriptCachePath()).toBe(
      path.join("/tmp/chaemera-user-data", "typescript-cache"),
    );
    expect(getAppsBaseDirectory()).toBe("/tmp/chaemera-apps");
    expect(getAppPath("demo")).toBe(path.join("/tmp/chaemera-apps", "demo"));
  });

  it("falls back to the host home directory and local userData directory", () => {
    delete process.env.CHAEMERA_TAURI_APP_DATA_DIR;
    delete process.env.CHAEMERA_TAURI_APPS_DIR;

    expect(getAppsBaseDirectory()).toBe(path.join(os.homedir(), "dyad-apps"));
    expect(getUserDataPath()).toBe(path.resolve("./userData"));
  });
});
