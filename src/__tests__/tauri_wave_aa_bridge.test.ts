import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AA bridge", () => {
  it("wraps Neon mutation payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("neon:create-project", {
        appId: 7,
        name: "Chaemera Preview DB",
      }),
    ).toEqual({
      request: {
        appId: 7,
        name: "Chaemera Preview DB",
      },
    });

    expect(
      buildTauriInvokeArgs("neon:get-project", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });
  });

  it("accepts the argument-less Neon fake-connect channel", () => {
    expect(canInvokeViaTauri("neon:fake-connect", undefined)).toBe(true);
  });

  it("rejects malformed Neon request payloads", () => {
    expect(canInvokeViaTauri("neon:create-project", undefined)).toBe(false);
    expect(canInvokeViaTauri("neon:get-project", "7")).toBe(false);
  });
});
