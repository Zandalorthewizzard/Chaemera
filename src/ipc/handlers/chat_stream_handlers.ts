import { appLog as log } from "@/lib/app_logger";
import type { ChatResponseEnd, ChatStreamParams } from "@/ipc/types";
import type { ToolExecutionOptions, ToolSet } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { mcpServers } from "../../db/schema";
import {
  formatMessagesForSummary,
  hasUnclosedXmlWrite,
  removeProblemReportTags,
  removeXmlTags,
  runChatStreamSession,
  type ChatRuntimeContext,
} from "../chat_runtime";
import { chatContracts } from "../types/chat";
import { mcpManager } from "../utils/mcp_manager";
import { requireMcpToolConsent } from "../utils/mcp_consent";
import { safeSend } from "../utils/safe_sender";
import { sendTelemetryEvent } from "../utils/telemetry";
import { createTypedHandler } from "./base";
import { ipcMain, type IpcMainInvokeEvent } from "./electron_compat";
import { handleLocalAgentStream } from "./local_agent/local_agent_handler";
import { getTestResponse, streamTestResponse } from "./testing_chat_handlers";

const logger = log.scope("chat_stream_handlers");

const activeStreams = new Map<number, AbortController>();

async function getMcpTools(event: IpcMainInvokeEvent): Promise<ToolSet> {
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

            const ok = await requireMcpToolConsent(event, {
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
    logger.warn("Failed building MCP toolset", error);
  }

  return mcpToolSet;
}

function buildChatRuntimeContext(
  event: IpcMainInvokeEvent,
  req: ChatStreamParams,
  abortController: AbortController,
): ChatRuntimeContext {
  return {
    params: req,
    abortSignal: abortController.signal,
    cloudRequestId: undefined,
    onStreamStart: (chatId) => {
      safeSend(event.sender, "chat:stream:start", { chatId });
    },
    onChunk: (chatId, messages) => {
      safeSend(event.sender, "chat:response:chunk", {
        chatId,
        messages,
      });
    },
    onEnd: (chatId, data) => {
      safeSend(event.sender, "chat:response:end", {
        chatId,
        ...data,
      } satisfies ChatResponseEnd);
    },
    onError: (chatId, error) => {
      safeSend(event.sender, "chat:response:error", {
        chatId,
        error,
      });
    },
    isCancelled: () => abortController.signal.aborted,
    requestAgentToolConsent: async () => true,
    requestMcpToolConsent: async (request) =>
      requireMcpToolConsent(event, {
        serverId: request.serverId,
        serverName: request.serverName ?? "",
        toolName: request.toolName,
        toolDescription: request.toolDescription,
        inputPreview: request.inputPreview,
      }),
    recordLog: (level, message) => {
      if (level === "error") {
        logger.error(message);
        return;
      }
      if (level === "warn") {
        logger.warn(message);
        return;
      }
      logger.info(message);
    },
    getMcpTools: () => getMcpTools(event),
    handleLocalAgentStream: async ({
      placeholderMessageId,
      systemPrompt,
      cloudRequestId,
      readOnly,
      planModeOnly,
      messageOverride,
    }) =>
      handleLocalAgentStream(event, req, abortController, {
        placeholderMessageId,
        systemPrompt,
        cloudRequestId,
        readOnly,
        planModeOnly,
        messageOverride,
      }),
    sendTelemetryEvent: (eventName, data) => {
      sendTelemetryEvent(event.sender, eventName, data);
    },
    getTestResponse,
    streamTestResponse: async ({ chatId, testResponse, updatedChat }) =>
      streamTestResponse(
        event,
        chatId,
        testResponse,
        abortController,
        updatedChat,
      ),
  };
}

export function registerChatStreamHandlers() {
  ipcMain.handle("chat:stream", async (event, req: ChatStreamParams) => {
    const abortController = new AbortController();
    activeStreams.set(req.chatId, abortController);

    try {
      const ctx = buildChatRuntimeContext(event, req, abortController);
      return await runChatStreamSession(ctx);
    } finally {
      activeStreams.delete(req.chatId);
      safeSend(event.sender, "chat:stream:end", { chatId: req.chatId });
    }
  });

  createTypedHandler(chatContracts.cancelStream, async (event, chatId) => {
    const abortController = activeStreams.get(chatId);

    if (abortController) {
      abortController.abort();
      activeStreams.delete(chatId);
      logger.log(`Aborted stream for chat ${chatId}`);
    } else {
      logger.warn(`No active stream found for chat ${chatId}`);
    }

    safeSend(event.sender, "chat:response:end", {
      chatId,
      updatedFiles: false,
      wasCancelled: true,
    } satisfies ChatResponseEnd);

    safeSend(event.sender, "chat:stream:end", { chatId });

    return true;
  });
}

export {
  formatMessagesForSummary,
  hasUnclosedXmlWrite,
  removeProblemReportTags,
  removeXmlTags,
};
