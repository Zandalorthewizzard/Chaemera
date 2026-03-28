import { describe, expect, it } from "vitest";
import { isTurboEditsV2Enabled, type UserSettings } from "@/lib/schemas";

describe("hosted paywall detox", () => {
  it("keeps turbo edits v2 independent of cloud entitlement", () => {
    const settings = {
      enableCloudAI: false,
      enableProLazyEditsMode: true,
      proLazyEditsMode: "v2",
    } as UserSettings;

    expect(isTurboEditsV2Enabled(settings)).toBe(true);
  });
});
