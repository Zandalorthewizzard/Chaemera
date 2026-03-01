import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave W bridge", () => {
  it("maps token count payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("chat:count-tokens", {
        chatId: 42,
        input: "Count the tokens in this prompt",
      }),
    ).toEqual({
      request: {
        chatId: 42,
        input: "Count the tokens in this prompt",
      },
    });
  });

  it("rejects malformed token count payloads", () => {
    expect(canInvokeViaTauri("chat:count-tokens", 42)).toBe(false);
  });
});
