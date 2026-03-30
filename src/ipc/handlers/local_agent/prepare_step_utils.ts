import type { ModelMessage } from "ai";
import type { Todo, UserMessageContentPart } from "./tools/types";

type TransformedUserPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      image: URL;
    };

export interface InjectedMessage {
  insertAtIndex: number;
  sequence: number;
  message: ModelMessage;
}

export function transformContentPart(
  part: UserMessageContentPart,
): TransformedUserPart {
  if (part.type === "text") {
    return { type: "text", text: part.text };
  }
  return { type: "image", image: new URL(part.url) };
}

export function processPendingMessages(
  pendingUserMessages: UserMessageContentPart[][],
  allInjectedMessages: InjectedMessage[],
  currentMessageCount: number,
) {
  let sequence = allInjectedMessages.length;

  while (pendingUserMessages.length > 0) {
    const pending = pendingUserMessages.shift();
    if (!pending) {
      continue;
    }
    allInjectedMessages.push({
      insertAtIndex: currentMessageCount,
      sequence,
      message: {
        role: "user",
        content: pending.map(transformContentPart),
      },
    });
    sequence += 1;
  }
}

export function injectMessagesAtPositions<TMessage>(
  messages: TMessage[],
  injectedMessages: InjectedMessage[],
): (TMessage | ModelMessage)[] {
  if (injectedMessages.length === 0) {
    return messages;
  }

  const orderedInjected = [...injectedMessages].sort((a, b) => {
    if (a.insertAtIndex !== b.insertAtIndex) {
      return a.insertAtIndex - b.insertAtIndex;
    }
    return a.sequence - b.sequence;
  });

  const merged: (TMessage | ModelMessage)[] = [];
  let injectedIndex = 0;

  for (let i = 0; i <= messages.length; i += 1) {
    while (
      injectedIndex < orderedInjected.length &&
      orderedInjected[injectedIndex].insertAtIndex === i
    ) {
      merged.push(orderedInjected[injectedIndex].message);
      injectedIndex += 1;
    }

    if (i < messages.length) {
      merged.push(messages[i]);
    }
  }

  return merged;
}

function stripTransientProviderMetadata(part: any): {
  part: any;
  changed: boolean;
} {
  if (!part || typeof part !== "object") {
    return { part, changed: false };
  }

  const providerOptions = part.providerOptions;
  const openaiOptions = providerOptions?.openai;
  if (!openaiOptions || typeof openaiOptions !== "object") {
    return { part, changed: false };
  }
  if (!("itemId" in openaiOptions)) {
    return { part, changed: false };
  }

  const { itemId: _itemId, ...restOpenAiOptions } = openaiOptions;
  const nextOpenAiOptions = restOpenAiOptions;
  const nextProviderOptions =
    Object.keys(nextOpenAiOptions).length > 0
      ? { ...providerOptions, openai: nextOpenAiOptions }
      : Object.fromEntries(
          Object.entries(providerOptions).filter(([key]) => key !== "openai"),
        );

  const nextPart =
    Object.keys(nextProviderOptions).length > 0
      ? { ...part, providerOptions: nextProviderOptions }
      : Object.fromEntries(
          Object.entries(part).filter(([key]) => key !== "providerOptions"),
        );

  return { part: nextPart, changed: true };
}

function sanitizeAssistantMessage(message: ModelMessage): {
  message: ModelMessage;
  changed: boolean;
} {
  if (message.role !== "assistant" || !Array.isArray(message.content)) {
    return { message, changed: false };
  }

  let changed = false;
  const content = message.content as any[];

  const filtered = content
    .map((part) => {
      const normalized = stripTransientProviderMetadata(part);
      if (normalized.changed) {
        changed = true;
      }
      return normalized.part;
    })
    .filter((part, index, parts) => {
      if (part?.type !== "reasoning") {
        return true;
      }

      const hasOutputAfter = parts
        .slice(index + 1)
        .some((nextPart) => nextPart?.type !== "reasoning");

      if (!hasOutputAfter) {
        changed = true;
      }

      return hasOutputAfter;
    });

  if (!changed) {
    return { message, changed: false };
  }

  return {
    message: {
      ...message,
      content: filtered,
    },
    changed: true,
  };
}

export function prepareStepMessages<
  TOptions extends { messages: ModelMessage[] },
>(
  options: TOptions,
  pendingUserMessages: UserMessageContentPart[][],
  allInjectedMessages: InjectedMessage[],
): TOptions | undefined {
  let changed = false;

  if (pendingUserMessages.length > 0) {
    processPendingMessages(
      pendingUserMessages,
      allInjectedMessages,
      options.messages.length,
    );
    changed = true;
  }

  let messages: ModelMessage[] = options.messages;

  if (allInjectedMessages.length > 0) {
    messages = injectMessagesAtPositions(messages, allInjectedMessages).map(
      (message) => message as ModelMessage,
    );
    changed = true;
  }

  const sanitizedMessages = messages.map((message) => {
    const sanitized = sanitizeAssistantMessage(message);
    if (sanitized.changed) {
      changed = true;
    }
    return sanitized.message;
  });

  if (!changed) {
    return undefined;
  }

  return {
    ...options,
    messages: sanitizedMessages,
  };
}

export function hasIncompleteTodos(todos: Todo[]): boolean {
  return todos.some((todo) => todo.status !== "completed");
}

export function buildTodoReminderMessage(todos: Todo[]): string {
  const incomplete = todos.filter((todo) => todo.status !== "completed");
  const lines = incomplete.map((todo) => `- [${todo.status}] ${todo.content}`);
  return [
    `You still have ${incomplete.length} incomplete todo(s):`,
    ...lines,
  ].join("\n");
}
