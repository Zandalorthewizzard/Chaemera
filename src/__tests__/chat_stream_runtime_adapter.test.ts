import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ipcHandleMock,
  registeredHandlers,
  createTypedHandlerMock,
  runChatStreamSessionMock,
} = vi.hoisted(() => {
  const registeredHandlers = new Map<string, (...args: any[]) => any>();

  return {
    registeredHandlers,
    ipcHandleMock: vi.fn(
      (channel: string, listener: (...args: any[]) => any) => {
        registeredHandlers.set(channel, listener);
      },
    ),
    createTypedHandlerMock: vi.fn(),
    runChatStreamSessionMock: vi.fn(
      async (ctx: {
        params: { chatId: number };
        onStreamStart: (chatId: number) => void;
        onChunk: (chatId: number, messages: any[]) => void;
        onEnd: (chatId: number, payload: Record<string, unknown>) => void;
      }) => {
        ctx.onStreamStart(ctx.params.chatId);
        ctx.onChunk(ctx.params.chatId, [
          {
            id: 1,
            chatId: ctx.params.chatId,
            role: "assistant",
            content: "partial response",
          },
        ]);
        ctx.onEnd(ctx.params.chatId, {
          updatedFiles: false,
        });
        return ctx.params.chatId;
      },
    ),
  };
});

vi.mock("../ipc/handlers/electron_compat", () => ({
  ipcMain: {
    handle: ipcHandleMock,
  },
}));

vi.mock("../ipc/handlers/base", () => ({
  createTypedHandler: createTypedHandlerMock,
}));

vi.mock("../ipc/chat_runtime", () => ({
  runChatStreamSession: runChatStreamSessionMock,
  formatMessagesForSummary: vi.fn(),
  hasUnclosedXmlWrite: vi.fn(),
  removeProblemReportTags: vi.fn(),
  removeXmlTags: vi.fn(),
}));

import { registerChatStreamHandlers } from "../ipc/handlers/chat_stream_handlers";

describe("registerChatStreamHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
  });

  it("registers an Electron adapter that delegates to the extracted runtime and preserves stream events", async () => {
    registerChatStreamHandlers();

    const streamHandler = registeredHandlers.get("chat:stream");
    expect(streamHandler).toBeTypeOf("function");
    expect(createTypedHandlerMock).toHaveBeenCalledTimes(1);

    const sender = {
      send: vi.fn(),
      isDestroyed: () => false,
    };

    const result = await streamHandler?.(
      { sender },
      {
        chatId: 7,
        prompt: "hello",
        redo: false,
        attachments: [],
        selectedComponents: [],
      },
    );

    expect(result).toBe(7);
    expect(runChatStreamSessionMock).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledWith("chat:stream:start", {
      chatId: 7,
    });
    expect(sender.send).toHaveBeenCalledWith("chat:response:chunk", {
      chatId: 7,
      messages: [
        {
          id: 1,
          chatId: 7,
          role: "assistant",
          content: "partial response",
        },
      ],
    });
    expect(sender.send).toHaveBeenCalledWith("chat:response:end", {
      chatId: 7,
      updatedFiles: false,
    });
    expect(sender.send).toHaveBeenCalledWith("chat:stream:end", {
      chatId: 7,
    });
  });
});
