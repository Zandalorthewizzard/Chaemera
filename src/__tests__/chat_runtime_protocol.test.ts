import { describe, expect, it } from "vitest";

import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "../ipc/chat_runtime";

describe("chat runtime worker protocol", () => {
  it("serializes inbound start messages deterministically", () => {
    const message: WorkerInboundMessage = {
      type: "start",
      chatId: 12,
      prompt: "hello",
      redo: false,
      attachments: [],
      selectedComponents: [],
      appPath: "C:/apps/demo",
      settingsSnapshot: {
        provider: "google",
        model: "gemini-2.5-flash",
      },
    };

    expect(JSON.stringify(message)).toBe(
      '{"type":"start","chatId":12,"prompt":"hello","redo":false,"attachments":[],"selectedComponents":[],"appPath":"C:/apps/demo","settingsSnapshot":{"provider":"google","model":"gemini-2.5-flash"}}',
    );
  });

  it("serializes outbound consent requests deterministically", () => {
    const message: WorkerOutboundMessage = {
      type: "mcp_tool_consent_request",
      requestId: "req-1",
      serverId: 5,
      serverName: "filesystem",
      toolName: "read_file",
      toolDescription: "Read a file from disk",
      inputPreview: '{"path":"README.md"}',
    };

    expect(JSON.stringify(message)).toBe(
      '{"type":"mcp_tool_consent_request","requestId":"req-1","serverId":5,"serverName":"filesystem","toolName":"read_file","toolDescription":"Read a file from disk","inputPreview":"{\\"path\\":\\"README.md\\"}"}',
    );
  });
});
