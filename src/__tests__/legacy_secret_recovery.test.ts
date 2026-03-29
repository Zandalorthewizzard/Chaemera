import { describe, expect, it } from "vitest";
import {
  hasLegacyNeonSecrets,
  hasLegacySupabaseSecrets,
  isNeonConnected,
  isSupabaseConnected,
  type UserSettings,
} from "@/lib/schemas";

const encryptedSecret = {
  value: "encrypted-token",
  encryptionType: "electron-safe-storage" as const,
};

const plainSecret = {
  value: "plain-token",
  encryptionType: "plaintext" as const,
};

describe("legacy secret recovery", () => {
  it("treats Electron-encrypted Neon tokens as legacy credentials", () => {
    const settings = {
      neon: {
        accessToken: encryptedSecret,
      },
    } as UserSettings;

    expect(hasLegacyNeonSecrets(settings)).toBe(true);
    expect(isNeonConnected(settings)).toBe(false);
  });

  it("treats Electron-encrypted Supabase organization tokens as legacy credentials", () => {
    const settings = {
      supabase: {
        organizations: {
          acme: {
            accessToken: encryptedSecret,
            refreshToken: encryptedSecret,
            expiresIn: 3600,
            tokenTimestamp: 123,
          },
        },
      },
    } as unknown as UserSettings;

    expect(hasLegacySupabaseSecrets(settings)).toBe(true);
    expect(isSupabaseConnected(settings)).toBe(false);
  });

  it("still treats plaintext integration tokens as active connections", () => {
    const settings = {
      neon: {
        accessToken: plainSecret,
      },
      supabase: {
        organizations: {
          acme: {
            accessToken: plainSecret,
            refreshToken: plainSecret,
            expiresIn: 3600,
            tokenTimestamp: 123,
          },
        },
      },
    } as unknown as UserSettings;

    expect(hasLegacyNeonSecrets(settings)).toBe(false);
    expect(isNeonConnected(settings)).toBe(true);
    expect(hasLegacySupabaseSecrets(settings)).toBe(false);
    expect(isSupabaseConnected(settings)).toBe(true);
  });
});
