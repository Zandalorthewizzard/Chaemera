import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave AK bridge", () => {
  it("maps portal migration requests", () => {
    expect(
      buildTauriInvokeArgs("portal:migrate-create", {
        appId: 7,
      }),
    ).toEqual({
      request: {
        appId: 7,
      },
    });
  });

  it("rejects malformed portal migration payloads", () => {
    expect(canInvokeViaTauri("portal:migrate-create", { appId: 7 })).toBe(true);
    expect(canInvokeViaTauri("portal:migrate-create", 7)).toBe(false);
  });
});
