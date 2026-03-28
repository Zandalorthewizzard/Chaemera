/**
 * Shared utilities for ripgrep integration
 */

import path from "node:path";
import os from "node:os";

export const MAX_FILE_SEARCH_SIZE = 1024 * 1024;
export const RIPGREP_EXCLUDED_GLOBS = [
  "!node_modules/**",
  "!.git/**",
  "!.next/**",
];

/**
 * Get the path to the ripgrep executable.
 * Handles both development and packaged Electron app scenarios.
 */
export function getRgExecutablePath(): string {
  const isWindows = os.platform() === "win32";
  const executableName = isWindows ? "rg.exe" : "rg";
  if (process.env.NODE_ENV === "development") {
    // Dev: the current working directory is the project root.
    return path.join(
      process.cwd(),
      "node_modules",
      "@vscode",
      "ripgrep",
      "bin",
      executableName,
    );
  }
  // Packaged app: ripgrep is bundled via extraResource
  // Since we extract "node_modules/@vscode/ripgrep", it's at resources/@vscode/ripgrep
  return path.join(
    process.resourcesPath,
    "@vscode",
    "ripgrep",
    "bin",
    executableName,
  );
}
