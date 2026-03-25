import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapTauriCoreBridge,
  buildTauriInvokeArgs,
} from "@/ipc/runtime/bootstrap_tauri_core_bridge";
import { createStreamClient, defineStream } from "@/ipc/contracts/core";
import { z } from "zod";

const tauriEventListenMock = vi.fn();

vi.mock("@tauri-apps/api/event", () => ({
  listen: tauriEventListenMock,
}));

const testStreamContract = defineStream({
  channel: "chat:stream",
  input: z.object({
    chatId: z.number(),
    prompt: z.string(),
  }),
  keyField: "chatId",
  events: {
    chunk: {
      channel: "chat:response:chunk",
      payload: z.object({
        chatId: z.number(),
        messages: z.array(z.object({ role: z.string(), content: z.string() })),
      }),
    },
    end: {
      channel: "chat:response:end",
      payload: z.object({
        chatId: z.number(),
        updatedFiles: z.boolean(),
      }),
    },
    error: {
      channel: "chat:response:error",
      payload: z.object({
        chatId: z.number(),
        error: z.string(),
      }),
    },
  },
});

describe("tauri Wave C transport", () => {
  beforeEach(() => {
    delete (window as typeof window & { __CHAEMERA_TAURI_CORE__?: unknown })
      .__CHAEMERA_TAURI_CORE__;
    delete (window as typeof window & { __TAURI__?: unknown }).__TAURI__;
    delete (window as typeof window & { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__;
    tauriEventListenMock.mockReset();
  });

  it("wraps chat stream payload as a Tauri request argument", () => {
    expect(
      buildTauriInvokeArgs("chat:stream", {
        chatId: 12,
        prompt: "hello",
      }),
    ).toEqual({
      request: {
        chatId: 12,
        prompt: "hello",
      },
    });
  });

  it("normalizes Tauri event envelopes to payloads", () => {
    let capturedPayload: unknown = null;
    let tauriListener: ((payload: unknown) => void) | null = null;

    (
      window as typeof window & {
        __TAURI__?: {
          core?: {
            invoke?: (
              command: string,
              args?: Record<string, unknown>,
            ) => Promise<unknown>;
          };
          event?: {
            listen?: (
              event: string,
              handler: (payload: unknown) => void,
            ) => () => void;
          };
        };
      }
    ).__TAURI__ = {
      core: {
        invoke: vi.fn().mockResolvedValue(undefined),
      },
      event: {
        listen: (_event, handler) => {
          tauriListener = handler;
          return () => {};
        },
      },
    };

    bootstrapTauriCoreBridge();
    window.__CHAEMERA_TAURI_CORE__!.on!("chat:response:end", (payload) => {
      capturedPayload = payload;
    });

    const eventListener = tauriListener as ((payload: unknown) => void) | null;
    if (eventListener) {
      eventListener({
        payload: {
          chatId: 1,
          updatedFiles: false,
        },
      });
    }

    expect(capturedPayload).toEqual({
      chatId: 1,
      updatedFiles: false,
    });
  });

  it("falls back to @tauri-apps/api event.listen when globals omit the event bridge", async () => {
    let capturedPayload: unknown = null;
    const dispose = vi.fn();

    tauriEventListenMock.mockImplementation(async (_event, handler) => {
      handler({
        payload: {
          chatId: 99,
          updatedFiles: true,
        },
      });
      return dispose;
    });

    (
      window as typeof window & {
        __TAURI_INTERNALS__?: {
          invoke?: (
            command: string,
            args?: Record<string, unknown>,
          ) => Promise<unknown>;
        };
      }
    ).__TAURI_INTERNALS__ = {
      invoke: vi.fn().mockResolvedValue(undefined),
    };

    bootstrapTauriCoreBridge();

    const unsubscribe = window.__CHAEMERA_TAURI_CORE__!.on!(
      "chat:response:end",
      (payload) => {
        capturedPayload = payload;
      },
    );

    await vi.waitFor(() => {
      expect(tauriEventListenMock).toHaveBeenCalledWith(
        "chat:response:end",
        expect.any(Function),
      );
    });

    expect(capturedPayload).toEqual({
      chatId: 99,
      updatedFiles: true,
    });

    unsubscribe();

    await vi.waitFor(() => {
      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  it("routes stream invokes and events through the Tauri bridge", async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const invoke = vi.fn().mockResolvedValue(undefined);

    window.__CHAEMERA_TAURI_CORE__ = {
      supportedChannels: [
        "chat:stream",
        "chat:response:chunk",
        "chat:response:end",
        "chat:response:error",
      ],
      invoke: (channel, payload) => invoke(channel, payload),
      on: (channel, handler) => {
        listeners.set(channel, handler);
        return () => {
          listeners.delete(channel);
        };
      },
      supportsInvoke: () => true,
    };

    const client = createStreamClient(testStreamContract);
    const onChunk = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();

    client.start(
      {
        chatId: 7,
        prompt: "ping",
      },
      {
        onChunk,
        onEnd,
        onError,
      },
    );

    expect(invoke).toHaveBeenCalledWith("chat:stream", {
      chatId: 7,
      prompt: "ping",
    });

    listeners.get("chat:response:chunk")?.({
      chatId: 7,
      messages: [{ role: "assistant", content: "partial" }],
    });
    listeners.get("chat:response:end")?.({
      chatId: 7,
      updatedFiles: false,
    });

    expect(onChunk).toHaveBeenCalledWith({
      chatId: 7,
      messages: [{ role: "assistant", content: "partial" }],
    });
    expect(onEnd).toHaveBeenCalledWith({
      chatId: 7,
      updatedFiles: false,
    });
    expect(onError).not.toHaveBeenCalled();
  });
});
