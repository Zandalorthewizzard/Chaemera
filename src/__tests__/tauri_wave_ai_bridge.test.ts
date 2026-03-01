import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AI bridge", () => {
  it("wraps add dependency payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("chat:add-dep", {
        chatId: 42,
        packages: ["zod", "dayjs"],
      }),
    ).toEqual({
      request: {
        chatId: 42,
        packages: ["zod", "dayjs"],
      },
    });
  });

  it("rejects malformed add dependency payloads", () => {
    expect(canInvokeViaTauri("chat:add-dep", 42)).toBe(false);
  });
});
