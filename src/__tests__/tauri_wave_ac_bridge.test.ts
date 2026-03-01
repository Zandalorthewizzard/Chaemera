import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AC bridge", () => {
  it("wraps Capacitor payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("is-capacitor", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("sync-capacitor", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("open-ios", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("open-android", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });
  });

  it("rejects malformed Capacitor payloads", () => {
    expect(canInvokeViaTauri("is-capacitor", undefined)).toBe(false);
    expect(canInvokeViaTauri("sync-capacitor", undefined)).toBe(false);
    expect(canInvokeViaTauri("open-ios", undefined)).toBe(false);
    expect(canInvokeViaTauri("open-android", undefined)).toBe(false);
  });
});
