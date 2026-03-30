export function getImportedAppLandingRoute(appId: number) {
  return {
    to: "/app-details" as const,
    search: { appId },
  };
}
