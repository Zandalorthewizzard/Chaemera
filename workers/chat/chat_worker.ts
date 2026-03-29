import { parentPort } from "node:worker_threads";

import { initializeDatabase } from "../../src/db";
import { runChatStreamSession } from "../../src/ipc/chat_runtime/run_chat_stream_session";
import type { WorkerInboundMessage } from "../../src/ipc/chat_runtime/types";
import { ChatWorkerSessionManager } from "../../src/ipc/chat_runtime/worker_session_manager";

initializeDatabase();

const manager = new ChatWorkerSessionManager((msg) => {
  parentPort?.postMessage(msg);
});

parentPort?.on(
  "message",
  async (msg: WorkerInboundMessage | { type: "shutdown" }) => {
    try {
      if (msg.type === "shutdown") {
        manager.log("info", "Chat worker shutting down");
        process.exit(0);
      }

      switch (msg.type) {
        case "start":
          await manager.handleStart(msg, runChatStreamSession);
          break;
        case "cancel":
          manager.handleCancel(msg.chatId);
          break;
        case "tool_consent_response":
          manager.handleConsentResponse(msg.requestId, msg.approved);
          break;
        case "mcp_tool_consent_response":
          manager.handleConsentResponse(msg.requestId, msg.approved);
          break;
      }
    } catch (err) {
      manager.log(
        "error",
        `Error handling inbound message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  },
);

manager.log("info", "Chat worker started and ready");
