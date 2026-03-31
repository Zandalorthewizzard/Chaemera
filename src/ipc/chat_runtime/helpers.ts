/**
 * Host-neutral utility functions for the chat runtime.
 * Extracted from chat_stream_handlers.ts — NO Electron dependencies.
 */

import * as path from "path";
import { appLog as log } from "@/lib/app_logger";
import type { ImagePart, ModelMessage, TextPart } from "ai";
import { readFile } from "fs/promises";

const logger = log.scope("chat_runtime");

export type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

// ============================================================================
// Text file detection
// ============================================================================

const TEXT_FILE_EXTENSIONS = [
  ".md",
  ".txt",
  ".json",
  ".csv",
  ".js",
  ".ts",
  ".html",
  ".css",
];

export async function isTextFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

// ============================================================================
// Dyad tag handling
// ============================================================================

/**
 * Escape dyad tags in reasoning content to prevent them from being parsed.
 * Replaces "<dyad" with Cyrillic look-alikes so the parser ignores them.
 */
export function escapeDyadTags(text: string): string {
  const normalizedText = stringifyDyadTagContent(text);
  return normalizedText
    .replace(/<dyad/g, "пјњdyad")
    .replace(/<\/dyad/g, "пјњ/dyad");
}

export function stringifyDyadTagContent(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  try {
    const json = JSON.stringify(value);
    if (typeof json === "string") {
      return json;
    }
  } catch {
    // Fall through to String coercion below.
  }

  return String(value);
}

export function hasUnclosedXmlWrite(text: string): boolean {
  const openRegex = /<dyad-write[^>]*>/g;
  let lastOpenIndex = -1;
  let match;

  while ((match = openRegex.exec(text)) !== null) {
    lastOpenIndex = match.index;
  }

  if (lastOpenIndex === -1) {
    return false;
  }

  const textAfterLastOpen = text.substring(lastOpenIndex);
  return !/<\/dyad-write>/.test(textAfterLastOpen);
}

export function removeNonEssentialTags(text: string): string {
  return removeProblemReportTags(removeThinkingTags(text));
}

export function removeThinkingTags(text: string): string {
  const thinkRegex = /<think(?:[^>]*)>([\s\S]*?)<\/think>/g;
  return text.replace(thinkRegex, "").trim();
}

export function removeProblemReportTags(text: string): string {
  const problemReportRegex =
    /<dyad-problem-report[^>]*>[\s\S]*?<\/dyad-problem-report>/g;
  return text.replace(problemReportRegex, "").trim();
}

export function removeXmlTags(text: string): string {
  const dyadRegex = /<dyad-[^>]*>[\s\S]*?<\/dyad-[^>]*>/g;
  return text.replace(dyadRegex, "").trim();
}

// ============================================================================
// MCP tool key parsing
// ============================================================================

export function parseMcpToolKey(toolKey: string): {
  serverName: string;
  toolName: string;
} {
  const separator = "__";
  const lastIndex = toolKey.lastIndexOf(separator);
  if (lastIndex === -1) {
    return { serverName: "", toolName: toolKey };
  }
  const serverName = toolKey.slice(0, lastIndex);
  const toolName = toolKey.slice(lastIndex + separator.length);
  return { serverName, toolName };
}

// ============================================================================
// Codebase prompt builders
// ============================================================================

export const CODEBASE_PROMPT_PREFIX = "This is my codebase.";

export function createCodebasePrompt(codebaseInfo: string): string {
  return `${CODEBASE_PROMPT_PREFIX} ${codebaseInfo}`;
}

export function createOtherAppsCodebasePrompt(
  otherAppsCodebaseInfo: string,
): string {
  return `
# Referenced Apps

These are the other apps that I've mentioned in my prompt. These other apps' codebases are READ-ONLY.

${otherAppsCodebaseInfo}
`;
}

// ============================================================================
// Message formatting
// ============================================================================

export function formatMessagesForSummary(
  msgs: { role: string; content: string | undefined }[],
): string {
  if (msgs.length <= 8) {
    return msgs
      .map((m) => `<message role="${m.role}">${m.content}</message>`)
      .join("\n");
  }

  const firstMessages = msgs.slice(0, 2);
  const lastMessages = msgs.slice(-6);

  const combinedMessages = [
    ...firstMessages,
    {
      role: "system",
      content: `[... ${msgs.length - 8} messages omitted ...]`,
    },
    ...lastMessages,
  ];

  return combinedMessages
    .map((m) => `<message role="${m.role}">${m.content}</message>`)
    .join("\n");
}

// ============================================================================
// Attachment handling
// ============================================================================

export async function replaceTextAttachmentWithContent(
  text: string,
  filePath: string,
  fileName: string,
): Promise<string> {
  try {
    if (await isTextFile(filePath)) {
      const fullContent = await readFile(filePath, "utf-8");

      const escapedPath = filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tagPattern = new RegExp(
        `<dyad-text-attachment filename="[^"]*" type="[^"]*" path="${escapedPath}">\\s*<\\/dyad-text-attachment>`,
        "g",
      );

      const replacedText = text.replace(
        tagPattern,
        `Full content of ${fileName}:\n\`\`\`\n${fullContent}\n\`\`\``,
      );

      logger.log(
        `Replaced text attachment content for: ${fileName} - length before: ${text.length} - length after: ${replacedText.length}`,
      );
      return replacedText;
    }
    return text;
  } catch (error) {
    logger.error(`Error processing text file: ${error}`);
    return text;
  }
}

export async function prepareMessageWithAttachments(
  message: ModelMessage,
  attachmentPaths: string[],
): Promise<ModelMessage> {
  let textContent = message.content;
  if (typeof textContent !== "string") {
    logger.warn(
      "Message content is not a string - shouldn't happen but using message as-is",
    );
    return message;
  }

  for (const filePath of attachmentPaths) {
    const fileName = path.basename(filePath);
    textContent = await replaceTextAttachmentWithContent(
      textContent,
      filePath,
      fileName,
    );
  }

  const contentParts: (TextPart | ImagePart)[] = [];
  contentParts.push({ type: "text", text: textContent });

  for (const filePath of attachmentPaths) {
    const ext = path.extname(filePath).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      try {
        const imageBuffer = await readFile(filePath);
        const mimeType =
          ext === ".jpg" ? "image/jpeg" : `image/${ext.slice(1)}`;
        const base64Data = imageBuffer.toString("base64");

        contentParts.push({
          type: "image",
          image: base64Data,
          mediaType: mimeType,
        });

        logger.log(`Added image attachment: ${filePath}`);
      } catch (error) {
        logger.error(`Error reading image file: ${error}`);
      }
    }
  }

  return {
    role: "user",
    content: contentParts,
  };
}
