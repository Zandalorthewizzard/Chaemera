# 2026-03-30 Legacy Chat Runtime Audit Final Pass

Status: working note, non-canonical.

## Goal

Finish the first full audit pass for the legacy release-line chat runtime under the current Tauri worker/host architecture so the Codex integration scope can be defined from concrete evidence instead of assumptions.

## Audit Verdict

The current branch is no longer dominated by transport-collapse failures.

The main Tauri cutover defects that originally blocked the real chat path were repaired:

- worker stdout protocol contamination
- Rust/worker field casing mismatch
- sqlite path divergence between Rust host and TypeScript worker
- invalid `chat:response:end` null payload shape
- `app-details` selected-app route state mismatch
- runtime harness apps-dir env mismatch

After those fixes, the legacy runtime is best described as:

- real and live on the core build-mode path,
- partially healthy,
- but still carrying adapter gaps, legacy XML debt, and a few real semantic defects.

It is not accurate anymore to describe the current branch as “chat runtime broken because of the Electron -> Tauri cutover.”

It is more accurate to say:

- the Tauri cutover initially exposed several real host/transport defects,
- those core defects are now mostly resolved,
- and the remaining problems are narrower runtime semantics or worker-adapter completeness gaps.

## Filled First-Pass Matrix

| Capability                            | Acceptance                                                                                                      | Legacy Evidence                                                                                                                                                                                                                                                   | Old EXE Baseline | Current Branch          | Failure Location | Proof Method               | Observed Symptom                                                                                            | Codex Lane Disposition    | Next Action                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------- | ---------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| `Packaged Tauri entrypoint`           | From packaged/debug Tauri, enter the real runtime path instead of immediate transport failure                   | `notes/2026-03-30-legacy-chat-runtime-audit-snapshot-1.md:7`, `testing/tauri-webdriver/specs/boot.e2e.mjs`                                                                                                                                                        | `works`          | `works`                 | none             | `existing-test`, `new-e2e` | Desktop harness boots and reaches real app shell                                                            | `legacy-only`             | none                                                       |
| `User and assistant persistence`      | User message, placeholder assistant, chunk persistence, and final transcript state stay coherent                | `src/ipc/chat_runtime/run_chat_stream_session.ts:384`, `src/ipc/chat_runtime/run_chat_stream_session.ts:398`, `src/ipc/chat_runtime/run_chat_stream_session.ts:914`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1384`                                       | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`, `new-e2e`    | success path is live, but cancel reconciliation is not fully coherent                                       | `replace-with-codex-core` | manual EXE cancel verification                             |
| `Redo semantics`                      | Retrying removes/reuses the right prior pair and does not silently duplicate transcript state                   | `src/components/chat/MessagesList.tsx:181`, `src/ipc/chat_runtime/run_chat_stream_session.ts:213`                                                                                                                                                                 | `unknown`        | `works`                 | `runtime-logic`  | `code-audit`               | runtime deletes last user plus following assistant before restream                                          | `replace-with-codex-core` | manual EXE validation on richer chat history               |
| `Prompt, settings, and model resolve` | Selected model/settings/rules materially affect request construction                                            | `src/ipc/chat_runtime/run_chat_stream_session.ts:397`, `src/ipc/chat_runtime/run_chat_stream_session.ts:454`, `src/ipc/chat_runtime/run_chat_stream_session.ts:539`, `src/ipc/chat_runtime/worker_session_manager.ts:36`, `src-tauri/src/chat_worker_host.rs:595` | `unknown`        | `partial`               | `node-transport` | `code-audit`, `new-e2e`    | worker contract carries env fields but host/worker do not treat them as authoritative yet                   | `replace-with-codex-core` | manual EXE sensitivity pass for model/rules/settings       |
| `Codebase extraction`                 | Repository context reaches the runtime prompt path for targeted queries                                         | `src/ipc/chat_runtime/run_chat_stream_session.ts:470`, `src/utils/codebase.ts:432`                                                                                                                                                                                | `unknown`        | `works`                 | `runtime-logic`  | `code-audit`               | codebase extraction still runs on the worker path                                                           | `replace-with-codex-core` | manual EXE targeted-query proof                            |
| `Attachments and selected context`    | Text/image attachments and selected component snippets survive request preparation                              | `src/hooks/useStreamChat.ts:166`, `src/ipc/chat_runtime/run_chat_stream_session.ts:242`, `src/ipc/chat_runtime/run_chat_stream_session.ts:343`                                                                                                                    | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`               | prep path is real, but not fully live-proven on final desktop lane                                          | `replace-with-codex-core` | manual EXE text/image/component pass                       |
| `Provider invocation and streaming`   | Real or fixture-backed provider path streams ordered chunks and one terminal outcome                            | `src/ipc/chat_runtime/run_chat_stream_session.ts:802`, `testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`, `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`                                                                                   | `unknown`        | `partial`               | `worker-adapter` | `new-e2e`, `code-audit`    | build-mode stream is live, but non-build branches depend on unwired worker hooks                            | `replace-with-codex-core` | keep build-mode as proven; classify other modes separately |
| `End and error semantics`             | Never both terminal success and terminal error for one run                                                      | `src/ipc/chat_runtime/run_chat_stream_session.ts:882`, `src/hooks/useStreamChat.ts:191`, `src-tauri/src/chat_worker_host.rs:406`                                                                                                                                  | `unknown`        | `partial`               | `tauri-host`     | `code-audit`, `new-e2e`    | Rust host still emits both `error` and `end` after worker error                                             | `replace-with-codex-core` | keep as real residual defect                               |
| `XML cleanup`                         | Assistant-visible content is not polluted by raw internal tags beyond accepted legacy behavior                  | `src/ipc/utils/cleanFullResponse.ts:1`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1085`, `src/components/chat/ActionMarkdownParser.tsx:624`                                                                                                                | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`, `new-e2e`    | cleanup exists, but XML remains core to legacy render/runtime flow                                          | `drop`                    | preserve only as release-line debt, not future scope       |
| `Repair, continuation, and auto-fix`  | Broken generation can continue/repair/autofix with coherent termination                                         | `src/ipc/chat_runtime/run_chat_stream_session.ts:1085`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1187`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1229`                                                                                            | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`               | loops are real, but not fully live-proven in current Tauri runtime lane                                     | `replace-with-codex-core` | leave to manual EXE if time permits                        |
| `Completion metadata`                 | `updatedFiles`, `extraFiles`, `extraFilesError`, `totalTokens`, `contextWindow`, and `chatSummary` are coherent | `src/ipc/chat_runtime/run_chat_stream_session.ts:861`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1430`, `src/ipc/types/chat.ts:104`                                                                                                                        | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`, `new-e2e`    | `updatedFiles`/`extraFiles`/`chatSummary` are real; `totalTokens` and `contextWindow` are incomplete        | `replace-with-codex-core` | keep as metadata gap                                       |
| `Cancellation-aware behavior`         | Cancel during stream/repair stops forward progress and preserves coherent persisted state                       | `src-tauri/src/chat_worker_host.rs:674`, `src/ipc/chat_runtime/worker_session_manager.ts:157`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1352`                                                                                                             | `unknown`        | `partial`               | `runtime-logic`  | `code-audit`               | abort propagates, but final persisted cancellation state is not fully coherent                              | `replace-with-codex-core` | manual EXE cancel pass                                     |
| `MCP consent and tool hooks`          | Consent request reaches UI, user response returns, downstream tool path resolves                                | `src/ipc/chat_runtime/worker_session_manager.ts:72`, `src-tauri/src/chat_worker_host.rs:324`, `src/ipc/handlers/chat_stream_handlers.ts:29`, `src/ipc/chat_runtime/run_chat_stream_session.ts:1019`                                                               | `unknown`        | `partial`               | `worker-adapter` | `code-audit`               | consent transport exists, but worker path does not provide `getMcpTools` so execution branch is unreachable | `replace-with-codex-core` | record as adapter omission                                 |
| `Local-agent hook points`             | Classify as live, dormant, or intentionally unavailable instead of mixing with chat-stream failure              | `src/ipc/handlers/local_agent/local_agent_handler.ts:24`, `src/ipc/chat_runtime/types.ts:78`, `src/ipc/chat_runtime/run_chat_stream_session.ts:944`                                                                                                               | `unknown`        | `by-design-unavailable` | `worker-adapter` | `code-audit`               | OSS fallback is explicitly unavailable, and worker path leaves these branches dormant/unwired               | `legacy-repair-only`      | keep out of generic chat defect counts                     |

## Confirmed Live-Proven Current-Branch Paths

These are the important things the current branch now proves in the real Tauri runtime lane.

### 1. Home composer build-mode path

Proved via:

- `testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`

What is live-proven:

- create app
- route to chat
- start worker session
- persist prompt
- stream assistant output
- receive valid end event
- show copy affordance

### 2. Direct `app-details` entry path

Proved via:

- `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`

What is live-proven:

- direct `/app-details?appId=...` route entry
- selected app restoration from route
- `Open in Chat`
- real worker-backed stream completion on that path

### 3. Import core path with existing `AI_RULES.md`

Proved via:

- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`

