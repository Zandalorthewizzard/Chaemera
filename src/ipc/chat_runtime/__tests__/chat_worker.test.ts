import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatRuntimeContext } from "../types";
import type { WorkerOutboundMessage, WorkerStartMessage } from "../types";
import { ChatWorkerSessionManager } from "../worker_session_manager";

describe("ChatWorkerSessionManager", () => {
  let postedMessages: WorkerOutboundMessage[];
  let manager: ChatWorkerSessionManager;

  beforeEach(() => {
    postedMessages = [];
    manager = new ChatWorkerSessionManager((msg) => {
      postedMessages.push(msg);
    });
  });

  function makeStartMsg(
    overrides?: Partial<WorkerStartMessage>,
  ): WorkerStartMessage {
    return {
      type: "start",
      chatId: 1,
      prompt: "hello",
      redo: false,
      attachments: [],
      selectedComponents: [],
      appPath: "/tmp/app",
      settingsSnapshot: {},
      ...overrides,
    };
  }

  it("calls runChatStreamSession on start message", async () => {
    const mockRun = vi.fn().mockResolvedValue(1);
    await manager.handleStart(makeStartMsg(), mockRun);

    expect(mockRun).toHaveBeenCalledOnce();
    const ctx = mockRun.mock.calls[0][0] as ChatRuntimeContext;
    expect(ctx.params.chatId).toBe(1);
    expect(ctx.params.prompt).toBe("hello");
  });

  it("sends error when session already active for chatId", async () => {
    const blockingRun = vi.fn().mockImplementation(() => new Promise(() => {}));

    const blockingPromise = manager.handleStart(
      makeStartMsg({ chatId: 99 }),
      blockingRun,
    );
    postedMessages.length = 0;

    await manager.handleStart(makeStartMsg({ chatId: 99 }), blockingRun);

    const errorMsg = postedMessages.find((m) => m.type === "error");
    expect(errorMsg).toBeDefined();
    if (errorMsg && errorMsg.type === "error") {
      expect(errorMsg.chatId).toBe(99);
      expect(errorMsg.error).toContain("already active");
    }
    expect(blockingPromise).toBeDefined();
  });

  it("handles cancel message", async () => {
    let abortSignal: AbortSignal | undefined;
    const abortAwareRun = vi.fn().mockImplementation(
      (ctx: ChatRuntimeContext) =>
        new Promise<void>((resolve) => {
          abortSignal = ctx.abortSignal;
          ctx.abortSignal.addEventListener("abort", () => resolve());
        }),
    );

    const startPromise = manager.handleStart(
      makeStartMsg({ chatId: 55 }),
      abortAwareRun,
    );
    postedMessages.length = 0;

    manager.handleCancel(55);

    await startPromise;

    expect(abortSignal?.aborted).toBe(true);
    const cancelLog = postedMessages.find((m) => {
      if (m.type !== "log") return false;
      return m.message.includes("Cancelled session");
    });
    expect(cancelLog).toBeDefined();
  });

  it("sends warning log when cancelling non-existent session", () => {
    manager.handleCancel(999);

    const warnLog = postedMessages.find(
      (m) => m.type === "log" && m.level === "warn",
    );
    expect(warnLog).toBeDefined();
  });

  it("resolves consent promise on consent response", async () => {
    let consentResolved: boolean | undefined;

    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        consentResolved = await ctx.requestAgentToolConsent({
          toolName: "write_file",
          toolDescription: "desc",
          inputPreview: "preview",
        });
        return 1;
      });

    const startPromise = manager.handleStart(
      makeStartMsg({ chatId: 77 }),
      mockRun,
    );

    await new Promise((r) => setTimeout(r, 20));

    const consentReq = postedMessages.find(
      (m) => m.type === "agent_tool_consent_request",
    );
    expect(consentReq).toBeDefined();

    if (consentReq && consentReq.type === "agent_tool_consent_request") {
      manager.handleConsentResponse(consentReq.requestId, true);
    }

    await startPromise;
    expect(consentResolved).toBe(true);
  });

  it("cleans up session after completion", async () => {
    await manager.handleStart(makeStartMsg({ chatId: 88 }), async () => 1);

    const cleanupLog = postedMessages.find((m) => {
      if (m.type !== "log") return false;
      return m.message.includes("Cleaned up session");
    });
    expect(cleanupLog).toBeDefined();
    expect(manager.hasSession(88)).toBe(false);
  });

  it("rejects pending consents on cleanup", async () => {
    let consentResolved: boolean | undefined;

    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        const consentPromise = ctx.requestAgentToolConsent({
          toolName: "write_file",
          toolDescription: "desc",
          inputPreview: "preview",
        });

        const abortPromise = new Promise<void>((resolve) => {
          ctx.abortSignal.addEventListener("abort", () => resolve());
        });

        await abortPromise;
        consentResolved = await consentPromise;
        return 1;
      });

    const startPromise = manager.handleStart(
      makeStartMsg({ chatId: 66 }),
      mockRun,
    );

    await new Promise((r) => setTimeout(r, 20));
    manager.handleCancel(66);

    await startPromise;
    expect(consentResolved).toBe(false);
  });

  it("sends stream_start event via context callback", async () => {
    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        ctx.onStreamStart(ctx.params.chatId);
        return 1;
      });

    await manager.handleStart(makeStartMsg({ chatId: 10 }), mockRun);

    const streamStart = postedMessages.find((m) => m.type === "stream_start");
    expect(streamStart).toBeDefined();
    if (streamStart && streamStart.type === "stream_start") {
      expect(streamStart.chatId).toBe(10);
    }
  });

  it("sends chunk event via context callback", async () => {
    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        ctx.onChunk(ctx.params.chatId, [
          { id: 1, role: "user", content: "hi" },
        ]);
        return 1;
      });

    await manager.handleStart(makeStartMsg({ chatId: 20 }), mockRun);

    const chunk = postedMessages.find((m) => m.type === "chunk");
    expect(chunk).toBeDefined();
    if (chunk && chunk.type === "chunk") {
      expect(chunk.chatId).toBe(20);
      expect(chunk.messages).toHaveLength(1);
    }
  });

  it("sends error event via context callback", async () => {
    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        ctx.onError(ctx.params.chatId, "test error");
        return 1;
      });

    await manager.handleStart(makeStartMsg({ chatId: 30 }), mockRun);

    const error = postedMessages.find((m) => m.type === "error");
    expect(error).toBeDefined();
    if (error && error.type === "error") {
      expect(error.chatId).toBe(30);
      expect(error.error).toBe("test error");
    }
  });

  it("resolves MCP consent promise on consent response", async () => {
    let consentResolved: boolean | undefined;

    const mockRun = vi
      .fn()
      .mockImplementation(async (ctx: ChatRuntimeContext) => {
        consentResolved = await ctx.requestMcpToolConsent({
          serverId: 1,
          serverName: "test-server",
          toolName: "search",
          toolDescription: "Search the web",
          inputPreview: '{"query": "test"}',
        });
        return 1;
      });

    const startPromise = manager.handleStart(
      makeStartMsg({ chatId: 44 }),
      mockRun,
    );

    await new Promise((r) => setTimeout(r, 20));

    const consentReq = postedMessages.find(
      (m) => m.type === "mcp_tool_consent_request",
    );
    expect(consentReq).toBeDefined();

    if (consentReq && consentReq.type === "mcp_tool_consent_request") {
      expect(consentReq.serverId).toBe(1);
      expect(consentReq.serverName).toBe("test-server");
      manager.handleConsentResponse(consentReq.requestId, true);
    }

    await startPromise;
    expect(consentResolved).toBe(true);
  });

  it("forwards unhandled runSession error as error event", async () => {
    const mockRun = vi
      .fn()
      .mockRejectedValue(new Error("catastrophic failure"));

    await manager.handleStart(makeStartMsg({ chatId: 71 }), mockRun);

    const errorMsg = postedMessages.find(
      (m) => m.type === "error" && m.chatId === 71,
    );
    expect(errorMsg).toBeDefined();
    if (errorMsg && errorMsg.type === "error") {
      expect(errorMsg.error).toContain("catastrophic failure");
    }
    expect(manager.hasSession(71)).toBe(false);
  });

  it("supports concurrent sessions for different chatIds", async () => {
    const results: number[] = [];

    const makeRun = (chatId: number) =>
      vi.fn().mockImplementation(async (ctx: ChatRuntimeContext) => {
        ctx.onStreamStart(chatId);
        results.push(chatId);
        return chatId;
      });

    const p1 = manager.handleStart(makeStartMsg({ chatId: 100 }), makeRun(100));
    const p2 = manager.handleStart(makeStartMsg({ chatId: 200 }), makeRun(200));

    await Promise.all([p1, p2]);

    expect(results).toContain(100);
    expect(results).toContain(200);
    expect(manager.hasSession(100)).toBe(false);
    expect(manager.hasSession(200)).toBe(false);
  });
});
