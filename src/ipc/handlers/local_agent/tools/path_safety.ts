import path from "node:path";

export function resolveDirectoryWithinAppPath({
  appPath,
  directory,
}: {
  appPath: string;
  directory: string;
}): string {
  const normalizedSegments = directory.split(/[\\/]+/).filter(Boolean);
  if (normalizedSegments.some((segment) => segment === "..")) {
    throw new Error('Path contains ".." path traversal segment');
  }

  const appRoot = path.resolve(appPath);
  const targetDirectory = path.isAbsolute(directory)
    ? path.resolve(directory)
    : path.resolve(appRoot, directory);

  const relativePath = path.relative(appRoot, targetDirectory);
  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath === ""
  ) {
    if (relativePath === "") {
      return ".";
    }
    throw new Error("Path escapes the project directory");
  }

  return relativePath.replace(/\\/g, "/");
}