What is live-proven:

- `import-app` runtime core path
- landing on imported app details
- imported files in isolated profile path
- no AI rules autogeneration prompt when `AI_RULES.md` already exists

### 4. Copy-message path after import

Proved via:

- `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`

What is live-proven:

- imported app can open into chat
- canned write response completes
- copied output omits raw dyad tags and preserves intended visible text

## What Was Reclassified As Not Core Runtime Failure

### 1. `Import App -> Select Folder` in Tauri WebDriver

Current classification:

- host-shell / WebDriver dialog automation seam
- not evidence that `import-app` runtime core is broken
- not evidence that chat stream core is broken

### 2. Old `/chat` waits after import

Current classification:

- stale harness expectation
- imported app landing route moved to `/app-details`

### 3. Local-agent mode on current worker path

Current classification:

- dormant / intentionally unavailable path
- not a generic `chat:stream` transport failure

## Codex Scope Recommendation

### Replace with Codex core

The future daemon/core line should replace these runtime responsibilities rather than inherit the legacy implementation:

- transcript persistence semantics
- prompt assembly and model/settings resolution
- codebase/context preparation
- attachment preparation semantics
- provider stream semantics
- completion metadata production
- cancellation semantics
- redo runtime semantics
- MCP/tool execution semantics if kept at all

