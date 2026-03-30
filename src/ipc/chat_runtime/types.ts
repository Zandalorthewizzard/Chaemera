import type { UserSettings } from "@/lib/schemas";
import type { ModelMessage, ToolSet } from "ai";

import type {
  ChatAttachment,
  ChatResponseEnd,
  ChatStreamParams,
  ComponentSelection,
  Message,
} from "../types/chat";

// ============================================================================
// Consent Request Types
// ============================================================================

export interface AgentToolConsentRequest {
  toolName: string;
  toolDescription: string;
  inputPreview: string;
}

export interface McpToolConsentRequest {
  serverId: number;
  serverName: string | null;
  toolName: string;
  toolDescription: string;
  inputPreview: string;
}

// ============================================================================
// ChatRuntimeContext — Host-Neutral Runtime Interface
// ============================================================================

/**
 * Host-neutral runtime context.
 * Replaces all direct Electron dependencies (ipcMain, event.sender, safeSend).
 * The Electron adapter implements this; a future Node worker adapter will too.
 */
export interface ChatRuntimeContext {
  /** The chat stream parameters */
  params: ChatStreamParams;

  /** Host-authored runtime environment for the active session when available */
  runtimeEnvironment?: {
    appPath?: string;
    settingsSnapshot?: UserSettings;
  };

  /** Called when the stream starts */
  onStreamStart: (chatId: number) => void;

  /** Send a chunk update to the renderer with updated messages */
  onChunk: (chatId: number, messages: Message[]) => void;

  /** Send stream end event */
  onEnd: (chatId: number, data: Omit<ChatResponseEnd, "chatId">) => void;

  /** Send an error event */
  onError: (chatId: number, error: string) => void;

  /** Check if the stream has been cancelled */
  isCancelled: () => boolean;

  /** Request agent tool consent (returns true if approved) */
  requestAgentToolConsent: (
    request: AgentToolConsentRequest,
  ) => Promise<boolean>;

  /** Request MCP tool consent (returns true if approved) */
  requestMcpToolConsent: (request: McpToolConsentRequest) => Promise<boolean>;

  /** Log a message for diagnostics */
  recordLog: (level: "info" | "warn" | "error", message: string) => void;

  /** AbortSignal for the stream */
  abortSignal: AbortSignal;

  // ========================================================================
  // Optional Electron-only capabilities (provided by Electron adapter only)
  // ========================================================================

  /** Get MCP tools from enabled servers (Electron-only, needs event.sender) */
  getMcpTools?: () => Promise<ToolSet>;

  /** Handle local-agent/ask/plan mode streams (Electron-only, needs event) */
  handleLocalAgentStream?: (params: {
    placeholderMessageId: number;
    systemPrompt: string;
    cloudRequestId: string;
    readOnly?: boolean;
    planModeOnly?: boolean;
    messageOverride?: ModelMessage[] | undefined;
  }) => Promise<boolean>;

  /** Send telemetry event (Electron-only, needs event.sender) */
  sendTelemetryEvent?: (
    eventName: string,
    data: Record<string, unknown>,
  ) => void;

  /** Check if prompt is a test prompt and return canned response */
  getTestResponse?: (prompt: string) => string | null;

  /** Stream a test response to the renderer */
  streamTestResponse?: (params: {
    chatId: number;
    testResponse: string;
    abortSignal: AbortSignal;
    updatedChat: {
      messages: Message[];
    };
    placeholderMessageId: number;
  }) => Promise<string>;

  /** The cloud request ID for engine/telemetry correlation */
  cloudRequestId?: string;
}

// ============================================================================
// Worker Protocol — Rust -> Worker Messages
// ============================================================================

export interface WorkerStartMessage {
  type: "start";
  chatId: number;
  prompt: string;
  redo: boolean;
  attachments: ChatAttachment[];
  selectedComponents: ComponentSelection[];
  appPath: string;
  settingsSnapshot: Record<string, unknown>;
}

export interface WorkerCancelMessage {
  type: "cancel";
  chatId: number;
}

export interface WorkerToolConsentResponse {
  type: "tool_consent_response";
  requestId: string;
  approved: boolean;
}

export interface WorkerMcpToolConsentResponse {
  type: "mcp_tool_consent_response";
  requestId: string;
  approved: boolean;
}

/** Union type for all messages from Rust host to Node worker */
export type WorkerInboundMessage =
  | WorkerStartMessage
  | WorkerCancelMessage
  | WorkerToolConsentResponse
  | WorkerMcpToolConsentResponse;

// ============================================================================
// Worker Protocol — Worker -> Rust Messages
// ============================================================================

export interface WorkerStreamStartEvent {
  type: "stream_start";
  chatId: number;
}

export interface WorkerChunkEvent {
  type: "chunk";
  chatId: number;
  messages: Message[];
}

export interface WorkerEndEvent {
  type: "end";
  chatId: number;
  updatedFiles: boolean;
  extraFiles?: string[];
  extraFilesError?: string;
  totalTokens?: number;
  contextWindow?: number;
  chatSummary?: string;
  wasCancelled?: boolean;
}

export interface WorkerErrorEvent {
  type: "error";
  chatId: number;
  error: string;
}

export interface WorkerAgentToolConsentRequest {
  type: "agent_tool_consent_request";
  requestId: string;
  toolName: string;
  toolDescription: string;
  inputPreview: string;
}

export interface WorkerMcpToolConsentRequest {
  type: "mcp_tool_consent_request";
  requestId: string;
  serverId: number;
  serverName: string | null;
  toolName: string;
  toolDescription: string;
  inputPreview: string;
}

export interface WorkerLogEvent {
  type: "log";
  level: "info" | "warn" | "error";
  message: string;
}

/** Union type for all messages from Node worker to Rust host */
export type WorkerOutboundMessage =
  | WorkerStreamStartEvent
  | WorkerChunkEvent
  | WorkerEndEvent
  | WorkerErrorEvent
  | WorkerAgentToolConsentRequest
  | WorkerMcpToolConsentRequest
  | WorkerLogEvent;
