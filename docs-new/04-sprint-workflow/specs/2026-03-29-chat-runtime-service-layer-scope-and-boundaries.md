---
id: chaemera-spec-chat-runtime-service-layer-scope-and-boundaries-2026-03-29
title: Chat Runtime Service Layer Scope and Boundaries
type: spec
status: active
tags: [spec, chat, runtime, tauri, scope, boundary, code-audit]
related:
  [
    [../spec-template.md],
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md],
    [
      ../../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md],
  ]
generated: false
source_of_truth: code-audit
outline: []
---

# Chat Runtime Service Layer Scope and Boundaries

1. Start Here

- This document is the canonical scope inventory for the release-line `chat runtime service layer`.
- It exists to answer a practical question: what real functionality is hidden behind `runChatStreamSession(...)` and its immediate host/worker shell.
- It is not a future agent-core spec.
- It is a code-audit artifact for the current build-mode runtime migration line.

2. Executive Summary

- Yes, this layer is much broader than "stream tokens from a provider".
- It contains most of the current release-line AI behavior.
- That includes:
  - message persistence,
  - prompt assembly,
  - attachment and codebase preparation,
  - provider invocation,
  - XML cleanup and repair loops,
  - optional local-agent and MCP hooks,
  - completion metadata,
  - and the transport shell needed to execute all of that under Tauri.

3. Core Runtime Responsibilities Inside `runChatStreamSession(...)`

3.1. Message persistence and placeholder lifecycle

This layer:

1. writes the user message to the database,
2. creates and persists the placeholder assistant message,
3. updates the placeholder progressively during stream chunks,
4. finalizes assistant content on end or error.

3.2. Redo semantics

This layer:

1. handles the `redo` option,
2. removes or reuses message state as needed before continuing a new run,
3. preserves the current chat-level build-mode semantics for retrying the same user intent.

3.3. Attachment processing

This layer:

1. processes `ChatAttachment` inputs,
2. materializes temp files for uploaded content,
3. distinguishes text and image handling,
4. prepares those attachments for downstream prompt construction.

3.4. Codebase and component context

This layer:

1. resolves selected components,
2. collects context paths,
3. extracts codebase context for the current app,
4. builds prompt-side codebase payloads from repository files.

3.5. Prompt assembly and model/settings resolution

This layer:

1. resolves the current settings and selected model,
2. builds the system prompt and message set,
3. applies build-mode prompt rules,
4. prepares the request that actually goes to the provider runtime.

3.6. Provider invocation and test-response path

This layer:

1. executes the normal BYOK provider path,
2. supports canned test-response behavior through `getTestResponse` and `streamTestResponse`,
3. handles normal chunk accumulation and full-response tracking.

3.7. Streaming and interim chunk updates

This layer:

1. receives provider stream chunks,
2. updates assistant message content incrementally,
3. emits chunk snapshots back through the host callbacks,
4. maintains stream-local response state until termination.

3.8. XML cleanup and repair loops

This layer:

1. handles tagged build-mode output,
2. runs search-replace repair logic,
3. runs unclosed XML write continuation logic,
4. removes non-essential or problem-report tags,
5. normalizes final assistant-visible content.

3.9. Auto-fix and continuation behavior

This layer:

1. can trigger auto-fix loops after generation,
2. can build additional context for repair attempts,
3. can retry or continue generation when the build-mode output is structurally incomplete.

3.10. Local-agent and MCP hook points

This layer:

1. can delegate into local-agent stream handling when the host provides that callback,
2. can request MCP tool inventory through a host callback,
3. can request user consent for agent or MCP tools through abstract callbacks.

3.11. Final completion metadata

This layer:

1. determines `updatedFiles`,
2. carries `extraFiles` and `extraFilesError`,
3. records `totalTokens` and `contextWindow` when available,
4. updates `chatSummary`,
5. emits final `onEnd` or `onError` state.

3.12. Cancellation-aware behavior

This layer:

1. checks `AbortSignal`,
2. stops continuation and repair loops when cancellation is active,
3. avoids further updates once cancellation is observed.

4. Adjacent Responsibilities In The Same Release Slice

4.1. Electron adapter

`src/ipc/handlers/chat_stream_handlers.ts` is now responsible for:

1. IPC registration,
2. Electron `event.sender` bridging,
3. MCP tool wiring for the Electron path,
4. cancel registration and end-event cleanup for the Electron path.

It is no longer the true AI runtime brain.

4.2. Worker protocol and worker session layer

`src/ipc/chat_runtime/types.ts`, `worker_stdio.ts`, and `worker_session_manager.ts` now own:

1. typed worker inbound messages,
2. typed worker outbound messages,
3. JSON-line framing helpers,
4. per-chat worker session tracking,
5. cancel handling,
6. consent promise bookkeeping.

4.3. Node worker execution shell

`workers/chat/chat_worker.ts` and `worker/chat_worker_runner.js` now own:

1. worker bootstrap,
2. database initialization in the worker process,
3. invocation of the extracted runtime,
4. stdio-to-worker_threads bridging for Tauri host use.

4.4. Rust/Tauri host shell

`src-tauri/src/chat_worker_host.rs` now owns:

