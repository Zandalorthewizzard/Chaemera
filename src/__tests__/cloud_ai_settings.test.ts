import { describe, expect, it } from "vitest";
import {
  hasCloudAIKey,
  isCloudAIEnabled,
  migrateStoredSettings,
  type StoredUserSettings,
} from "@/lib/schemas";

describe("cloud AI settings alias", () => {
  it("migrates legacy enableDyadPro into enableCloudAI", () => {
    const stored = {
      selectedModel: {
        name: "gpt-4.1",
        provider: "openai",
      },
      providerSettings: {
        auto: {
          apiKey: {
            value: "secret",
          },
        },
      },
      selectedTemplateId: "default",
      enableDyadPro: true,
      enableAutoUpdate: true,
      releaseChannel: "stable",
    } as StoredUserSettings;

    const migrated = migrateStoredSettings(stored);

    expect(migrated.enableCloudAI).toBe(true);
    expect((migrated as Record<string, unknown>).enableDyadPro).toBeUndefined();
    expect(isCloudAIEnabled(migrated)).toBe(true);
    expect(hasCloudAIKey(migrated)).toBe(true);
  });

  it("keeps new enableCloudAI values when legacy key is absent", () => {
    const stored = {
      selectedModel: {
        name: "gpt-4.1",
        provider: "openai",
      },
      providerSettings: {
        auto: {
          apiKey: {
            value: "secret",
          },
        },
      },
      selectedTemplateId: "default",
      enableCloudAI: true,
      enableAutoUpdate: true,
      releaseChannel: "stable",
    } as StoredUserSettings;

    const migrated = migrateStoredSettings(stored);

    expect(migrated.enableCloudAI).toBe(true);
    expect((migrated as Record<string, unknown>).enableDyadPro).toBeUndefined();
    expect(isCloudAIEnabled(migrated)).toBe(true);
  });
});
