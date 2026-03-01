import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave L bridge", () => {
  it("maps chat CRUD payloads for Tauri commands", () => {
    expect(buildTauriInvokeArgs("get-chat", 42)).toEqual({
      chatId: 42,
    });

    expect(buildTauriInvokeArgs("get-chats", 7)).toEqual({
      appId: 7,
    });

    expect(buildTauriInvokeArgs("create-chat", 7)).toEqual({
      appId: 7,
    });

    expect(
      buildTauriInvokeArgs("update-chat", {
        chatId: 42,
        title: "Refactor plan",
      }),
    ).toEqual({
      request: {
        chatId: 42,
        title: "Refactor plan",
      },
    });

    expect(buildTauriInvokeArgs("delete-chat", 42)).toEqual({
      chatId: 42,
    });

    expect(buildTauriInvokeArgs("delete-messages", 42)).toEqual({
      chatId: 42,
    });

    expect(
      buildTauriInvokeArgs("search-chats", {
        appId: 7,
        query: "migration",
      }),
    ).toEqual({
      request: {
        appId: 7,
        query: "migration",
      },
    });
  });

  it("rejects malformed chat CRUD payloads", () => {
    expect(canInvokeViaTauri("get-chat", { chatId: 42 })).toBe(false);
    expect(canInvokeViaTauri("create-chat", { appId: 7 })).toBe(false);
    expect(canInvokeViaTauri("update-chat", "Refactor plan")).toBe(false);
    expect(canInvokeViaTauri("delete-chat", { chatId: 42 })).toBe(false);
    expect(canInvokeViaTauri("delete-messages", { chatId: 42 })).toBe(false);
    expect(canInvokeViaTauri("search-chats", "migration")).toBe(false);
  });
});
