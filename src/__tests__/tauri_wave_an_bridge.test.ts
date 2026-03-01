import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AN bridge", () => {
  it("wraps approve-proposal payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("approve-proposal", {
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

  it("rejects malformed approve-proposal payloads", () => {
    expect(canInvokeViaTauri("approve-proposal", 42)).toBe(false);
  });
});
