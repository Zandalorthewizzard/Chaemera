import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave Z bridge", () => {
  it("wraps Supabase mutation payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("supabase:set-app-project", {
        appId: 7,
        projectId: "proj_123",
        organizationSlug: "fake-org-id",
      }),
    ).toEqual({
      request: {
        appId: 7,
        projectId: "proj_123",
        organizationSlug: "fake-org-id",
      },
    });

    expect(
      buildTauriInvokeArgs("supabase:list-branches", {
        projectId: "proj_123",
        organizationSlug: "fake-org-id",
      }),
    ).toEqual({
      request: {
        projectId: "proj_123",
        organizationSlug: "fake-org-id",
      },
    });
  });

  it("accepts argument-less read channels through the Tauri bridge", () => {
    expect(canInvokeViaTauri("supabase:list-organizations", undefined)).toBe(
      true,
    );
    expect(canInvokeViaTauri("supabase:list-all-projects", undefined)).toBe(
      true,
    );
  });

  it("rejects malformed Supabase request payloads", () => {
    expect(canInvokeViaTauri("supabase:set-app-project", undefined)).toBe(
      false,
    );
    expect(canInvokeViaTauri("supabase:list-branches", "proj_123")).toBe(false);
  });
});
