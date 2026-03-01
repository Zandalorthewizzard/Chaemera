import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AG bridge", () => {
  it("wraps proposal payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("get-proposal", {
        chatId: 42,
      }),
    ).toEqual({
      request: {
        chatId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("reject-proposal", {
        chatId: 42,
        messageId: 7,
      }),
    ).toEqual({
      request: {
        chatId: 42,
        messageId: 7,
      },
    });
  });

  it("rejects malformed proposal payloads", () => {
    expect(canInvokeViaTauri("get-proposal", 42)).toBe(false);
    expect(canInvokeViaTauri("reject-proposal", 42)).toBe(false);
  });
});
