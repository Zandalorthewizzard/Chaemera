import * as crypto from "crypto";

import type { ChatRuntimeContext } from "./types";
import type { WorkerOutboundMessage, WorkerStartMessage } from "./types";

interface PendingConsent {
  resolve: (approved: boolean) => void;
}

interface ActiveSession {
  abortController: AbortController;
  consentPromises: Map<string, PendingConsent>;
}

export class ChatWorkerSessionManager {
  private activeSessions = new Map<number, ActiveSession>();
  private sendFn: (msg: WorkerOutboundMessage) => void;

  constructor(sendFn: (msg: WorkerOutboundMessage) => void) {
    this.sendFn = sendFn;
  }

  private send(msg: WorkerOutboundMessage): void {
    this.sendFn(msg);
  }

  log(level: "info" | "warn" | "error", message: string): void {
    this.send({ type: "log", level, message });
  }

  buildRuntimeContext(
    msg: WorkerStartMessage,
    abortController: AbortController,
    consentMap: Map<string, PendingConsent>,
  ): ChatRuntimeContext {
    // TODO(Phase 3): msg.appPath and msg.settingsSnapshot are carried here for
    // when the Rust host provides the runtime environment. Currently
    // runChatStreamSession calls readSettings()/getAppPath() internally.
    return {
      params: {
        chatId: msg.chatId,
        prompt: msg.prompt,
        redo: msg.redo,
        attachments: msg.attachments,
        selectedComponents: msg.selectedComponents,
      },
      abortSignal: abortController.signal,
      cloudRequestId: undefined,
      onStreamStart: (chatId) => {
        this.send({ type: "stream_start", chatId });
      },
      onChunk: (chatId, messages) => {
        this.send({ type: "chunk", chatId, messages });
      },
      onEnd: (chatId, data) => {
        this.send({
          type: "end",
          chatId,
          updatedFiles: data.updatedFiles,
          extraFiles: data.extraFiles,
          extraFilesError: data.extraFilesError,
          totalTokens: data.totalTokens,
          contextWindow: data.contextWindow,
          chatSummary: data.chatSummary,
          wasCancelled: data.wasCancelled,
        });
      },
      onError: (chatId, error) => {
        this.send({ type: "error", chatId, error });
      },
      isCancelled: () => abortController.signal.aborted,
      requestAgentToolConsent: (request) => {
        const requestId = crypto.randomUUID();
        this.send({
          type: "agent_tool_consent_request",
          requestId,
          toolName: request.toolName,
          toolDescription: request.toolDescription,
          inputPreview: request.inputPreview,
        });
        return new Promise<boolean>((resolve) => {
          consentMap.set(requestId, { resolve });
        });
      },
      requestMcpToolConsent: (request) => {
        const requestId = crypto.randomUUID();
        this.send({
          type: "mcp_tool_consent_request",
          requestId,
          serverId: request.serverId,
          serverName: request.serverName,
          toolName: request.toolName,
          toolDescription: request.toolDescription,
          inputPreview: request.inputPreview,
        });
        return new Promise<boolean>((resolve) => {
          consentMap.set(requestId, { resolve });
        });
      },
      recordLog: (level, message) => {
        this.log(level, message);
      },
    };
  }

  async handleStart(
    msg: WorkerStartMessage,
    runSession: (ctx: ChatRuntimeContext) => Promise<number | "error">,
  ): Promise<void> {
    if (this.activeSessions.has(msg.chatId)) {
      this.send({
        type: "error",
        chatId: msg.chatId,
        error: `Session already active for chat ${msg.chatId}`,
      });
      return;
    }

    const abortController = new AbortController();
    const consentMap = new Map<string, PendingConsent>();

    this.activeSessions.set(msg.chatId, {
      abortController,
      consentPromises: consentMap,
    });

    this.log("info", `Starting chat stream session for chat ${msg.chatId}`);

    const ctx = this.buildRuntimeContext(msg, abortController, consentMap);

    try {
      await runSession(ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.send({
        type: "error",
        chatId: msg.chatId,
        error: `Unhandled error in chat session: ${message}`,
      });
      this.log(
        "error",
        `Unhandled error in chat session ${msg.chatId}: ${message}`,
      );
    } finally {
      this.cleanupSession(msg.chatId);
    }
  }

  handleCancel(chatId: number): void {
    const session = this.activeSessions.get(chatId);
    if (session) {
      session.abortController.abort();
      for (const [, pending] of session.consentPromises) {
        pending.resolve(false);
      }
      session.consentPromises.clear();
      this.log("info", `Cancelled session for chat ${chatId}`);
    } else {
      this.log("warn", `No active session to cancel for chat ${chatId}`);
    }
  }

  handleConsentResponse(requestId: string, approved: boolean): void {
    for (const [, session] of this.activeSessions) {
      const pending = session.consentPromises.get(requestId);
      if (pending) {
        pending.resolve(approved);
        session.consentPromises.delete(requestId);
        return;
      }
    }
    this.log(
      "warn",
      `No pending consent request found for requestId ${requestId}`,
    );
  }

  private cleanupSession(chatId: number): void {
    const session = this.activeSessions.get(chatId);
    if (session) {
      for (const [, pending] of session.consentPromises) {
        pending.resolve(false);
      }
      this.activeSessions.delete(chatId);
      this.log("info", `Cleaned up session for chat ${chatId}`);
    }
  }

  hasSession(chatId: number): boolean {
    return this.activeSessions.has(chatId);
  }
}
