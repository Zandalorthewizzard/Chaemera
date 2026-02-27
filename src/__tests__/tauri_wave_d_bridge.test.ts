import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave D bridge", () => {
  it("wraps Vercel auth payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("vercel:save-token", {
        token: "secret-token",
      }),
    ).toEqual({
      request: {
        token: "secret-token",
      },
    });

    expect(
      buildTauriInvokeArgs("vercel:is-project-available", {
        name: "chaemera-demo",
      }),
    ).toEqual({
      request: {
        name: "chaemera-demo",
      },
    });
  });

  it("keeps read-only integration channels eligible without payloads", () => {
    expect(canInvokeViaTauri("vercel:list-projects", undefined)).toBe(true);
    expect(canInvokeViaTauri("local-models:list-ollama", undefined)).toBe(true);
    expect(canInvokeViaTauri("local-models:list-lmstudio", undefined)).toBe(
      true,
    );
  });

  it("requires payloads for Vercel auth and availability channels", () => {
    expect(canInvokeViaTauri("vercel:save-token", undefined)).toBe(false);
    expect(canInvokeViaTauri("vercel:is-project-available", undefined)).toBe(
      false,
    );
  });
});
