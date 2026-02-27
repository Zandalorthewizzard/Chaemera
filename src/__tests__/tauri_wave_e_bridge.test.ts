import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave E bridge", () => {
  it("wraps theme and visual editing payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("generate-theme-prompt", {
        imagePaths: ["C:/tmp/reference.png"],
        keywords: "clean layout",
        generationMode: "inspired",
        model: "gpt-5.2",
      }),
    ).toEqual({
      request: {
        imagePaths: ["C:/tmp/reference.png"],
        keywords: "clean layout",
        generationMode: "inspired",
        model: "gpt-5.2",
      },
    });

    expect(
      buildTauriInvokeArgs("analyze-component", {
        appId: 42,
        componentId: "hero-title",
      }),
    ).toEqual({
      request: {
        appId: 42,
        componentId: "hero-title",
      },
    });
  });

  it("keeps read-only theme listing eligible without payloads", () => {
    expect(canInvokeViaTauri("get-themes", undefined)).toBe(true);
  });

  it("requires payloads for theme mutations and visual editing calls", () => {
    expect(canInvokeViaTauri("generate-theme-prompt", undefined)).toBe(false);
    expect(canInvokeViaTauri("save-theme-image", undefined)).toBe(false);
    expect(canInvokeViaTauri("apply-visual-editing-changes", undefined)).toBe(
      false,
    );
    expect(canInvokeViaTauri("analyze-component", undefined)).toBe(false);
  });
});
