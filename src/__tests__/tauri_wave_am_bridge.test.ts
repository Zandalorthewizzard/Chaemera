import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AM bridge", () => {
  it("maps revert-version requests", () => {
    expect(
      buildTauriInvokeArgs("revert-version", {
        appId: 5,
        previousVersionId: "abc123",
        currentChatMessageId: {
          chatId: 7,
          messageId: 42,
        },
      }),
    ).toEqual({
      request: {
        appId: 5,
        previousVersionId: "abc123",
        currentChatMessageId: {
          chatId: 7,
          messageId: 42,
        },
      },
    });
  });

  it("rejects malformed revert-version payloads", () => {
    expect(
      canInvokeViaTauri("revert-version", {
        appId: 5,
        previousVersionId: "abc123",
      }),
    ).toBe(true);
    expect(canInvokeViaTauri("revert-version", "abc123")).toBe(false);
  });
});
