import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { getDatabasePath } from "@/db";

const originalTauriUserDataDir = process.env.CHAEMERA_TAURI_USER_DATA_DIR;
const originalTauriAppDataDir = process.env.CHAEMERA_TAURI_APP_DATA_DIR;

afterEach(() => {
  if (originalTauriUserDataDir === undefined) {
    delete process.env.CHAEMERA_TAURI_USER_DATA_DIR;
  } else {
    process.env.CHAEMERA_TAURI_USER_DATA_DIR = originalTauriUserDataDir;
  }

  if (originalTauriAppDataDir === undefined) {
    delete process.env.CHAEMERA_TAURI_APP_DATA_DIR;
  } else {
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = originalTauriAppDataDir;
  }
});

describe("getDatabasePath", () => {
  it("prefers the Tauri sqlite override when present", () => {
    process.env.CHAEMERA_TAURI_USER_DATA_DIR = "/tmp/tauri-user-data";
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = "/tmp/tauri-app-data";

    expect(getDatabasePath()).toBe(
      path.join("/tmp/tauri-user-data", "sqlite.db"),
    );
  });

  it("falls back to the general app data directory when no sqlite override exists", () => {
    delete process.env.CHAEMERA_TAURI_USER_DATA_DIR;
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = "/tmp/tauri-app-data";

    expect(getDatabasePath()).toBe(
      path.join("/tmp/tauri-app-data", "sqlite.db"),
    );
  });
});
