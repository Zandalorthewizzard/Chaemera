import { describe, expect, it } from "vitest";
import {
  buildTauriInvokeArgs,
  canInvokeViaTauri,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";

describe("tauri Wave Y bridge", () => {
  it("wraps language model mutation payloads as request objects", () => {
    expect(
      buildTauriInvokeArgs("create-custom-language-model-provider", {
        id: "openai-compatible",
        name: "OpenAI Compatible",
        apiBaseUrl: "https://example.test/v1",
      }),
    ).toEqual({
      request: {
        id: "openai-compatible",
        name: "OpenAI Compatible",
        apiBaseUrl: "https://example.test/v1",
      },
    });

    expect(
      buildTauriInvokeArgs("get-language-models", {
        providerId: "openai",
      }),
    ).toEqual({
      request: {
        providerId: "openai",
      },
    });
  });

  it("maps delete-custom-language-model string payloads", () => {
    expect(
      buildTauriInvokeArgs("delete-custom-language-model", "custom-model"),
    ).toEqual({
      modelId: "custom-model",
    });
  });

  it("rejects malformed language model payloads", () => {
    expect(canInvokeViaTauri("get-language-models", undefined)).toBe(false);
    expect(
      canInvokeViaTauri("create-custom-language-model-provider", undefined),
    ).toBe(false);
    expect(canInvokeViaTauri("delete-custom-language-model", 42)).toBe(false);
  });
});
