import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock, getClientMock, executeMock, disposeMock } = vi.hoisted(
  () => {
    const executeMock = vi.fn();
    const disposeMock = vi.fn();
    const whereMock = vi.fn(async () => [
      {
        id: 1,
        name: "Test Server",
        enabled: true,
      },
    ]);
    const fromMock = vi.fn(() => ({ where: whereMock }));
    const selectMock = vi.fn(() => ({ from: fromMock }));
    const getClientMock = vi.fn(async () => ({
      tools: async () => ({
        read_file: {
          description: "Read a file",
          inputSchema: { type: "object" },
          execute: executeMock,
        },
      }),
    }));

    return {
      selectMock,
      fromMock,
      whereMock,
      getClientMock,
      executeMock,
      disposeMock,
    };
  },
);

vi.mock("../../../db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("../../utils/mcp_manager", () => ({
  mcpManager: {
    getClient: getClientMock,
    dispose: disposeMock,
  },
}));

import { buildMcpToolSet } from "../mcp_tools";

describe("buildMcpToolSet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeMock.mockResolvedValue("tool result");
  });

  it("builds MCP tools and routes execution through consent", async () => {
    const requestConsent = vi.fn().mockResolvedValue(true);

    const toolSet = await buildMcpToolSet({ requestConsent });
    const tool = toolSet["Test-Server__read_file"];

    expect(tool).toBeDefined();
    expect(getClientMock).toHaveBeenCalledWith(1);

    const result = await tool.execute?.({ path: "src/app.ts" }, {} as never);

    expect(requestConsent).toHaveBeenCalledWith({
      serverId: 1,
      serverName: "Test Server",
      toolName: "read_file",
      toolDescription: "Read a file",
      inputPreview: JSON.stringify({ path: "src/app.ts" }),
    });
    expect(result).toBe("tool result");
    expect(executeMock).toHaveBeenCalled();
  });

  it("throws when consent is denied", async () => {
    const requestConsent = vi.fn().mockResolvedValue(false);

    const toolSet = await buildMcpToolSet({ requestConsent });
    const tool = toolSet["Test-Server__read_file"];

    await expect(
      tool.execute?.({ path: "src/app.ts" }, {} as never),
    ).rejects.toThrow("User declined running tool Test-Server__read_file");
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("skips broken servers and keeps healthy MCP tools", async () => {
    getClientMock
      .mockRejectedValueOnce(new Error("Connection closed"))
      .mockResolvedValueOnce({
        tools: async () => ({
          read_file: {
            description: "Read a file",
            inputSchema: { type: "object" },
            execute: executeMock,
          },
        }),
      });

    selectMock.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: 1,
            name: "Broken Server",
            enabled: true,
          },
          {
            id: 2,
            name: "Healthy Server",
            enabled: true,
          },
        ]),
      })),
    }));

    const recordLog = vi.fn();
    const requestConsent = vi.fn().mockResolvedValue(true);

    const toolSet = await buildMcpToolSet({ requestConsent, recordLog });

    expect(toolSet["Healthy-Server__read_file"]).toBeDefined();
    expect(toolSet["Broken-Server__read_file"]).toBeUndefined();
    expect(disposeMock).toHaveBeenCalledWith(1);
    expect(recordLog).toHaveBeenCalledWith(
      "warn",
      "Failed building MCP toolset for server 1",
      expect.any(Error),
    );
  });
});
