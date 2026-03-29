import { describe, expect, it } from "vitest";

import {
  parseWorkerInbound,
  serializeWorkerMessage,
  writeWorkerLog,
  writeWorkerMessage,
} from "../worker_stdio";

import type {
  WorkerAgentToolConsentRequest,
  WorkerChunkEvent,
  WorkerEndEvent,
  WorkerErrorEvent,
  WorkerInboundMessage,
  WorkerLogEvent,
  WorkerOutboundMessage,
  WorkerStreamStartEvent,
} from "../types";

describe("serializeWorkerMessage", () => {
  it("serializes stream_start with trailing newline", () => {
    const msg: WorkerStreamStartEvent = { type: "stream_start", chatId: 42 };
    const result = serializeWorkerMessage(msg);
    expect(result).toBe('{"type":"stream_start","chatId":42}\n');
  });

  it("serializes chunk with messages array", () => {
    const msg: WorkerChunkEvent = {
      type: "chunk",
      chatId: 1,
      messages: [
        { id: 10, role: "user", content: "hello" },
        { id: 11, role: "assistant", content: "hi" },
      ],
    };
    const parsed = JSON.parse(serializeWorkerMessage(msg));
    expect(parsed.type).toBe("chunk");
    expect(parsed.chatId).toBe(1);
    expect(parsed.messages).toHaveLength(2);
  });

  it("serializes end event with optional fields", () => {
    const msg: WorkerEndEvent = {
      type: "end",
      chatId: 5,
      updatedFiles: true,
      chatSummary: "test summary",
    };
    const parsed = JSON.parse(serializeWorkerMessage(msg));
    expect(parsed.type).toBe("end");
    expect(parsed.updatedFiles).toBe(true);
    expect(parsed.chatSummary).toBe("test summary");
    expect(parsed.wasCancelled).toBeUndefined();
  });

  it("serializes error event", () => {
    const msg: WorkerErrorEvent = {
      type: "error",
      chatId: 3,
      error: "something went wrong",
    };
    const result = serializeWorkerMessage(msg);
    expect(result).toContain('"error":"something went wrong"');
  });

  it("serializes log event", () => {
    const msg: WorkerLogEvent = {
      type: "log",
      level: "warn",
      message: "deprecated call",
    };
    const parsed = JSON.parse(serializeWorkerMessage(msg));
    expect(parsed.type).toBe("log");
    expect(parsed.level).toBe("warn");
  });

  it("serializes agent tool consent request", () => {
    const msg: WorkerAgentToolConsentRequest = {
      type: "agent_tool_consent_request",
      requestId: "req-123",
      toolName: "write_file",
      toolDescription: "Write a file",
      inputPreview: '{"path": "foo.ts"}',
    };
    const parsed = JSON.parse(serializeWorkerMessage(msg));
    expect(parsed.type).toBe("agent_tool_consent_request");
    expect(parsed.requestId).toBe("req-123");
  });
});

describe("parseWorkerInbound", () => {
  it("parses start message", () => {
    const line = JSON.stringify({
      type: "start",
      chatId: 1,
      prompt: "hello",
      redo: false,
      attachments: [],
      selectedComponents: [],
      appPath: "/tmp/app",
      settingsSnapshot: {},
    });
    const result = parseWorkerInbound(line);
    expect(result.type).toBe("start");
    if (result.type === "start") {
      expect(result.chatId).toBe(1);
      expect(result.prompt).toBe("hello");
    }
  });

  it("parses cancel message", () => {
    const line = JSON.stringify({ type: "cancel", chatId: 5 });
    const result = parseWorkerInbound(line);
    expect(result.type).toBe("cancel");
    if (result.type === "cancel") {
      expect(result.chatId).toBe(5);
    }
  });

  it("parses tool consent response", () => {
    const line = JSON.stringify({
      type: "tool_consent_response",
      requestId: "req-456",
      approved: true,
    });
    const result = parseWorkerInbound(line);
    expect(result.type).toBe("tool_consent_response");
    if (result.type === "tool_consent_response") {
      expect(result.requestId).toBe("req-456");
      expect(result.approved).toBe(true);
    }
  });

  it("throws on missing type field", () => {
    expect(() => parseWorkerInbound('{"chatId": 1}')).toThrow(
      'missing "type" field',
    );
  });

  it("throws on non-object input", () => {
    expect(() => parseWorkerInbound('"hello"')).toThrow('missing "type" field');
  });

  it("throws on null input", () => {
    expect(() => parseWorkerInbound("null")).toThrow('missing "type" field');
  });
});

describe("writeWorkerMessage", () => {
  it("calls writeFn with serialized message", () => {
    const written: string[] = [];
    const writeFn = (data: string) => written.push(data);

    const msg: WorkerErrorEvent = {
      type: "error",
      chatId: 1,
      error: "fail",
    };
    writeWorkerMessage(writeFn, msg);

    expect(written).toHaveLength(1);
    expect(written[0]).toBe('{"type":"error","chatId":1,"error":"fail"}\n');
  });
});

describe("writeWorkerLog", () => {
  it("writes a log message with correct shape", () => {
    const written: string[] = [];
    const writeFn = (data: string) => written.push(data);

    writeWorkerLog(writeFn, "info", "worker started");

    expect(written).toHaveLength(1);
    const parsed = JSON.parse(written[0]);
    expect(parsed.type).toBe("log");
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("worker started");
  });
});

describe("round-trip: serialize then parse", () => {
  it("round-trips all outbound message types", () => {
    const messages: WorkerOutboundMessage[] = [
      { type: "stream_start", chatId: 1 },
      { type: "chunk", chatId: 1, messages: [] },
      { type: "end", chatId: 1, updatedFiles: false },
      { type: "error", chatId: 1, error: "err" },
      { type: "log", level: "info", message: "hi" },
      {
        type: "agent_tool_consent_request",
        requestId: "r1",
        toolName: "t",
        toolDescription: "d",
        inputPreview: "p",
      },
      {
        type: "mcp_tool_consent_request",
        requestId: "r2",
        serverId: 1,
        serverName: "s",
        toolName: "t",
        toolDescription: "d",
        inputPreview: "p",
      },
    ];

    for (const msg of messages) {
      const serialized = serializeWorkerMessage(msg);
      expect(serialized.endsWith("\n")).toBe(true);
      const parsed = JSON.parse(serialized);
      expect(parsed.type).toBe(msg.type);
    }
  });

  it("round-trips all inbound message types", () => {
    const messages: WorkerInboundMessage[] = [
      {
        type: "start",
        chatId: 1,
        prompt: "test",
        redo: false,
        attachments: [],
        selectedComponents: [],
        appPath: "/app",
        settingsSnapshot: {},
      },
      { type: "cancel", chatId: 1 },
      { type: "tool_consent_response", requestId: "r1", approved: true },
      { type: "mcp_tool_consent_response", requestId: "r2", approved: false },
    ];

    for (const msg of messages) {
      const line = JSON.stringify(msg);
      const parsed = parseWorkerInbound(line);
      expect(parsed.type).toBe(msg.type);
    }
  });
});
