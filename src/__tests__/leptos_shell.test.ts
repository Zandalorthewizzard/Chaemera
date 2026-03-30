import { describe, expect, it } from "vitest";
import { shouldRenderLeptosShellChrome } from "@/lib/leptos_shell";

describe("leptos shell chrome routing", () => {
  it("hides shell chrome for the chat workspace route", () => {
    expect(shouldRenderLeptosShellChrome("chat-workspace")).toBe(false);
  });

  it("hides shell chrome for the other leptos routes during the non-chat release stage", () => {
    expect(shouldRenderLeptosShellChrome("apps-home")).toBe(false);
    expect(shouldRenderLeptosShellChrome("settings")).toBe(false);
    expect(shouldRenderLeptosShellChrome("provider-settings")).toBe(false);
  });
});
