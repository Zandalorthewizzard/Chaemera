import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import { hasTauriLeptosShellSupport } from "@/lib/leptos_shell";

describe("tauri leptos shell bridge", () => {
  it("wraps leptos shell requests as Tauri request payloads", () => {
    expect(
      buildTauriInvokeArgs("leptos:render-route", {
        routeId: "settings",
      }),
    ).toEqual({
      request: {
        routeId: "settings",
      },
    });
  });

  it("requires a payload for leptos shell rendering", () => {
    expect(canInvokeViaTauri("leptos:render-route", undefined)).toBe(false);
    expect(
      canInvokeViaTauri("leptos:render-route", {
        routeId: "library",
      }),
    ).toBe(true);
  });

  it("detects whether the Tauri bridge exposes the Leptos shell channel", () => {
    delete window.__CHAEMERA_TAURI_CORE__;
    expect(hasTauriLeptosShellSupport()).toBe(false);

    window.__CHAEMERA_TAURI_CORE__ = {
      supportedChannels: ["leptos:render-route"],
      invoke: async () => undefined,
    };

    expect(hasTauriLeptosShellSupport()).toBe(true);
  });
});
