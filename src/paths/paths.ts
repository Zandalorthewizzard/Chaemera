import path from "node:path";
import os from "node:os";

/**
 * Gets the base dyad-apps directory path (without a specific app subdirectory)
 */
export function getDyadAppsBaseDirectory(): string {
  const overrideDir = process.env.CHAEMERA_TAURI_DYAD_APPS_DIR;
  if (overrideDir) {
    return overrideDir;
  }
  return path.join(os.homedir(), "dyad-apps");
}

export function getDyadAppPath(appPath: string): string {
  // If appPath is already absolute, use it as-is
  if (path.isAbsolute(appPath)) {
    return appPath;
  }
  // Otherwise, use the default base path
  return path.join(getDyadAppsBaseDirectory(), appPath);
}

export function getTypeScriptCachePath(): string {
  return path.join(getUserDataPath(), "typescript-cache");
}

/**
 * Gets the user data path, handling both Electron and non-Electron environments
 * In Electron: returns the app's userData directory
 * In non-Electron: returns "./userData" in the current directory
 */

export function getUserDataPath(): string {
  const overrideDir = process.env.CHAEMERA_TAURI_APP_DATA_DIR;
  if (overrideDir) {
    return overrideDir;
  }

  return path.resolve("./userData");
}
