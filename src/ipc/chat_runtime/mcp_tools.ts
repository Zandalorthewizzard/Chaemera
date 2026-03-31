import type { ToolExecutionOptions, ToolSet } from "ai";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { mcpServers } from "../../db/schema";
import { mcpManager } from "../utils/mcp_manager";

const MCP_SERVER_INIT_TIMEOUT_MS = 5_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

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

  const servers = await db
    .select()
    .from(mcpServers)
    .where(eq(mcpServers.enabled, true as any));

  for (const server of servers) {
    try {
      const client = await withTimeout(
        mcpManager.getClient(server.id),
        MCP_SERVER_INIT_TIMEOUT_MS,
        `Timed out initializing MCP server ${server.id}`,
      );
      const toolSet = await withTimeout(
        client.tools(),
        MCP_SERVER_INIT_TIMEOUT_MS,
        `Timed out listing tools for MCP server ${server.id}`,
      );

      for (const [name, mcpTool] of Object.entries(toolSet)) {
        const serverKey = String(server.name || "").replace(
          /[^a-zA-Z0-9_-]/g,
          "-",
        );
        const toolKey = String(name).replace(/[^a-zA-Z0-9_-]/g, "-");
        const key = `${serverKey}__${toolKey}`;

        const wrappedTool = Object.create(Object.getPrototypeOf(mcpTool));
        Object.defineProperties(
          wrappedTool,
          Object.getOwnPropertyDescriptors(mcpTool),
        );
        Object.defineProperty(wrappedTool, "execute", {
          value: async (args: unknown, execCtx: ToolExecutionOptions) => {
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
            return result;
          },
          configurable: true,
          writable: true,
        });

        const toModelOutput = mcpTool.toModelOutput;
        if (typeof toModelOutput === "function") {
          Object.defineProperty(wrappedTool, "toModelOutput", {
            value: async (options: Parameters<typeof toModelOutput>[0]) => {
              let output = options.output;

              if (typeof output === "string") {
                try {
                  output = JSON.parse(output) as typeof options.output;
                } catch {
                  output = options.output;
                }
              }

              return toModelOutput({
                ...options,
                output,
              });
            },
            configurable: true,
            writable: true,
          });
        }

        mcpToolSet[key] = wrappedTool;
      }
    } catch (error) {
      mcpManager.dispose(server.id);
      params.recordLog?.(
        "warn",
        `Failed building MCP toolset for server ${server.id}`,
        error,
      );
    }
  }

  return mcpToolSet;
}
