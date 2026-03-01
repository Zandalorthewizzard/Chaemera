import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave X bridge", () => {
  it("wraps Vercel mutation payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("vercel:create-project", {
        name: "chaemera-site",
        appId: 7,
      }),
    ).toEqual({
      request: {
        name: "chaemera-site",
        appId: 7,
      },
    });

    expect(
      buildTauriInvokeArgs("vercel:connect-existing-project", {
        appId: 7,
        projectId: "prj_123",
      }),
    ).toEqual({
      request: {
        appId: 7,
        projectId: "prj_123",
      },
    });
  });

  it("allows Vercel deployment and disconnect commands through the Tauri bridge", () => {
    expect(
      canInvokeViaTauri("vercel:get-deployments", {
        appId: 7,
      }),
    ).toBe(true);
    expect(
      canInvokeViaTauri("vercel:disconnect", {
        appId: 7,
      }),
    ).toBe(true);
  });

  it("rejects malformed Vercel mutation payloads", () => {
    expect(canInvokeViaTauri("vercel:create-project", undefined)).toBe(false);
    expect(canInvokeViaTauri("vercel:get-deployments", undefined)).toBe(false);
    expect(canInvokeViaTauri("vercel:disconnect", 7)).toBe(false);
  });
});
