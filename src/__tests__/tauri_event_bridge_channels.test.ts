import { describe, expect, it } from "vitest";
import { isTauriMigrationEventChannel } from "@/ipc/runtime/core_domain_channels";

describe("tauri event bridge channels", () => {
  it("marks the remaining receive-only contract channels as Tauri-supported", () => {
    expect(isTauriMigrationEventChannel("deep-link-received")).toBe(true);
    expect(isTauriMigrationEventChannel("chat:response:chunk")).toBe(true);
    expect(isTauriMigrationEventChannel("chat:response:end")).toBe(true);
    expect(isTauriMigrationEventChannel("chat:response:error")).toBe(true);
    expect(isTauriMigrationEventChannel("github:flow-update")).toBe(true);
    expect(isTauriMigrationEventChannel("github:flow-success")).toBe(true);
    expect(isTauriMigrationEventChannel("github:flow-error")).toBe(true);
    expect(isTauriMigrationEventChannel("plan:update")).toBe(true);
    expect(isTauriMigrationEventChannel("plan:exit")).toBe(true);
    expect(isTauriMigrationEventChannel("plan:questionnaire")).toBe(true);
  });
});
