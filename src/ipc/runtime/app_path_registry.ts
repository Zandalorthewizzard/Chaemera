const resolvedAppPaths = new Map<number, string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown, key: string): number | null {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  return typeof candidate === "number" ? candidate : null;
}

function readString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  return typeof candidate === "string" ? candidate : null;
}

function registerFromAppLike(value: unknown): void {
  const appId = readNumber(value, "id");
  const resolvedPath = readString(value, "resolvedPath");
  if (appId !== null && resolvedPath) {
    resolvedAppPaths.set(appId, resolvedPath);
  }
}

export function registerResolvedAppPath(
  appId: number,
  resolvedPath: string,
): void {
  resolvedAppPaths.set(appId, resolvedPath);
}

export function getResolvedAppPath(appId: number): string | null {
  return resolvedAppPaths.get(appId) ?? null;
}

export function forgetResolvedAppPath(appId: number): void {
  resolvedAppPaths.delete(appId);
}

export function clearResolvedAppPaths(): void {
  resolvedAppPaths.clear();
}

export function trackResolvedAppPathFromIpc(
  channel: string,
  input: unknown,
  result: unknown,
): void {
  switch (channel) {
    case "get-app":
      registerFromAppLike(result);
      return;
    case "list-apps":
      if (isRecord(result) && Array.isArray(result.apps)) {
        for (const app of result.apps) {
          registerFromAppLike(app);
        }
      }
      return;
    case "create-app":
    case "copy-app":
      if (isRecord(result)) {
        registerFromAppLike(result.app);
      }
      return;
    case "change-app-location": {
      const appId = readNumber(input, "appId");
      const resolvedPath = readString(result, "resolvedPath");
      if (appId !== null && resolvedPath) {
        resolvedAppPaths.set(appId, resolvedPath);
      }
      return;
    }
    case "delete-app": {
      const appId = readNumber(input, "appId");
      if (appId !== null) {
        resolvedAppPaths.delete(appId);
      }
      return;
    }
    default:
      return;
  }
}
