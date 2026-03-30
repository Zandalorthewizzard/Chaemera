# 2026-03-30 Legacy Chat Runtime Audit Snapshot 7

Status: working note, non-canonical.

## Purpose

This snapshot turns the first-pass capability classifications into a cleaner residual defect list and a first-pass Codex integration disposition map.

## Residual Defect List

These are the concrete current-branch defects or gaps that still matter after the core transport/runtime fixes.

### 1. Worker environment contract exists but is not the source of truth yet

Evidence:

- `src/ipc/chat_runtime/types.ts:116`
- `src/ipc/chat_runtime/worker_session_manager.ts:36`
- `src-tauri/src/chat_worker_host.rs:595`
- `docs-new/04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md:217`

Observed state:

- `WorkerStartMessage` carries `appPath` and `settingsSnapshot`
- Rust host still sends `app_path: String::new()` and `settings_snapshot: {}`
- worker runtime still re-reads app/settings from internal state instead of consuming the host payload as authoritative input

Interpretation:

- this is not a user-visible break for the currently proven paths
- but it keeps model/settings/app-path behavior partially implicit and weakens host authority

### 2. Terminal stream semantics are still double-fired in the error path

Evidence:

- `src-tauri/src/chat_worker_host.rs:406`
- `src/ipc/contracts/core.ts:305`
- `src/hooks/useStreamChat.ts:191`

Observed state:

- when worker emits `error`, Rust host emits both:
  - `chat:response:error`
  - and then `chat:response:end`
- stream client deletes the stream callback map entry on both event types

Interpretation:

- renderer mostly tolerates this today
- but the contract is semantically wrong because one run can produce two terminal signals
- this should stay in the audit as a real release-line defect, not just “legacy complexity”

### 3. Completion metadata contract is only partially real

Evidence:

- `src/ipc/chat_runtime/run_chat_stream_session.ts:861`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1430`
- `src/ipc/types/chat.ts:104`
- `src/db/schema.ts:96`

Observed state:

- `updatedFiles`, `extraFiles`, `extraFilesError`, and `chatSummary` are real
- `totalTokens` is persisted only as `maxTokensUsed` on the assistant DB row
- `contextWindow` is typed in the response contract but is not populated on the end event

Interpretation:

- metadata support exists, but the public runtime contract overstates what is actually filled

### 4. Cancellation propagation is present, but cancellation outcome coherence is still partial

Evidence:

- `src-tauri/src/chat_worker_host.rs:674`
- `src/ipc/chat_runtime/worker_session_manager.ts:157`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1110`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1352`
- `src/components/chat/HomeChatInput.tsx:128`

Observed state:

- cancel signal does reach the worker and repair loops
- explicit cancelled-response persistence only happens in the thrown stream-error path
- home-composer path does not present the same cancel affordance as the main chat input

Interpretation:

- cancel is no longer “missing,” but it is not clean enough to count as fully proved/coherent

### 5. MCP consent transport exists, but MCP execution is adapter-blocked on the worker path

Evidence:

- `src/ipc/handlers/chat_stream_handlers.ts:29`
- `src/ipc/chat_runtime/types.ts:75`
- `src/ipc/chat_runtime/worker_session_manager.ts:72`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1019`
- `src-tauri/src/chat_worker_host.rs:324`

Observed state:

- consent request and response transport is implemented end-to-end
- Electron adapter provides `getMcpTools`
- worker path does not provide `getMcpTools`
- runtime branch that needs MCP tools is therefore unreachable on the Tauri worker path

Interpretation:

- this is an adapter omission, not a generic chat-stream failure

### 6. Local-agent modes are not “broken chat”; they are dormant or intentionally unavailable on this path

Evidence:

- `src/ipc/handlers/local_agent/local_agent_handler.ts:24`
- `src/ipc/chat_runtime/types.ts:78`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:944`
- `src/ipc/chat_runtime/worker_session_manager.ts:36`

Observed state:

- OSS fallback intentionally says ask/plan/agent is temporarily unavailable in Build mode via Electron path
- worker path does not wire `handleLocalAgentStream` at all
- on Tauri worker path those branches return early without a real local-agent run and without the same explicit fallback UX

Interpretation:

- this should not inflate chat-runtime defect counts
- it belongs in “legacy-only / dormant scaffold / intentionally unavailable” classification

### 7. XML cleanup and repair logic are real but should not be carried into future scope by inertia

Evidence:

- `src/ipc/utils/cleanFullResponse.ts:1`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1085`
- `src/ipc/chat_runtime/run_chat_stream_session.ts:1187`
- `docs-new/07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md:147`

Observed state:

- XML cleanup, continuation, and fix loops are active legacy behaviors
- parser-centric UI inventory already classifies the XML glue as delete-candidate for the Codex/daemon lane

Interpretation:

- still real legacy release-line behavior
- but future architecture should replace the behavior class, not port the XML machinery itself

## First-Pass Disposition Map

### `keep-chaemera-host`

Keep on the Chaemera host/UI side even when runtime truth later moves to Codex core:

- renderer chat shell and stream contract shape as the local host-facing API
- route-driven selected app state and `app-details -> Open in Chat` host behavior
- app import host behavior and app-details landing
- consent UI surfaces and shell notifications
- version/history shell, preview shell, and app selection shell

### `replace-with-codex-core`

These are real runtime responsibilities, but they should not survive as legacy implementation truth in the daemon lane:

- user/assistant persistence semantics
- prompt assembly and model/settings resolution
- codebase extraction and context prep
- attachments and selected context handling
- provider invocation and stream semantics
- completion metadata production
- cancellation outcome semantics
- MCP/tool runtime semantics
- redo semantics as runtime behavior, even if the UX entry stays local

### `legacy-repair-only`

These are worth understanding for release-line stability, but not worth elevating into future architectural commitments:

- worker environment contract incompleteness (`appPath` / `settingsSnapshot` not authoritative yet)
- double-terminal error/end emission on the current Rust host
- partial cancel-state reconciliation on the legacy worker path
- dormant local-agent wiring on the worker path

### `drop`

These should not be migrated as first-class future behaviors:

- XML tag cleanup as a render/runtime contract
- parser-driven remediation affordances that exist only because XML output is fragile
- XML-specific continuation/fix UX as a product surface

## What This Means For Codex Scope

The likely Codex integration scope is now narrower and clearer:

1. Replace the legacy runtime brain, not the whole host shell.
2. Keep Chaemera-owned desktop host concerns and UI surfaces.
3. Do not treat XML repair logic, parser glue, or dormant local-agent scaffolding as future-scope commitments.
4. Treat MCP/tool runtime semantics as future-core work only if the new daemon actually supports those tool classes in mainline.

## Updated Manual Verification List For Final EXE Pass

Keep these for the final user live pass because they are the most expensive or distortion-prone in automation:

1. model/rules/settings visibly changing a real answer
2. text attachment + image attachment + selected component context
3. cancel during an active stream and observe final transcript state
4. redo on a richer conversation with previous edits
5. file-targeted prompt that proves codebase extraction is materially helping
6. native dialog shell behavior including `Import App -> Select Folder`
