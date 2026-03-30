import { describe, expect, it } from "vitest";
import { getImportedAppLandingRoute } from "@/lib/import_flow";

describe("import flow", () => {
  it("lands imported apps on app details", () => {
    expect(getImportedAppLandingRoute(41)).toEqual({
      to: "/app-details",
      search: { appId: 41 },
    });
  });
});
