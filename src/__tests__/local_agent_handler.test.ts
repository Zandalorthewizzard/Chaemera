import { describe, it, expect } from "vitest";
import { handleLocalAgentStream } from "@/ipc/handlers/local_agent/local_agent_handler";
import type { ChatStreamParams } from "@/ipc/types";

function createFakeEvent() {
  const sentMessages: Array<{ channel: string; payload: unknown }> = [];
  return {
    event: {
      sender: {
        isDestroyed: () => false,
        send: (channel: string, payload: unknown) => {
          sentMessages.push({ channel, payload });
        },
      },
    } as Parameters<typeof handleLocalAgentStream>[0],
    sentMessages,
  };
}

function buildRequest(chatId: number): ChatStreamParams {
  return { chatId, prompt: "test" } as unknown as ChatStreamParams;
}

describe("handleLocalAgentStream", () => {
  it("returns OSS availability error for agent mode", async () => {
    const { event, sentMessages } = createFakeEvent();

    const result = await handleLocalAgentStream(
      event,
      buildRequest(1),
      new AbortController(),
      {
        placeholderMessageId: 10,
        systemPrompt: "You are helpful",
        cloudRequestId: "req-1",
      },
    );

    expect(result).toBe(false);
    expect(sentMessages[0]).toEqual({
      channel: "chat:response:error",
      payload: {
        chatId: 1,
        error:
          "Agent mode is temporarily unavailable in OSS. Please switch to Build mode.",
      },
    });
    expect(sentMessages[1]).toEqual({
      channel: "chat:response:end",
      payload: {
        chatId: 1,
        updatedFiles: false,
      },
    });
  });

  it("uses ask mode label when readOnly is enabled", async () => {
    const { event, sentMessages } = createFakeEvent();

    await handleLocalAgentStream(
      event,
      buildRequest(2),
      new AbortController(),
      {
        placeholderMessageId: 11,
        systemPrompt: "You are helpful",
        cloudRequestId: "req-2",
        readOnly: true,
      },
    );

    expect(sentMessages[0]).toEqual({
      channel: "chat:response:error",
      payload: {
        chatId: 2,
        error:
          "Ask mode is temporarily unavailable in OSS. Please switch to Build mode.",
      },
    });
  });

  it("uses plan mode label when planModeOnly is enabled", async () => {
    const { event, sentMessages } = createFakeEvent();

    await handleLocalAgentStream(
      event,
      buildRequest(3),
      new AbortController(),
      {
        placeholderMessageId: 12,
        systemPrompt: "You are helpful",
        cloudRequestId: "req-3",
        planModeOnly: true,
      },
    );

    expect(sentMessages[0]).toEqual({
      channel: "chat:response:error",
      payload: {
        chatId: 3,
        error:
          "Plan mode is temporarily unavailable in OSS. Please switch to Build mode.",
      },
    });
  });
});
