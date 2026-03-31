import path from "node:path";

function looksLikeWindowsPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\");
}

function selectPathApi(appPath: string, directory: string): typeof path.posix {
  if (
    looksLikeWindowsPath(appPath) ||
    looksLikeWindowsPath(directory) ||
    appPath.includes("\\") ||
    directory.includes("\\")
  ) {
    return path.win32;
  }

  return path.posix;
}

export function resolveDirectoryWithinAppPath({
  appPath,
  directory,
}: {
  appPath: string;
  directory: string;
}): string {
  const pathApi = selectPathApi(appPath, directory);
  const normalizedSegments = directory.split(/[\\/]+/).filter(Boolean);
  if (normalizedSegments.some((segment) => segment === "..")) {
    throw new Error('Path contains ".." path traversal segment');
  }

  const appRoot = pathApi.resolve(appPath);
  const targetDirectory = pathApi.isAbsolute(directory)
    ? pathApi.resolve(directory)
    : pathApi.resolve(appRoot, directory);

  const relativePath = pathApi.relative(appRoot, targetDirectory);
  if (
    relativePath.startsWith("..") ||
    pathApi.isAbsolute(relativePath) ||
    relativePath === ""
  ) {
    if (relativePath === "") {
      return ".";
    }
    throw new Error("Path escapes the project directory");
  }

  return relativePath.replace(/\\/g, "/");
}
