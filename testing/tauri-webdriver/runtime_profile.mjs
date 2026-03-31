import fs from "node:fs";
import path from "node:path";

export const TAURI_APP_IDENTIFIER = "io.chaemera.app";

export function createBaseUserSettings(overrides = {}) {
  return {
    hasRunBefore: true,
    isRunning: false,
    enableAutoUpdate: false,
    releaseChannel: "stable",
    ...overrides,
  };
}

export function resolveAppDataDir(
  appDataDirRoot,
  appIdentifier = TAURI_APP_IDENTIFIER,
) {
  return path.join(appDataDirRoot, appIdentifier);
}

export function writeUserSettingsToDir(appDataDir, settings) {
  fs.mkdirSync(appDataDir, { recursive: true });
  const settingsPath = path.join(appDataDir, "user-settings.json");
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  return settingsPath;
}

export function getRuntimeAppDataDir() {
  const appDataDir = process.env.CHAEMERA_TAURI_APP_DATA_DIR;
  if (!appDataDir) {
    throw new Error(
      "CHAEMERA_TAURI_APP_DATA_DIR is not set for the runtime session.",
    );
  }
  return appDataDir;
}

export function getRuntimeUserDataDir() {
  const userDataDir = process.env.CHAEMERA_TAURI_USER_DATA_DIR;
  if (!userDataDir) {
    throw new Error(
      "CHAEMERA_TAURI_USER_DATA_DIR is not set for the runtime session.",
    );
  }
  return userDataDir;
}

export function getRuntimeAppsDir() {
  const appsDir =
    process.env.CHAEMERA_TAURI_CHAEMERA_APPS_DIR ??
    process.env.CHAEMERA_TAURI_APPS_DIR;
  if (!appsDir) {
    throw new Error(
      "CHAEMERA_TAURI_CHAEMERA_APPS_DIR / CHAEMERA_TAURI_APPS_DIR is not set for the runtime session.",
    );
  }
  return appsDir;
}

export function getUserSettingsPath() {
  return path.join(getRuntimeAppDataDir(), "user-settings.json");
}

export function readUserSettings() {
  return JSON.parse(fs.readFileSync(getUserSettingsPath(), "utf8"));
}
