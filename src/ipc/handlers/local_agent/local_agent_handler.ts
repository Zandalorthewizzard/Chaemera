import type { IpcMainInvokeEvent } from "electron";
import type { ChatResponseEnd, ChatStreamParams } from "@/ipc/types";
import { safeSend } from "../../utils/safe_sender";

export interface HandleLocalAgentStreamOptions {
  placeholderMessageId: number;
  systemPrompt: string;
  dyadRequestId: string;
  readOnly?: boolean;
  planModeOnly?: boolean;
  messageOverride?: unknown;
}

function getModeLabel(options: HandleLocalAgentStreamOptions): string {
  if (options.readOnly) {
    return "Ask mode";
  }
  if (options.planModeOnly) {
    return "Plan mode";
  }
  return "Agent mode";
}

export async function handleLocalAgentStream(
  event: IpcMainInvokeEvent,
  req: ChatStreamParams,
  _abortController: AbortController,
  options: HandleLocalAgentStreamOptions,
): Promise<boolean> {
  const modeLabel = getModeLabel(options);

  safeSend(event.sender, "chat:response:error", {
    chatId: req.chatId,
    error: `${modeLabel} is not available in this open-source build yet. Please switch to Build mode.`,
  });

  safeSend(event.sender, "chat:response:end", {
    chatId: req.chatId,
    updatedFiles: false,
  } satisfies ChatResponseEnd);

  return false;
}
