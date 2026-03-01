import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave K bridge", () => {
  it("maps theme and prompt payloads for Tauri commands", () => {
    expect(
      buildTauriInvokeArgs("set-app-theme", {
        appId: 42,
        themeId: "custom:7",
      }),
    ).toEqual({
      request: {
        appId: 42,
        themeId: "custom:7",
      },
    });

    expect(
      buildTauriInvokeArgs("get-app-theme", {
        appId: 42,
      }),
    ).toEqual({
      request: {
        appId: 42,
      },
    });

    expect(
      buildTauriInvokeArgs("create-custom-theme", {
        name: "Warm Sand",
        prompt: "<theme>...</theme>",
      }),
    ).toEqual({
      request: {
        name: "Warm Sand",
        prompt: "<theme>...</theme>",
      },
    });

    expect(
      buildTauriInvokeArgs("prompts:create", {
        title: "Bug bash",
        content: "Write a regression checklist.",
      }),
    ).toEqual({
      request: {
        title: "Bug bash",
        content: "Write a regression checklist.",
      },
    });

    expect(buildTauriInvokeArgs("prompts:delete", 9)).toEqual({
      promptId: 9,
    });
  });

  it("rejects malformed theme and prompt bridge payloads", () => {
    expect(canInvokeViaTauri("set-app-theme", 42)).toBe(false);
    expect(canInvokeViaTauri("get-app-theme", 42)).toBe(false);
    expect(canInvokeViaTauri("create-custom-theme", "Warm Sand")).toBe(false);
    expect(canInvokeViaTauri("prompts:create", "Bug bash")).toBe(false);
    expect(canInvokeViaTauri("prompts:delete", { promptId: 9 })).toBe(false);
  });
});
