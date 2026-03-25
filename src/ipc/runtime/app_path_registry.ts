type AppRuntimeMetadata = {
  resolvedPath: string;
  installCommand: string | null;
  startCommand: string | null;
};

const appRuntimeMetadata = new Map<number, AppRuntimeMetadata>();

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
    appRuntimeMetadata.set(appId, {
      resolvedPath,
      installCommand: readNullableString(value, "installCommand"),
      startCommand: readNullableString(value, "startCommand"),
    });
  }
}

function readNullableString(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null;
  const candidate = value[key];
  if (candidate === null || candidate === undefined) {
    return null;
  }
  return typeof candidate === "string" ? candidate : null;
}

export function registerResolvedAppPath(
  appId: number,
  resolvedPath: string,
): void {
  const existing = appRuntimeMetadata.get(appId);
  appRuntimeMetadata.set(appId, {
    resolvedPath,
    installCommand: existing?.installCommand ?? null,
    startCommand: existing?.startCommand ?? null,
  });
}

export function getResolvedAppPath(appId: number): string | null {
  return appRuntimeMetadata.get(appId)?.resolvedPath ?? null;
}

export function getAppRuntimeMetadata(
  appId: number,
): AppRuntimeMetadata | null {
  return appRuntimeMetadata.get(appId) ?? null;
}

export function forgetResolvedAppPath(appId: number): void {
  appRuntimeMetadata.delete(appId);
}

export function clearResolvedAppPaths(): void {
  appRuntimeMetadata.clear();
}

function updateAppCommandsFromInput(value: unknown): void {
  const appId = readNumber(value, "appId");
  if (appId === null) {
    return;
  }

  const existing = appRuntimeMetadata.get(appId);
  if (!existing) {
    return;
  }

  appRuntimeMetadata.set(appId, {
    resolvedPath: existing.resolvedPath,
    installCommand: readNullableString(value, "installCommand"),
    startCommand: readNullableString(value, "startCommand"),
  });
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
    case "import-app": {
      const appId = readNumber(result, "appId");
      const resolvedPath = readString(result, "resolvedPath");
      if (appId !== null && resolvedPath) {
        appRuntimeMetadata.set(appId, {
          resolvedPath,
          installCommand: readNullableString(result, "installCommand"),
          startCommand: readNullableString(result, "startCommand"),
        });
      }
      return;
    }
    case "change-app-location": {
      const appId = readNumber(input, "appId");
      const resolvedPath = readString(result, "resolvedPath");
      if (appId !== null && resolvedPath) {
        registerResolvedAppPath(appId, resolvedPath);
      }
      return;
    }
    case "rename-app": {
      const appId = readNumber(input, "appId");
      const resolvedPath = readString(result, "resolvedPath");
      if (appId !== null && resolvedPath) {
        registerResolvedAppPath(appId, resolvedPath);
      }
      return;
    }
    case "delete-app": {
      const appId = readNumber(input, "appId");
      if (appId !== null) {
        appRuntimeMetadata.delete(appId);
      }
      return;
    }
    case "update-app-commands":
      updateAppCommandsFromInput(input);
      return;
    default:
      return;
  }
}