1. Tauri command entrypoints for chat start and cancel,
2. spawning the Node runner,
3. session supervision,
4. translating worker messages into renderer `chat:*` events,
5. routing tool-consent responses back to the worker.

4.5. Packaging and build wiring

`vite.chat-worker.config.mts`, `package.json`, and `src-tauri/tauri.conf.json` now own:

1. the chat worker bundle build,
2. pre-runtime build hooks,
3. resource packaging into the Tauri app.

4. What Is Outside This Layer

The following should not be conflated with the chat runtime service layer:

1. Renderer-side UX contract in `src/ipc/types/chat.ts` and `src/hooks/useStreamChat.ts`.
2. The separate `chat_count_tokens` migrated domain.
3. The separate `chat_add_dep` migrated domain.
4. Post-release structured-agent architecture.
5. Neon/Supabase OAuth, release packaging policy, or other unrelated release work.

6. Current Boundary Mismatches That Matter

7. Explicit runtime environment injection is incomplete.

- `WorkerStartMessage` carries `appPath` and `settingsSnapshot`.
- But the worker-side runtime still relies on internal settings/app-state access instead of consuming those values as the canonical source.

2. The Rust host currently does not populate the new environment fields meaningfully.

- `chat_worker_host.rs` sends `appPath: ""` and `settingsSnapshot: {}`.
- That means the contract exists but is not yet the real runtime truth boundary.

3. The worker runner and framing helpers are only partially unified.

- `worker_stdio.ts` defines framing helpers.
- The plain JS runner still does raw `JSON.parse` and `JSON.stringify` directly.

4. Real runtime proof still needs to prefer the real Tauri harness.

- The fake smoke lane is useful for cheap UI regression.
- The authoritative proof path for this layer is the Tauri desktop runtime harness.

7. Guidance For Future Tasks

If the change is about:

1. AI execution behavior, prompt assembly, XML repair, attachments, or completion semantics:
   - it belongs in `src/ipc/chat_runtime/`.
2. Electron registration or Electron-only MCP/local-agent adaptation:
   - it belongs in `src/ipc/handlers/chat_stream_handlers.ts`.
3. Worker session bookkeeping or stdio protocol:
   - it belongs in `src/ipc/chat_runtime/worker_*` and `workers/chat/*`.
4. Tauri process supervision, consent routing, or renderer event emission:
   - it belongs in `src-tauri/src/chat_worker_host.rs` or its eventual equivalent host module.
5. Renderer UX or stream lifecycle in the chat UI:
   - it belongs in `src/hooks/useStreamChat.ts` or renderer components, not in the runtime layer.

6. Answer To The Practical Scope Question

Yes, there is more in scope than the short list of:

1. message persistence,
2. prompt assembly and model resolution,
3. codebase extraction and attachments,
4. stream handling and XML cleanup.

The same slice also includes:

1. placeholder assistant lifecycle,
2. redo behavior,
3. selected-component context,
4. test-response path,
5. XML repair and continuation loops,
6. auto-fix loops,
7. local-agent and MCP hook points,
8. consent transport,
9. completion metadata,
10. host session management,
11. worker protocol,
12. worker packaging and runtime supervision.

## Evidence

- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Core runtime responsibilities: redo, attachments, prompt/model path, stream handling, repair loops, auto-fix, end/error semantics`
  lines: 181-1448
- path: `../../src/ipc/chat_runtime/types.ts`
  symbol: `Host-neutral runtime context and worker protocol types`
  lines: 1-188
- path: `../../src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `Electron adapter responsibilities after extraction`
  lines: 1-179
- path: `../../src/ipc/chat_runtime/worker_session_manager.ts`
  symbol: `Worker-side session tracking, cancel handling, consent bookkeeping, and TODO about explicit runtime env`
  lines: 1-173
- path: `../../src/ipc/chat_runtime/worker_stdio.ts`
  symbol: `Worker framing helpers`
  lines: 1-30
- path: `../../workers/chat/chat_worker.ts`
  symbol: `Worker bootstrap, database init, and runtime invocation`
  lines: 1-63
- path: `../../worker/chat_worker_runner.js`
  symbol: `Plain JS stdio bridge and worker_threads runner`
  lines: 1-62
- path: `../../src-tauri/src/chat_worker_host.rs`
  symbol: `Rust/Tauri host session manager, event emission, consent routing, and currently empty appPath/settingsSnapshot payload`
  lines: 1-389
- path: `../../src-tauri/src/lib.rs`
  symbol: `Tauri command registration through chat_worker_host`
  lines: 1-193
- path: `../../vite.chat-worker.config.mts`
  symbol: `Dedicated worker build output`
  lines: 1-18
- path: `../../src-tauri/tauri.conf.json`
  symbol: `Tauri resources include chat worker runner and bundle`
  lines: 1-38
- path: `../../package.json`
  symbol: `Build and Tauri runtime scripts include chat worker bundle and runtime lane`
  lines: 1-74
- path: `../../testing/tauri-webdriver/wdio.conf.mjs`
  symbol: `Real Tauri desktop runtime harness`
  lines: 1-206

## Links

- [[../spec-template.md]]
- [[2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md]]
- [[../../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md]]
