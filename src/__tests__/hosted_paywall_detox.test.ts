import { describe, expect, it } from "vitest";
import {
  isTurboEditsV2Enabled,
  migrateStoredSettings,
  type StoredUserSettings,
  type UserSettings,
} from "@/lib/schemas";

describe("hosted paywall detox", () => {
  it("keeps turbo edits v2 independent of cloud entitlement", () => {
    const settings = {
      enableCloudAI: false,
      enableTurboEditsV2: true,
      turboEditsMode: "v2",
    } as UserSettings;

    expect(isTurboEditsV2Enabled(settings)).toBe(true);
  });

  it("migrates legacy turbo edits settings to neutral runtime keys", () => {
    const stored = {
      selectedModel: {
        name: "auto",
        provider: "auto",
      },
      providerSettings: {},
      selectedTemplateId: "react",
      releaseChannel: "stable",
      enableAutoUpdate: true,
      enableProLazyEditsMode: false,
      proLazyEditsMode: "v2",
    } as StoredUserSettings;

    const migrated = migrateStoredSettings(stored);

    expect(migrated.enableTurboEditsV2).toBe(false);
    expect(migrated.turboEditsMode).toBe("v2");
    expect(
      (migrated as Record<string, unknown>).enableProLazyEditsMode,
    ).toBeUndefined();
    expect(
      (migrated as Record<string, unknown>).proLazyEditsMode,
    ).toBeUndefined();
  });
});
