import { describe, expect, it } from "vitest";
import { shouldNavigateToHelpRoute } from "@/lib/help_flow";

describe("help flow", () => {
  it("does not navigate again when already on help route", () => {
    expect(shouldNavigateToHelpRoute("/help")).toBe(false);
  });

  it("navigates to help route from other pages", () => {
    expect(shouldNavigateToHelpRoute("/chat")).toBe(true);
  });
});
