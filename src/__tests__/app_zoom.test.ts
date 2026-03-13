import { afterEach, describe, expect, it } from "vitest";
import { applyAppZoom } from "@/lib/app_zoom";

describe("applyAppZoom", () => {
  afterEach(() => {
    document.documentElement.style.zoom = "";
    document.documentElement.style.removeProperty("--chaemera-app-zoom-factor");
  });

  it("applies DOM zoom for the requested level", () => {
    const cleanup = applyAppZoom("110");

    expect(document.documentElement.style.zoom).toBe("1.1");
    expect(
      document.documentElement.style.getPropertyValue(
        "--chaemera-app-zoom-factor",
      ),
    ).toBe("1.1");

    cleanup();

    expect(document.documentElement.style.zoom).toBe("1");
    expect(
      document.documentElement.style.getPropertyValue(
        "--chaemera-app-zoom-factor",
      ),
    ).toBe("1");
  });

  it("falls back to the default zoom for invalid input", () => {
    applyAppZoom("invalid");

    expect(document.documentElement.style.zoom).toBe("1");
    expect(
      document.documentElement.style.getPropertyValue(
        "--chaemera-app-zoom-factor",
      ),
    ).toBe("1");
  });
});
