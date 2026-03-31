import {
  type ModelMessage,
  type TextStreamPart,
  type ToolSet,
  hasToolCall,
  stepCountIs,
  streamText,
} from "ai";

import * as crypto from "crypto";
import fs from "node:fs";
import * as os from "os";
import * as path from "path";
import { MAX_CHAT_TURNS_IN_CONTEXT } from "@/constants/settings_constants";
import { appLog as log } from "@/lib/app_logger";
import { isSupabaseConnected, isTurboEditsV2Enabled } from "@/lib/schemas";
import { parseAppMentions } from "@/shared/parse_mention_apps";
import { createProblemFixPrompt } from "@/shared/problem_prompt";
import { AI_STREAMING_ERROR_MESSAGE_PREFIX } from "@/shared/texts";
import { and, eq, isNull } from "drizzle-orm";
import { inArray } from "drizzle-orm";
import { readFile, unlink, writeFile } from "fs/promises";
import z from "zod";
import { AsyncVirtualFileSystem } from "../../../shared/VirtualFilesystem";
import { escapeXmlAttr, escapeXmlContent } from "../../../shared/xmlEscape";
import { db } from "../../db";
import { chats, messages, prompts as promptsTable } from "../../db/schema";
import type { SmartContextMode } from "../../lib/schemas";
import { readSettings } from "../../main/settings";
import { getAppPath } from "../../paths/paths";
import { SECURITY_REVIEW_SYSTEM_PROMPT } from "../../prompts/security_review_prompt";
import { SUMMARIZE_CHAT_SYSTEM_PROMPT } from "../../prompts/summarize_chat_system_prompt";
import {
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
  getSupabaseAvailableSystemPrompt,
} from "../../prompts/supabase_prompt";
import {
  constructSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import {
  getSupabaseClientCode,
  getSupabaseContext,
} from "../../supabase_admin/supabase_context";
import {
  type CodebaseFile,
  extractCodebase,
  readFileWithCache,
} from "../../utils/codebase";
import { parsePlanFile, validatePlanId } from "../handlers/planUtils";
import {
  dryRunSearchReplace,
  processFullResponseActions,
} from "../processors/response_processor";
import { generateProblemReport } from "../processors/tsc";
import { getAiMessagesJsonIfWithinLimit } from "../utils/ai_messages_utils";
import { cleanFullResponse } from "../utils/cleanFullResponse";
import { validateChatContext } from "../utils/context_paths_utils";
import { FileUploadsState } from "../utils/file_uploads_state";
import { fileExists } from "../utils/file_utils";
import { type ModelClient, getModelClient } from "../utils/get_model_client";
import { getCurrentCommitHash } from "../utils/git_utils";
import { extractMentionedAppsCodebases } from "../utils/mention_apps";
import { getAiHeaders, getProviderOptions } from "../utils/provider_options";
import { replacePromptReference } from "../utils/replacePromptReference";
import { getThemePromptById } from "../utils/theme_utils";
import { getMaxTokens, getTemperature } from "../utils/token_utils";
import {
  type VersionedFiles,
  processChatMessagesWithVersionedFiles as getVersionedFiles,
} from "../utils/versioned_codebase_context";
import {
  getXmlAddDependencyTags,
  getXmlDeleteTags,
  getXmlRenameTags,
  getXmlWriteTags,
} from "../utils/xml_tag_parser";

import {
  type AsyncIterableStream,
  CODEBASE_PROMPT_PREFIX,
  createCodebasePrompt,
  createOtherAppsCodebasePrompt,
  escapeDyadTags,
  formatMessagesForSummary,
  hasUnclosedXmlWrite,
  isTextFile,
  parseMcpToolKey,
  prepareMessageWithAttachments,
  removeNonEssentialTags,
  removeXmlTags,
  stringifyDyadTagContent,
} from "./helpers";

import type { ChatRuntimeContext } from "./types";

const logger = log.scope("chat_runtime");

const partialResponses = new Map<number, string>();

const TEMP_DIR = path.join(os.tmpdir(), "dyad-attachments");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ============================================================================
// processStreamChunks — host-neutral stream chunk processor
// ============================================================================

async function processStreamChunks({
  fullStream,
  fullResponse,
  abortSignal,
  chatId,
  processResponseChunkUpdate,
}: {
  fullStream: AsyncIterableStream<TextStreamPart<ToolSet>>;
  fullResponse: string;
  abortSignal: AbortSignal;
  chatId: number;
  processResponseChunkUpdate: (params: {
    fullResponse: string;
  }) => Promise<string>;
}): Promise<{ fullResponse: string; incrementalResponse: string }> {
  let incrementalResponse = "";
  let inThinkingBlock = false;

  for await (const part of fullStream) {
    let chunk = "";
    if (
      inThinkingBlock &&
      !["reasoning-delta", "reasoning-end", "reasoning-start"].includes(
        part.type,
      )
    ) {
      chunk = "</think>";
      inThinkingBlock = false;
    }
    if (part.type === "text-delta") {
      chunk += part.text;
    } else if (part.type === "reasoning-delta") {
      if (!inThinkingBlock) {
        chunk = "<think>";
        inThinkingBlock = true;
      }
      chunk += escapeDyadTags(part.text);
    } else if (part.type === "tool-call") {
      const { serverName, toolName } = parseMcpToolKey(part.toolName);
      const content = escapeDyadTags(stringifyDyadTagContent(part.input));
      chunk = `<dyad-mcp-tool-call server="${serverName}" tool="${toolName}">\n${content}\n</dyad-mcp-tool-call>\n`;
    } else if (part.type === "tool-result") {
      const { serverName, toolName } = parseMcpToolKey(part.toolName);
      const content = escapeDyadTags(stringifyDyadTagContent(part.output));
      chunk = `<dyad-mcp-tool-result server="${serverName}" tool="${toolName}">\n${content}\n</dyad-mcp-tool-result>\n`;
    }

    if (!chunk) {
      continue;
    }

    fullResponse += chunk;
    incrementalResponse += chunk;
    fullResponse = cleanFullResponse(fullResponse);
    fullResponse = await processResponseChunkUpdate({
      fullResponse,
    });

    if (abortSignal.aborted) {
      logger.log(`Stream for chat ${chatId} was aborted`);
      break;
    }
  }

  return { fullResponse, incrementalResponse };
}

// ============================================================================
// Main export: runChatStreamSession
// ============================================================================

export async function runChatStreamSession(
  ctx: ChatRuntimeContext,
): Promise<number | "error"> {
  const req = ctx.params;
  const attachmentPaths: string[] = [];

  try {
    const fileUploadsState = FileUploadsState.getInstance();
    fileUploadsState.clear(req.chatId);

    const cloudRequestId = ctx.cloudRequestId;

    ctx.onStreamStart(req.chatId);

    // =========================================================================
    // 1. Get chat with messages and app info
    // =========================================================================
    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, req.chatId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
        app: true,
      },
    });

    if (!chat) {
      throw new Error(`Chat not found: ${req.chatId}`);
    }

    const resolveAppPathForChat = (rawAppPath: string): string => {
      if (ctx.runtimeEnvironment?.appPath && rawAppPath === chat.app.path) {
        return ctx.runtimeEnvironment.appPath;
      }

      return getAppPath(rawAppPath);
    };

    const settings = ctx.runtimeEnvironment?.settingsSnapshot ?? readSettings();

    // =========================================================================
    // 2. Handle redo option
    // =========================================================================
    if (req.redo) {
      const chatMessages = [...chat.messages];
      let lastUserMessageIndex = chatMessages.length - 1;
      while (
        lastUserMessageIndex >= 0 &&
        chatMessages[lastUserMessageIndex].role !== "user"
      ) {
        lastUserMessageIndex--;
      }

      if (lastUserMessageIndex >= 0) {
        await db
          .delete(messages)
          .where(eq(messages.id, chatMessages[lastUserMessageIndex].id));

        if (
          lastUserMessageIndex < chatMessages.length - 1 &&
          chatMessages[lastUserMessageIndex + 1].role === "assistant"
        ) {
          await db
            .delete(messages)
            .where(eq(messages.id, chatMessages[lastUserMessageIndex + 1].id));
        }
      }
    }

    // =========================================================================
    // 3. Process attachments
    // =========================================================================
    let attachmentInfo = "";

    if (req.attachments && req.attachments.length > 0) {
      attachmentInfo = "\n\nAttachments:\n";

      for (const [index, attachment] of req.attachments.entries()) {
        const hash = crypto
          .createHash("md5")
          .update(attachment.name + Date.now())
          .digest("hex");
        const fileExtension = path.extname(attachment.name);
        const filename = `${hash}${fileExtension}`;
        const filePath = path.join(TEMP_DIR, filename);

        const base64Data = attachment.data.split(";base64,").pop() || "";
        await writeFile(filePath, Buffer.from(base64Data, "base64"));
        attachmentPaths.push(filePath);

        if (attachment.attachmentType === "upload-to-codebase") {
          const fileId = `DYAD_ATTACHMENT_${index}`;
          fileUploadsState.addFileUpload(
            { chatId: req.chatId, fileId },
            { filePath, originalName: attachment.name },
          );
          attachmentInfo += `\n\nFile to upload to codebase: ${attachment.name} (file id: ${fileId})\n`;
        } else {
          attachmentInfo += `- ${attachment.name} (${attachment.type})\n`;
          if (await isTextFile(filePath)) {
            try {
              attachmentInfo += `<dyad-text-attachment filename="${attachment.name}" type="${attachment.type}" path="${filePath}">
                </dyad-text-attachment>
                \n\n`;
            } catch (err) {
              logger.error(`Error reading file content: ${err}`);
            }
          }
        }
      }
    }

    // =========================================================================
    // 4. User prompt preparation
    // =========================================================================
    let userPrompt = req.prompt + (attachmentInfo ? attachmentInfo : "");

    // Inline referenced prompt contents for @prompt:<id>
    try {
      const matches = Array.from(userPrompt.matchAll(/@prompt:(\d+)/g));
      if (matches.length > 0) {
        const ids = Array.from(new Set(matches.map((m) => Number(m[1]))));
        const referenced = await db
          .select()
          .from(promptsTable)
          .where(inArray(promptsTable.id, ids));
        if (referenced.length > 0) {
          const promptsMap: Record<number, string> = {};
          for (const p of referenced) {
            promptsMap[p.id] = p.content;
          }
          userPrompt = replacePromptReference(userPrompt, promptsMap);
        }
      }
    } catch (e) {
      logger.error("Failed to inline referenced prompts:", e);
    }

    // Expand /implement-plan= into full implementation prompt
    let implementPlanDisplayPrompt: string | undefined;
    const implementPlanMatch = userPrompt.match(/^\/implement-plan=(.+)$/);
    if (implementPlanMatch) {
      try {
        implementPlanDisplayPrompt = userPrompt;
        const planSlug = implementPlanMatch[1];
        validatePlanId(planSlug);
        const planAppPath = resolveAppPathForChat(chat.app.path);
        const planFilePath = path.join(
          planAppPath,
          ".dyad",
          "plans",
          `${planSlug}.md`,
        );
        const raw = await fs.promises.readFile(planFilePath, "utf-8");
        const { meta, content } = parsePlanFile(raw);
        const planPath = `.dyad/plans/${planSlug}.md`;

        userPrompt = `Please implement the following plan:

## ${meta.title || "Implementation Plan"}

${content}

Start implementing this plan now. Follow the steps outlined and create/modify the necessary files.
You may update the plan at \`${planPath}\` to mark your progress.`;
      } catch (e) {
        implementPlanDisplayPrompt = undefined;
        logger.error("Failed to expand /implement-plan= prompt:", e);
      }
    }

    // Selected component snippets
    const componentsToProcess = req.selectedComponents || [];
    if (componentsToProcess.length > 0) {
      userPrompt += "\n\nSelected components:\n";

      for (const component of componentsToProcess) {
        let componentSnippet = "[component snippet not available]";
        try {
          const componentFileContent = await readFile(
            path.join(
              resolveAppPathForChat(chat.app.path),
              component.relativePath,
            ),
            "utf8",
          );
          const lines = componentFileContent.split(/\r?\n/);
          const selectedIndex = component.lineNumber - 1;
          const startIndex = Math.max(0, selectedIndex - 1);
          const endIndex = Math.min(lines.length, selectedIndex + 4);
          const snippetLines = lines.slice(startIndex, endIndex);
          const selectedLineInSnippetIndex = selectedIndex - startIndex;

          if (snippetLines[selectedLineInSnippetIndex]) {
            snippetLines[selectedLineInSnippetIndex] =
              `${snippetLines[selectedLineInSnippetIndex]} // <-- EDIT HERE`;
          }
          componentSnippet = snippetLines.join("\n");
        } catch (err) {
          logger.error(`Error reading selected component file content: ${err}`);
        }

        userPrompt += `\n${componentsToProcess.length > 1 ? `${componentsToProcess.indexOf(component) + 1}. ` : ""}Component: ${component.name} (file: ${component.relativePath})

Snippet:
\`\`\`
${componentSnippet}
\`\`\`
`;
      }
    }

    // =========================================================================
    // 5. Insert user message
    // =========================================================================
    const [insertedUserMessage] = await db
      .insert(messages)
      .values({
        chatId: req.chatId,
        role: "user",
        content: implementPlanDisplayPrompt ?? userPrompt,
      })
      .returning({ id: messages.id });
    const userMessageId = insertedUserMessage.id;

    // =========================================================================
    // 6. Insert placeholder assistant message
    // =========================================================================
    const [placeholderAssistantMessage] = await db
      .insert(messages)
      .values({
        chatId: req.chatId,
        role: "assistant",
        content: "",
        requestId: cloudRequestId,
        model: settings.selectedModel.name,
        sourceCommitHash: await getCurrentCommitHash({
          path: resolveAppPathForChat(chat.app.path),
        }),
      })
      .returning();

    // =========================================================================
    // 7. Fetch updated chat data
    // =========================================================================
    const updatedChat = await db.query.chats.findFirst({
      where: eq(chats.id, req.chatId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
        app: true,
      },
    });

    if (!updatedChat) {
      throw new Error(`Chat not found: ${req.chatId}`);
    }

    ctx.onChunk(req.chatId, updatedChat.messages);

    let fullResponse = "";
    let maxTokensUsed: number | undefined;

    // =========================================================================
    // 8. Test response check
    // =========================================================================
    if (ctx.getTestResponse) {
      const testResponse = ctx.getTestResponse(req.prompt);
      if (testResponse && ctx.streamTestResponse) {
        fullResponse = await ctx.streamTestResponse({
          chatId: req.chatId,
          testResponse,
          abortSignal: ctx.abortSignal,
          updatedChat,
          placeholderMessageId: placeholderAssistantMessage.id,
        });
      }
    }

    if (!fullResponse) {
      // =======================================================================
      // 9. Model client + AI context setup
      // =======================================================================
      const { modelClient, isEngineEnabled, isSmartContextEnabled } =
        await getModelClient(settings.selectedModel, settings);

      const appPath = resolveAppPathForChat(updatedChat.app.path);
      const chatContext =
        req.selectedComponents &&
        req.selectedComponents.length > 0 &&
        !isSmartContextEnabled
          ? {
              contextPaths: req.selectedComponents.map((component) => ({
                globPath: component.relativePath,
              })),
              smartContextAutoIncludes: [],
            }
          : validateChatContext(updatedChat.app.chatContext);

      const { formattedOutput: codebaseInfo, files } = await extractCodebase({
        appPath,
        chatContext,
      });

      // Mark selected component files as focused for smart context
      if (
        isSmartContextEnabled &&
        req.selectedComponents &&
        req.selectedComponents.length > 0
      ) {
        const selectedPaths = new Set(
          req.selectedComponents.map((component) => component.relativePath),
        );
        for (const file of files) {
          if (selectedPaths.has(file.path)) {
            file.focused = true;
          }
        }
      }

      const mentionedAppNames = parseAppMentions(req.prompt);
      const mentionedAppsCodebases = await extractMentionedAppsCodebases(
        mentionedAppNames,
        updatedChat.app.id,
      );
      const willUseLocalAgentStream =
        (settings.selectedChatMode === "local-agent" ||
          settings.selectedChatMode === "ask") &&
        !mentionedAppsCodebases.length;

      const isDeepContextEnabled =
        isEngineEnabled &&
        settings.enableSmartFilesContextMode &&
        settings.smartContextOption !== "balanced" &&
        mentionedAppsCodebases.length === 0;
      logger.log(`isDeepContextEnabled: ${isDeepContextEnabled}`);

      let otherAppsCodebaseInfo = "";
      if (mentionedAppsCodebases.length > 0) {
        const mentionedAppsSection = mentionedAppsCodebases
          .map(
            ({ appName, codebaseInfo }) =>
              `\n\n=== Referenced App: ${appName} ===\n${codebaseInfo}`,
          )
          .join("");
        otherAppsCodebaseInfo = mentionedAppsSection;
        logger.log(
          `Added ${mentionedAppsCodebases.length} mentioned app codebases`,
        );
      }

      logger.log(`Extracted codebase information from ${appPath}`);
      logger.log(
        "codebaseInfo: length",
        codebaseInfo.length,
        "estimated tokens",
        codebaseInfo.length / 4,
      );

      // =========================================================================
      // 10. System prompt construction
      // =========================================================================
      const aiRules = await readAiRules(
        resolveAppPathForChat(updatedChat.app.path),
      );
      const themePrompt = await getThemePromptById(updatedChat.app.themeId);
      logger.log(
        `Theme for app ${updatedChat.app.id}: ${updatedChat.app.themeId ?? "none"}, prompt length: ${themePrompt.length} chars`,
      );

      let systemPrompt = constructSystemPrompt({
        aiRules,
        chatMode: settings.selectedChatMode,
        enableTurboEditsV2: isTurboEditsV2Enabled(settings),
        themePrompt,
        basicAgentMode: false,
      });

      if (otherAppsCodebaseInfo) {
        const mentionedAppsList = mentionedAppsCodebases
          .map(({ appName }) => appName)
          .join(", ");
        systemPrompt += `\n\n# Referenced Apps\nThe user has mentioned the following apps in their prompt: ${mentionedAppsList}. Their codebases have been included in the context for your reference. When referring to these apps, you can understand their structure and code to provide better assistance, however you should NOT edit the files in these referenced apps. The referenced apps are NOT part of the current app and are READ-ONLY.`;
      }

      const isSecurityReviewIntent = req.prompt.startsWith("/security-review");
      if (isSecurityReviewIntent) {
        systemPrompt = SECURITY_REVIEW_SYSTEM_PROMPT;
        try {
          const rulesPath = path.join(appPath, "SECURITY_RULES.md");
          let securityRules = "";
          await fs.promises.access(rulesPath);
          securityRules = await fs.promises.readFile(rulesPath, "utf8");
          if (securityRules && securityRules.trim().length > 0) {
            systemPrompt +=
              "\n\n# Project-specific security rules:\n" + securityRules;
          }
        } catch (error) {
          logger.info("Failed to read security rules", error);
        }
      }

      if (updatedChat.app?.supabaseProjectId && isSupabaseConnected(settings)) {
        const supabaseClientCode = await getSupabaseClientCode({
          projectId: updatedChat.app.supabaseProjectId,
          organizationSlug: updatedChat.app.supabaseOrganizationSlug ?? null,
        });
        systemPrompt +=
          "\n\n" +
          getSupabaseAvailableSystemPrompt(supabaseClientCode) +
          "\n\n" +
          (settings.selectedChatMode === "local-agent"
            ? ""
            : await getSupabaseContext({
                supabaseProjectId: updatedChat.app.supabaseProjectId,
                organizationSlug:
                  updatedChat.app.supabaseOrganizationSlug ?? null,
              }));
      } else if (
        !updatedChat.app?.neonProjectId &&
        settings.selectedChatMode !== "local-agent" &&
        !isSecurityReviewIntent
      ) {
        systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
      }

      const isSummarizeIntent = req.prompt.startsWith(
        "Summarize from chat-id=",
      );
      if (isSummarizeIntent) {
        systemPrompt = SUMMARIZE_CHAT_SYSTEM_PROMPT;
      }

      const hasImageAttachments =
        req.attachments &&
        req.attachments.some((attachment) =>
          attachment.type.startsWith("image/"),
        );
      const hasUploadedAttachments =
        req.attachments &&
        req.attachments.some(
          (attachment) => attachment.attachmentType === "upload-to-codebase",
        );
      const isAskMode = settings.selectedChatMode === "ask";

      if (hasUploadedAttachments) {
        if (willUseLocalAgentStream && !isAskMode) {
          systemPrompt += `

When files are attached to this conversation, upload them to the codebase using the \`write_file\` tool.
Use the attachment ID (e.g., DYAD_ATTACHMENT_0) as the content, and it will be automatically resolved to the actual file content.

Example for file with id of DYAD_ATTACHMENT_0:
\`\`\`
write_file(path="src/components/Button.jsx", content="DYAD_ATTACHMENT_0", description="Upload file to codebase")
\`\`\`
`;
        } else if (!isAskMode) {
          systemPrompt += `
  
When files are attached to this conversation, upload them to the codebase using this exact format:

<dyad-write path="path/to/destination/filename.ext" description="Upload file to codebase">
DYAD_ATTACHMENT_X
</dyad-write>

Example for file with id of DYAD_ATTACHMENT_0:
<dyad-write path="src/components/Button.jsx" description="Upload file to codebase">
DYAD_ATTACHMENT_0
</dyad-write>

  `;
        }
      } else if (hasImageAttachments) {
        systemPrompt += `

# Image Analysis Instructions
This conversation includes one or more image attachments. When the user uploads images:
1. If the user explicitly asks for analysis, description, or information about the image, please analyze the image content.
2. Describe what you see in the image if asked.
3. You can use images as references when the user has coding or design-related questions.
4. For diagrams or wireframes, try to understand the content and structure shown.
5. For screenshots of code or errors, try to identify the issue or explain the code.
`;
      }

      // =========================================================================
      // 11. Message history preparation
      // =========================================================================
      const messageHistory = updatedChat.messages.map((message) => ({
        role: message.role as "user" | "assistant" | "system",
        content: message.content,
        sourceCommitHash: message.sourceCommitHash,
        commitHash: message.commitHash,
      }));

      if (implementPlanDisplayPrompt) {
        for (let i = messageHistory.length - 1; i >= 0; i--) {
          if (messageHistory[i].role === "user") {
            messageHistory[i] = {
              ...messageHistory[i],
              content: userPrompt,
            };
            break;
          }
        }
      }

      const maxChatTurns = isDeepContextEnabled
        ? 201
        : (settings.maxChatTurnsInContext || MAX_CHAT_TURNS_IN_CONTEXT) + 1;

      let limitedMessageHistory = messageHistory;
      if (messageHistory.length > maxChatTurns * 2) {
        let recentMessages = messageHistory
          .filter((msg) => msg.role !== "system")
          .slice(-maxChatTurns * 2);

        if (recentMessages.length > 0 && recentMessages[0].role !== "user") {
          const firstUserIndex = recentMessages.findIndex(
            (msg) => msg.role === "user",
          );
          if (firstUserIndex > 0) {
            recentMessages = recentMessages.slice(firstUserIndex);
          } else if (firstUserIndex === -1) {
            logger.warn(
              "No user messages found in recent history, set recent messages to empty",
            );
            recentMessages = [];
          }
        }

        limitedMessageHistory = [...recentMessages];
        logger.log(
          `Limiting chat history from ${messageHistory.length} to ${limitedMessageHistory.length} messages (max ${maxChatTurns} turns)`,
        );
      }

      const codebasePrefix = isEngineEnabled
        ? []
        : ([
            {
              role: "user",
              content: createCodebasePrompt(codebaseInfo),
            },
            {
              role: "assistant",
              content: "OK, got it. I'm ready to help",
            },
          ] as const);

      const otherCodebasePrefix =
        otherAppsCodebaseInfo && !isEngineEnabled
          ? ([
              {
                role: "user",
                content: createOtherAppsCodebasePrompt(otherAppsCodebaseInfo),
              },
              {
                role: "assistant",
                content: "OK.",
              },
            ] as const)
          : [];

      const limitedHistoryChatMessages = limitedMessageHistory.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content:
          settings.selectedChatMode === "ask"
            ? removeXmlTags(removeNonEssentialTags(msg.content))
            : removeNonEssentialTags(msg.content),
        providerOptions: {
          "cloud-engine": {
            sourceCommitHash: msg.sourceCommitHash,
            commitHash: msg.commitHash,
          },
        },
      }));

      let chatMessages: ModelMessage[] = [
        ...codebasePrefix,
        ...otherCodebasePrefix,
        ...limitedHistoryChatMessages,
      ];

      if (chatMessages.length >= 2) {
        const lastUserIndex = chatMessages.length - 2;
        const lastUserMessage = chatMessages[lastUserIndex];
        if (lastUserMessage.role === "user") {
          if (attachmentPaths.length > 0) {
            chatMessages[lastUserIndex] = await prepareMessageWithAttachments(
              lastUserMessage,
              attachmentPaths,
            );
          }
          if (willUseLocalAgentStream) {
            const userAiMessagesJson = getAiMessagesJsonIfWithinLimit([
              chatMessages[lastUserIndex],
            ]);
            if (userAiMessagesJson) {
              await db
                .update(messages)
                .set({ aiMessagesJson: userAiMessagesJson })
                .where(eq(messages.id, userMessageId));
            }
          }
        }
      } else {
        logger.warn("Unexpected number of chat messages:", chatMessages.length);
      }

      if (isSummarizeIntent) {
        const previousChat = await db.query.chats.findFirst({
          where: eq(chats.id, Number.parseInt(req.prompt.split("=")[1])),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
          },
        });
        chatMessages = [
          {
            role: "user",
            content:
              "Summarize the following chat: " +
              formatMessagesForSummary(previousChat?.messages ?? []),
          } satisfies ModelMessage,
        ];
      }

      // =========================================================================
      // 12. simpleStreamText — AI model call wrapper
      // =========================================================================
      const simpleStreamTextFn = async ({
        chatMessages: streamMessages,
        modelClient: streamModelClient,
        tools,
        systemPromptOverride = systemPrompt,
        cloudDisableFiles = false,
        files: streamFiles,
      }: {
        chatMessages: ModelMessage[];
        modelClient: ModelClient;
        files: CodebaseFile[];
        tools?: ToolSet;
        systemPromptOverride?: string;
        cloudDisableFiles?: boolean;
      }) => {
        if (isEngineEnabled) {
          logger.log(
            "sending AI request to engine with request id:",
            cloudRequestId,
          );
        } else {
          logger.log("sending AI request");
        }
        let versionedFiles: VersionedFiles | undefined;
        if (isDeepContextEnabled) {
          versionedFiles = await getVersionedFiles({
            files: streamFiles,
            chatMessages: streamMessages,
            appPath,
          });
        }
        const smartContextMode: SmartContextMode = isDeepContextEnabled
          ? "deep"
          : "balanced";
        const providerOptions = getProviderOptions({
          cloudAppId: updatedChat.app.id,
          cloudRequestId,
          cloudDisableFiles,
          smartContextMode,
          files: streamFiles,
          versionedFiles,
          mentionedAppsCodebases,
          builtinProviderId: streamModelClient.builtinProviderId,
          settings,
        });

        const streamResult = streamText({
          headers: getAiHeaders({
            builtinProviderId: streamModelClient.builtinProviderId,
          }),
          maxOutputTokens: await getMaxTokens(settings.selectedModel),
          temperature: await getTemperature(settings.selectedModel),
          maxRetries: 2,
          model: streamModelClient.model,
          stopWhen: [stepCountIs(20), hasToolCall("edit-code")],
          providerOptions,
          system: systemPromptOverride,
          tools,
          messages: streamMessages.filter((m) => m.content),
          onFinish: (response) => {
            const totalTokens = response.usage?.totalTokens;
            if (typeof totalTokens === "number") {
              maxTokensUsed = Math.max(maxTokensUsed ?? 0, totalTokens);
              void db
                .update(messages)
                .set({ maxTokensUsed: maxTokensUsed })
                .where(eq(messages.id, placeholderAssistantMessage.id))
                .catch((error) => {
                  logger.error(
                    "Failed to save total tokens for assistant message",
                    error,
                  );
                });
              logger.log(
                `Total tokens used (aggregated for message ${placeholderAssistantMessage.id}): ${maxTokensUsed}`,
              );
            } else {
              logger.log("Total tokens used: unknown");
            }
          },
          onError: (error: unknown) => {
            if (ctx.abortSignal.aborted) {
              logger.log(
                `Ignoring stream error after cancellation for chat ${req.chatId}`,
              );
              return;
            }
            let errorMessage = (error as any)?.error?.message;
            const responseBody = (error as any)?.error?.responseBody;
            if (errorMessage && responseBody) {
              errorMessage += "\n\nDetails: " + responseBody;
            }
            const message = errorMessage || JSON.stringify(error);
            const requestIdPrefix = isEngineEnabled
              ? `[Request ID: ${cloudRequestId}] `
              : "";
            logger.error(
              `AI stream text error for request: ${requestIdPrefix} errorMessage=${errorMessage} error=`,
              error,
            );
            ctx.onError(
              req.chatId,
              `${AI_STREAMING_ERROR_MESSAGE_PREFIX}${requestIdPrefix}${message}`,
            );
          },
          abortSignal: ctx.abortSignal,
        });
        return {
          fullStream: streamResult.fullStream,
          usage: streamResult.usage,
        };
      };

      // =========================================================================
      // 13. processResponseChunkUpdate — save partial + send chunk to renderer
      // =========================================================================
      let lastDbSaveAt = 0;

      const processResponseChunkUpdate = async ({
        fullResponse: responseUpdate,
      }: {
        fullResponse: string;
      }) => {
        partialResponses.set(req.chatId, responseUpdate);
        const now = Date.now();
        if (now - lastDbSaveAt >= 150) {
          await db
            .update(messages)
            .set({ content: responseUpdate })
            .where(eq(messages.id, placeholderAssistantMessage.id));
          lastDbSaveAt = now;
        }

        const currentMessages = [...updatedChat.messages];
        if (
          currentMessages.length > 0 &&
          currentMessages[currentMessages.length - 1].role === "assistant"
        ) {
          currentMessages[currentMessages.length - 1].content = responseUpdate;
        }

        ctx.onChunk(req.chatId, currentMessages);
        return responseUpdate;
      };

      // =========================================================================
      // 14. Mode dispatch — ask/plan/local-agent delegate to adapter
      // =========================================================================
      if (
        settings.selectedChatMode === "ask" &&
        !mentionedAppsCodebases.length
      ) {
        const readOnlySystemPrompt = constructSystemPrompt({
          aiRules,
          chatMode: "local-agent",
          enableTurboEditsV2: false,
          themePrompt,
          readOnly: true,
        });

        if (ctx.handleLocalAgentStream) {
          const streamSuccess = await ctx.handleLocalAgentStream({
            placeholderMessageId: placeholderAssistantMessage.id,
            systemPrompt: readOnlySystemPrompt,
            cloudRequestId: cloudRequestId ?? "[no-request-id]",
            readOnly: true,
            messageOverride: isSummarizeIntent ? chatMessages : undefined,
          });
          if (!streamSuccess) {
            logger.warn(
              "Ask mode local agent stream did not complete successfully",
            );
          }
        }
        return req.chatId;
      }

      if (
        settings.selectedChatMode === "plan" &&
        !mentionedAppsCodebases.length
      ) {
        const planModeSystemPrompt = constructSystemPrompt({
          aiRules,
          chatMode: "plan",
          enableTurboEditsV2: false,
          themePrompt,
        });

        if (ctx.handleLocalAgentStream) {
          await ctx.handleLocalAgentStream({
            placeholderMessageId: placeholderAssistantMessage.id,
            systemPrompt: planModeSystemPrompt,
            cloudRequestId: cloudRequestId ?? "[no-request-id]",
            planModeOnly: true,
            messageOverride: isSummarizeIntent ? chatMessages : undefined,
          });
        }
        return req.chatId;
      }

      if (
        settings.selectedChatMode === "local-agent" &&
        !mentionedAppsCodebases.length
      ) {
        if (ctx.handleLocalAgentStream) {
          await ctx.handleLocalAgentStream({
            placeholderMessageId: placeholderAssistantMessage.id,
            systemPrompt,
            cloudRequestId: cloudRequestId ?? "[no-request-id]",
            messageOverride: isSummarizeIntent ? chatMessages : undefined,
          });
        }
        return req.chatId;
      }

      // =========================================================================
      // 15. MCP agent code path (build mode with MCP tools)
      // =========================================================================
      if (
        settings.enableMcpServersForBuildMode &&
        settings.selectedChatMode === "build"
      ) {
        let mcpTools: ToolSet = {};
        if (ctx.getMcpTools) {
          mcpTools = await ctx.getMcpTools();
        }
        const hasEnabledMcpServers = Object.keys(mcpTools).length > 0;

        if (hasEnabledMcpServers) {
          const { fullStream } = await simpleStreamTextFn({
            chatMessages: limitedHistoryChatMessages,
            modelClient,
            tools: {
              ...mcpTools,
              "generate-code": {
                description:
                  "ALWAYS use this tool whenever generating or editing code for the codebase.",
                inputSchema: z.object({}),
                execute: async () => "",
              },
            },
            systemPromptOverride: constructSystemPrompt({
              aiRules: await readAiRules(
                resolveAppPathForChat(updatedChat.app.path),
              ),
              chatMode: "build",
              enableTurboEditsV2: false,
            }),
            files: files,
            cloudDisableFiles: true,
          });

          const result = await processStreamChunks({
            fullStream,
            fullResponse,
            abortSignal: ctx.abortSignal,
            chatId: req.chatId,
            processResponseChunkUpdate,
          });
          fullResponse = result.fullResponse;
          chatMessages.push({
            role: "assistant",
            content: fullResponse,
          });
          chatMessages.push({
            role: "user",
            content: "OK.",
          });
        }
      }

      // =========================================================================
      // 16. Main stream processing (build mode default path)
      // =========================================================================
      const { fullStream } = await simpleStreamTextFn({
        chatMessages,
        modelClient,
        files: files,
      });

      try {
        const result = await processStreamChunks({
          fullStream,
          fullResponse,
          abortSignal: ctx.abortSignal,
          chatId: req.chatId,
          processResponseChunkUpdate,
        });
        fullResponse = result.fullResponse;

        // =====================================================================
        // 17. Turbo edits v2 fix loop
        // =====================================================================
        if (
          settings.selectedChatMode !== "ask" &&
          isTurboEditsV2Enabled(settings)
        ) {
          let issues = await dryRunSearchReplace({
            fullResponse,
            appPath: resolveAppPathForChat(updatedChat.app.path),
          });

          ctx.sendTelemetryEvent?.("search_replace:fix", {
            attemptNumber: 0,
            success: issues.length === 0,
            issueCount: issues.length,
            errors: issues.map((i) => ({
              filePath: i.filePath,
              error: i.error,
            })),
          });

          let searchReplaceFixAttempts = 0;
          const originalFullResponse = fullResponse;
          const previousAttempts: ModelMessage[] = [];
          while (
            issues.length > 0 &&
            searchReplaceFixAttempts < 2 &&
            !ctx.abortSignal.aborted
          ) {
            logger.warn(
              `Detected search-replace issues (attempt #${searchReplaceFixAttempts + 1}): ${issues.map((i) => i.error).join(", ")}`,
            );
            const formattedSearchReplaceIssues = issues
              .map(({ filePath, error }) => {
                return `File path: ${filePath}\nError: ${error}`;
              })
              .join("\n\n");

            fullResponse += `<dyad-output type="warning" message="Could not apply Turbo Edits properly for some of the files; re-generating code...">${formattedSearchReplaceIssues}</dyad-output>`;
            await processResponseChunkUpdate({ fullResponse });

            logger.info(
              `Attempting to fix search-replace issues, attempt #${searchReplaceFixAttempts + 1}`,
            );

            const fixSearchReplacePrompt =
              searchReplaceFixAttempts === 0
                ? `There was an issue with the following \`dyad-search-replace\` tags. Make sure you use \`dyad-read\` to read the latest version of the file and then trying to do search & replace again.`
                : `There was an issue with the following \`dyad-search-replace\` tags. Please fix the errors by generating the code changes using \`dyad-write\` tags instead.`;
            searchReplaceFixAttempts++;
            const userPromptMsg = {
              role: "user" as const,
              content: `${fixSearchReplacePrompt}
                
${formattedSearchReplaceIssues}`,
            };

            const { fullStream: fixSearchReplaceStream } =
              await simpleStreamTextFn({
                chatMessages: [
                  ...chatMessages,
                  { role: "assistant", content: originalFullResponse },
                  ...previousAttempts,
                  userPromptMsg,
                ],
                modelClient,
                files: files,
              });
            previousAttempts.push(userPromptMsg);
            const fixResult = await processStreamChunks({
              fullStream: fixSearchReplaceStream,
              fullResponse,
              abortSignal: ctx.abortSignal,
              chatId: req.chatId,
              processResponseChunkUpdate,
            });
            fullResponse = fixResult.fullResponse;
            previousAttempts.push({
              role: "assistant",
              content: removeNonEssentialTags(fixResult.incrementalResponse),
            });

            issues = await dryRunSearchReplace({
              fullResponse: fixResult.incrementalResponse,
              appPath: resolveAppPathForChat(updatedChat.app.path),
            });

            ctx.sendTelemetryEvent?.("search_replace:fix", {
              attemptNumber: searchReplaceFixAttempts,
              success: issues.length === 0,
              issueCount: issues.length,
              errors: issues.map((i) => ({
                filePath: i.filePath,
                error: i.error,
              })),
            });
          }
        }

        // =====================================================================
        // 18. Unclosed XML write continuation loop
        // =====================================================================
        if (
          !ctx.abortSignal.aborted &&
          settings.selectedChatMode !== "ask" &&
          hasUnclosedXmlWrite(fullResponse)
        ) {
          let continuationAttempts = 0;
          while (
            hasUnclosedXmlWrite(fullResponse) &&
            continuationAttempts < 2 &&
            !ctx.abortSignal.aborted
          ) {
            logger.warn(
              `Received unclosed dyad-write tag, attempting to continue, attempt #${continuationAttempts + 1}`,
            );
            continuationAttempts++;

            const { fullStream: contStream } = await simpleStreamTextFn({
              chatMessages: [
                ...chatMessages,
                { role: "assistant", content: fullResponse },
              ],
              modelClient,
              files: files,
            });
            for await (const part of contStream) {
              if (ctx.abortSignal.aborted) {
                logger.log(`Stream for chat ${req.chatId} was aborted`);
                break;
              }
              if (part.type !== "text-delta") continue;
              fullResponse += part.text;
              fullResponse = cleanFullResponse(fullResponse);
              fullResponse = await processResponseChunkUpdate({
                fullResponse,
              });
            }
          }
        }

        // =====================================================================
        // 19. Auto-fix problems loop
        // =====================================================================
        const addDependencies = getXmlAddDependencyTags(fullResponse);
        if (
          !ctx.abortSignal.aborted &&
          addDependencies.length === 0 &&
          settings.enableAutoFixProblems &&
          settings.selectedChatMode !== "ask"
        ) {
          try {
            let problemReport = await generateProblemReport({
              fullResponse,
              appPath: resolveAppPathForChat(updatedChat.app.path),
            });

            let autoFixAttempts = 0;
            const originalFullResponse = fullResponse;
            const previousAttempts: ModelMessage[] = [];
            while (
              problemReport.problems.length > 0 &&
              autoFixAttempts < 2 &&
              !ctx.abortSignal.aborted
            ) {
              fullResponse += `<dyad-problem-report summary="${problemReport.problems.length} problems">
${problemReport.problems
  .map(
    (problem) =>
      `<problem file="${escapeXmlAttr(problem.file)}" line="${problem.line}" column="${problem.column}" code="${problem.code}">${escapeXmlContent(problem.message)}</problem>`,
  )
  .join("\n")}
</dyad-problem-report>`;

              logger.info(
                `Attempting to auto-fix problems, attempt #${autoFixAttempts + 1}`,
              );
              autoFixAttempts++;
              const problemFixPrompt = createProblemFixPrompt(problemReport);

              const virtualFileSystem = new AsyncVirtualFileSystem(
                resolveAppPathForChat(updatedChat.app.path),
                {
                  fileExists: (fileName: string) => fileExists(fileName),
                  readFile: (fileName: string) => readFileWithCache(fileName),
                },
              );
              const writeTags = getXmlWriteTags(fullResponse);
              const renameTags = getXmlRenameTags(fullResponse);
              const deletePaths = getXmlDeleteTags(fullResponse);
              virtualFileSystem.applyResponseChanges({
                deletePaths,
                renameTags,
                writeTags,
              });

              const { formattedOutput: autoFixCodebaseInfo, files } =
                await extractCodebase({
                  appPath,
                  chatContext,
                  virtualFileSystem,
                });
              const { modelClient } = await getModelClient(
                settings.selectedModel,
                settings,
              );

              const { fullStream } = await simpleStreamTextFn({
                modelClient,
                files: files,
                chatMessages: [
                  ...chatMessages.map((msg, index) => {
                    if (
                      index === 0 &&
                      msg.role === "user" &&
                      typeof msg.content === "string" &&
                      msg.content.startsWith(CODEBASE_PROMPT_PREFIX)
                    ) {
                      return {
                        role: "user",
                        content: createCodebasePrompt(autoFixCodebaseInfo),
                      } as const;
                    }
                    return msg;
                  }),
                  {
                    role: "assistant",
                    content: removeNonEssentialTags(originalFullResponse),
                  },
                  ...previousAttempts,
                  { role: "user", content: problemFixPrompt },
                ],
              });
              previousAttempts.push({
                role: "user",
                content: problemFixPrompt,
              });
              const fixResult = await processStreamChunks({
                fullStream,
                fullResponse,
                abortSignal: ctx.abortSignal,
                chatId: req.chatId,
                processResponseChunkUpdate,
              });
              fullResponse = fixResult.fullResponse;
              previousAttempts.push({
                role: "assistant",
                content: removeNonEssentialTags(fixResult.incrementalResponse),
              });

              problemReport = await generateProblemReport({
                fullResponse,
                appPath: resolveAppPathForChat(updatedChat.app.path),
              });
            }
          } catch (error) {
            logger.error(
              "Error generating problem report or auto-fixing:",
              settings.enableAutoFixProblems,
              error,
            );
          }
        }
      } catch (streamError) {
        // =====================================================================
        // 20. Cancellation handling
        // =====================================================================
        if (ctx.abortSignal.aborted) {
          const chatId = req.chatId;
          const partialResponse = partialResponses.get(req.chatId);
          if (partialResponse) {
            try {
              await db
                .update(messages)
                .set({
                  content: `${partialResponse}\n\n[Response cancelled by user]`,
                })
                .where(eq(messages.id, placeholderAssistantMessage.id));

              logger.log(
                `Updated cancelled response for placeholder message ${placeholderAssistantMessage.id} in chat ${chatId}`,
              );
              partialResponses.delete(req.chatId);
            } catch (error) {
              logger.error(
                `Error saving partial response for chat ${chatId}:`,
                error,
              );
            }
          }
          return req.chatId;
        }
        throw streamError;
      }
    }

    // =========================================================================
    // 21. Post-stream processing
    // =========================================================================
    if (!ctx.abortSignal.aborted && fullResponse) {
      const chatTitle = fullResponse.match(
        /<dyad-chat-summary>(.*?)<\/dyad-chat-summary>/,
      );
      if (chatTitle) {
        await db
          .update(chats)
          .set({ title: chatTitle[1] })
          .where(and(eq(chats.id, req.chatId), isNull(chats.title)));
      }
      const chatSummary = chatTitle?.[1];

      await db
        .update(messages)
        .set({ content: fullResponse })
        .where(eq(messages.id, placeholderAssistantMessage.id));

      if (settings.autoApproveChanges && settings.selectedChatMode !== "ask") {
        const status = await processFullResponseActions(
          fullResponse,
          req.chatId,
          {
            chatSummary,
            messageId: placeholderAssistantMessage.id,
          },
        );

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, req.chatId),
          with: {
            messages: {
              orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            },
          },
        });

        ctx.onChunk(req.chatId, chat!.messages);

        if (status.error) {
          ctx.onError(
            req.chatId,
            `Sorry, there was an error applying the AI's changes: ${status.error}`,
          );
        }

        ctx.onEnd(req.chatId, {
          updatedFiles: status.updatedFiles ?? false,
          extraFiles: status.extraFiles,
          extraFilesError: status.extraFilesError,
          chatSummary,
        });
      } else {
        ctx.onEnd(req.chatId, {
          updatedFiles: false,
          chatSummary,
        });
      }
    }

    return req.chatId;
  } catch (error) {
    if (ctx.abortSignal.aborted) {
      logger.log(
        `Ignoring terminal error after cancellation for chat ${req.chatId}`,
      );
      return req.chatId;
    }
    logger.error("Error calling LLM:", error);
    ctx.onError(
      req.chatId,
      `Sorry, there was an error processing your request: ${error}`,
    );
    return "error";
  } finally {
    // =========================================================================
    // 22. Cleanup — schedule temp file deletion
    // =========================================================================
    if (attachmentPaths.length > 0) {
      for (const filePath of attachmentPaths) {
        try {
          setTimeout(
            async () => {
              if (fs.existsSync(filePath)) {
                await unlink(filePath);
                logger.log(`Deleted temporary file: ${filePath}`);
              }
            },
            30 * 60 * 1000,
          );
        } catch (error) {
          logger.error(`Error scheduling file deletion: ${error}`);
        }
      }
    }
  }
}
