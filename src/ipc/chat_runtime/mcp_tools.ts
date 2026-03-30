import type { ToolExecutionOptions, ToolSet } from "ai";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { mcpServers } from "../../db/schema";
import { mcpManager } from "../utils/mcp_manager";

export async function buildMcpToolSet(params: {
  requestConsent: (request: {
    serverId: number;
    serverName: string;
    toolName: string;
    toolDescription?: string | null;
    inputPreview?: string | null;
  }) => Promise<boolean>;
  recordLog?: (
    level: "warn" | "error",
    message: string,
    error?: unknown,
  ) => void;
}): Promise<ToolSet> {
  const mcpToolSet: ToolSet = {};

  try {
    const servers = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.enabled, true as any));

    for (const server of servers) {
      const client = await mcpManager.getClient(server.id);
      const toolSet = await client.tools();

      for (const [name, mcpTool] of Object.entries(toolSet)) {
        const serverKey = String(server.name || "").replace(
          /[^a-zA-Z0-9_-]/g,
          "-",
        );
        const toolKey = String(name).replace(/[^a-zA-Z0-9_-]/g, "-");
        const key = `${serverKey}__${toolKey}`;

        mcpToolSet[key] = {
          description: mcpTool.description,
          inputSchema: mcpTool.inputSchema,
          execute: async (args: unknown, execCtx: ToolExecutionOptions) => {
            const inputPreview =
              typeof args === "string"
                ? args
                : Array.isArray(args)
                  ? args.join(" ")
                  : JSON.stringify(args).slice(0, 500);

            const ok = await params.requestConsent({
              serverId: server.id,
              serverName: server.name ?? "",
              toolName: name,
              toolDescription: mcpTool.description,
              inputPreview,
            });

            if (!ok) {
              throw new Error(`User declined running tool ${key}`);
            }

            const result = await mcpTool.execute(args, execCtx);
            return typeof result === "string" ? result : JSON.stringify(result);
          },
        };
      }
    }
  } catch (error) {
    params.recordLog?.("warn", "Failed building MCP toolset", error);
  }

  return mcpToolSet;
}