### Keep in Chaemera host/UI

Keep these as Chaemera-owned host concerns around whatever future daemon provides:

- desktop shell and routing
- app selection, `app-details`, and `Open in Chat`
- import host behavior and app landing behavior
- consent UI surfaces
- transcript shell, input shell, version shell, preview shell

### Legacy-repair-only

These are worth fixing only for release-line stability, not as future-scope investments:

- non-authoritative worker env contract
- Rust host double-terminal behavior on error
- partial cancel-state reconciliation
- dormant worker-path local-agent wiring

### Drop from future scope

- XML parser/cleanup as a primary runtime contract
- XML-specific remediation affordances
- XML repair/continuation UX as first-class future behavior

## Residual Unknowns

These are not blocked enough to stop the audit, but they still benefit from a final live human pass on a fresh `.exe`.

- visible model/rules/settings sensitivity on a real answer
- text attachment + image attachment + selected component in one session
- cancel during active stream and final transcript outcome
- redo on a richer, already-mutated transcript
- file-targeted question proving codebase extraction materially helped
- native dialog shell behavior, especially `Import App -> Select Folder`

## Final Interpretation For The Migration Story

The honest summary of the current Tauri legacy chat runtime is now:

1. The extracted TypeScript runtime brain is real.
2. The Rust host plus Node worker bridge is real.
3. The main build-mode path is live and usable again after several concrete Tauri cutover fixes.
4. The remaining defects are narrower semantic or adapter-completeness issues.
5. The system is viable as a release-line bridge.
6. It is still not the right foundation for the future daemon/core architecture.

That means the audit supports a narrower and cleaner Codex integration story:

- keep Chaemera as host and UI,
- replace the legacy runtime brain with structured daemon truth,
- and do not let XML-era glue or release-line worker gaps expand future scope by inertia.
