# T2 Completion Spec — Extract Host-Neutral Chat Runtime

## Current State

### Done

- [x] `src/ipc/chat_runtime/types.ts` (172 lines) — ChatRuntimeContext + WorkerProtocol types
- [x] `src/ipc/chat_runtime/index.ts` (20 lines) — barrel re-export
- [x] `src/ipc/chat_runtime/helpers.ts` (~230 lines) — pure utilities, no Electron deps

### TODO

- [ ] `src/ipc/chat_runtime/run_chat_stream_session.ts` — rewrite skeleton with real logic
- [ ] Update `index.ts` barrel to export new modules
- [ ] `npm run ts` passes
- [ ] No existing files modified (T4 will modify chat_stream_handlers.ts later)

---

## File: run_chat_stream_session.ts — Detailed Spec

### Signature

```typescript
export async function runChatStreamSession(
  ctx: ChatRuntimeContext,
): Promise<number | "error">;
```

### What it replaces

Lines 222-1627 of `src/ipc/handlers/chat_stream_handlers.ts` — the entire `ipcMain.handle("chat:stream", ...)` callback body.

### Mapping: Electron → Runtime Context

| Original (Electron)                                  | Extracted (Runtime)                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `safeSend(event.sender, "chat:stream:start", ...)`   | `ctx.onStreamStart(chatId)`                                         |
| `safeSend(event.sender, "chat:response:chunk", ...)` | `ctx.onChunk(chatId, messages)`                                     |
| `safeSend(event.sender, "chat:response:end", ...)`   | `ctx.onEnd(chatId, data)`                                           |
| `safeSend(event.sender, "chat:response:error", ...)` | `ctx.onError(chatId, error)`                                        |
| `event.sender.send("chat:response:error", ...)`      | `ctx.onError(chatId, error)`                                        |
| `abortController = new AbortController()`            | `ctx.abortSignal` (provided externally)                             |
| `abortController.signal.aborted`                     | `ctx.abortSignal.aborted` or `ctx.isCancelled()`                    |
| `activeStreams.set/delete`                           | caller manages (not runtime's job)                                  |
| `partialResponses.set/get/delete`                    | local Map inside function                                           |
| `requireMcpToolConsent(event, ...)`                  | `ctx.requestMcpToolConsent(...)`                                    |
| `handleLocalAgentStream(event, ...)`                 | `ctx.handleLocalAgent?.(...)` — or skip for Phase 1, caller handles |
| `sendTelemetryEvent(event.sender, ...)`              | `ctx.recordLog("info", ...)` — or skip telemetry for Phase 1        |

### Sections to implement (in order)

1. **Setup** — get chat from DB, handle redo, process attachments
2. **User message** — insert into DB with attachment info, prompt references, component snippets
3. **Placeholder assistant message** — insert empty, fetch updated chat
4. **Initial chunk** — ctx.onChunk with placeholder
5. **Test response check** — if test prompt, handle and return
6. **Model client setup** — getModelClient, extract codebase, smart context
7. **System prompt construction** — aiRules, theme, supabase, chat mode, security review, summarize
8. **Message history preparation** — limit turns, codebase prefix, other apps prefix, attachments
9. **simpleStreamText closure** — wraps streamText() with model, tools, abortSignal
10. **processResponseChunkUpdate** — save partial to DB, ctx.onChunk
11. **Mode dispatch** — ask/plan/local-agent → delegate; MCP tools path
12. **Main stream** — simpleStreamText → processStreamChunks
13. **Turbo edits v2 fix loop** — dryRunSearchReplace, retry up to 2 times
14. **Unclosed XML continuation loop** — retry up to 2 times
15. **Auto-fix problems loop** — generateProblemReport, retry up to 2 times
16. **Post-stream** — chat summary, auto-approve, processFullResponseActions
17. **Error handling** — catch, cancellation save partial, cleanup
18. **Finally** — cleanup temp files (attachment paths)

### Key imports needed (all host-neutral)

```
ai: streamText, ModelMessage, ToolSet, TextStreamPart, stepCountIs, hasToolCall
../../db: db
../../db/schema: chats, messages
drizzle-orm: eq, and, isNull, inArray
../../main/settings: readSettings
../../prompts/system_prompt: constructSystemPrompt, readAiRules
../../prompts/supabase_prompt: getSupabaseAvailableSystemPrompt, SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT
../../paths/paths: getAppPath
../../utils/codebase: extractCodebase, readFileWithCache, CodebaseFile
../processors/response_processor: dryRunSearchReplace, processFullResponseActions
../utils/get_model_client: getModelClient, ModelClient
../utils/token_utils: getMaxTokens, getTemperature
../utils/provider_options: getProviderOptions, getAiHeaders
../utils/context_paths_utils: validateChatContext
../utils/telemetry: sendTelemetryEvent (NOTE: takes event.sender — needs adapter)
../utils/mcp_consent: requireMcpToolConsent (NOTE: takes event — needs adapter)
../utils/file_utils: fileExists
../utils/file_uploads_state: FileUploadsState
../utils/mention_apps: extractMentionedAppsCodebases
@/shared/parse_mention_apps: parseAppMentions
../utils/xml_tag_parser: getXmlWriteTags, getXmlRenameTags, getXmlDeleteTags, getXmlAddDependencyTags
../utils/git_utils: getCurrentCommitHash
../utils/versioned_codebase_context: processChatMessagesWithVersionedFiles, VersionedFiles
../utils/ai_messages_utils: getAiMessagesJsonIfWithinLimit
../utils/replacePromptReference: replacePromptReference
./planUtils: parsePlanFile, validatePlanId (NOTE: currently in handlers/ — may need to keep import from there)
../../supabase_admin/supabase_context: getSupabaseContext, getSupabaseClientCode
../../prompts/summarize_chat_system_prompt: SUMMARIZE_CHAT_SYSTEM_PROMPT
../../prompts/security_review_prompt: SECURITY_REVIEW_SYSTEM_PROMPT
../processors/tsc: generateProblemReport
@/shared/problem_prompt: createProblemFixPrompt
../../../shared/VirtualFilesystem: AsyncVirtualFileSystem
../../../shared/xmlEscape: escapeXmlAttr, escapeXmlContent
@/lib/schemas: isSupabaseConnected, isTurboEditsV2Enabled, SmartContextMode
@/shared/texts: AI_STREAMING_ERROR_MESSAGE_PREFIX
@/constants/settings_constants: MAX_CHAT_TURNS_IN_CONTEXT
```

### Problematic imports (Electron-coupled) — need special handling

| Import                                   | Issue                  | Solution for Phase 1                           |
| ---------------------------------------- | ---------------------- | ---------------------------------------------- |
| `handleLocalAgentStream`                 | Takes `event` directly | Accept as optional ctx callback                |
| `sendTelemetryEvent`                     | Takes `event.sender`   | Accept as optional ctx callback                |
| `requireMcpToolConsent`                  | Takes `event`          | Use `ctx.requestMcpToolConsent`                |
| `getTestResponse` / `streamTestResponse` | Takes `event`          | Accept as optional ctx callback or keep import |
| `mcpManager` / `getMcpTools`             | Takes `event`          | Accept as optional ctx callback                |

### Design decision: ChatRuntimeContext extensions

For Phase 1, add optional callbacks to ChatRuntimeContext for Electron-specific paths:

```typescript
// Add to ChatRuntimeContext in types.ts:
handleLocalAgentStream?: (params: LocalAgentParams) => Promise<boolean>;
sendTelemetryEvent?: (eventName: string, data: Record<string, unknown>) => void;
getTestResponse?: (prompt: string) => string | null;
streamTestResponse?: (params: StreamTestParams) => Promise<string>;
getMcpTools?: () => Promise<ToolSet>;
```

This way the Electron adapter provides these, Tauri adapter won't (yet).

---

## Execution Plan

1. Update `types.ts` — add optional Electron-only callbacks to ChatRuntimeContext
2. Rewrite `run_chat_stream_session.ts` — full implementation
3. Update `index.ts` — export new modules from helpers.ts
4. Run `npm run ts` — verify zero errors
5. Review line by line
