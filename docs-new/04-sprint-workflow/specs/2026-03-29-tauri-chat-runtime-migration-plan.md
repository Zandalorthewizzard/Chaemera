---
id: chaemera-spec-tauri-chat-runtime-migration-plan-2026-03-29
title: Tauri Chat Runtime Migration Plan
type: spec
status: active
tags: [spec, tauri, chat, runtime, byok, migration]
related:
  [
    [../spec-template.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-29-non-chat-release-smoke-checklist.md],
    [
      2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md,
    ],
  ]
depends_on:
  [
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-29-non-chat-release-smoke-checklist.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Tauri Chat Runtime Migration Plan

## 1. Start Here

- This document is the canonical migration plan for making packaged Tauri builds execute real chat requests instead of returning the current stub error.
- It is about the current release-line `build-mode chat runtime`, not the future post-release structured-agent or Logos/Codex-derived core.
- The objective is to restore real `BYOK-first` chat execution in packaged Tauri while avoiding a premature full Rust rewrite of the current TypeScript AI runtime.

## 2. Current State

1. The renderer-side contract and stream bridge are already migrated:
   - `chat:stream`
   - `chat:cancel`
   - `chat:response:chunk`
   - `chat:response:end`
   - `chat:response:error`
2. The packaged Tauri runtime still does not execute real chat requests.
3. `wave_c_domains.rs` only supports:
   - canned test responses for `[dyad-qa=...]`,
   - cancellation bookkeeping,
   - agent-tool consent storage,
   - MCP server CRUD and consent storage,
   - and a fallback error for real prompts.
4. The true source of build-mode chat behavior is still the Electron-side TypeScript handler in `src/ipc/handlers/chat_stream_handlers.ts`.
5. That handler currently owns almost all meaningful chat behavior:
   - database writes for user and assistant messages
   - prompt construction
   - attachment handling
   - codebase extraction
   - provider/model invocation
   - XML/tag stream cleanup
   - retry and continuation loops
   - optional auto-approve and action application
   - MCP tool execution and consent requests
6. `chat_count_tokens` and `chat_add_dep` are already migrated separately and should not be re-solved inside the main `chat_stream` plan.

## 3. Problem Statement

1. The current Wave C work migrated the transport surface, not the real chat runtime.
2. A full Rust rewrite of `chat_stream_handlers.ts` is not the right next step:
   - it is too large,
   - too behavior-dense,
   - too coupled to current TypeScript utilities,
   - and strategically mismatched with the already accepted post-release agent direction.
3. At the same time, packaged Tauri cannot ship with a fake `chat:stream` path that always errors for real prompts.
4. The migration therefore needs to restore real chat execution now without turning the current release line into a second AI-architecture rewrite.

## 4. Locked Decisions

1. This migration targets `build-mode chat runtime parity`, not a new agent architecture.
2. `Agent`, `Ask`, and `Plan` remain separate from this slice and should keep their current OSS policy unless explicitly reopened later.
3. The renderer contract in `src/ipc/types/chat.ts` and the main `useStreamChat` behavior should remain stable.
4. `chat_count_tokens` and `chat_add_dep` are already separate migrated surfaces and should be validated, not re-implemented.
5. The first successful Tauri chat migration should prefer a `Rust host + Node/TypeScript runtime worker` design over a full Rust rewrite of the current chat pipeline.

## 5. Recommended Architecture

### 5.1 Target Shape

1. Renderer:
   - unchanged stream contract and hook behavior
2. Rust host:
   - owns Tauri command registration
   - owns stream session lifecycle
   - owns cancellation and process cleanup
   - emits `chat:*` events to the renderer
3. Host-neutral TypeScript chat runtime:
   - owns existing build-mode chat logic extracted from Electron handler code
   - no direct `ipcMain` or Electron event assumptions
4. Node worker:
   - thin CLI/runtime process that executes the extracted TypeScript chat runtime
   - communicates with Rust over structured stdio messages

### 5.2 Why This Is the Right Shape

1. It preserves the current proven TypeScript AI path instead of rewriting the heaviest runtime in Rust under delivery pressure.
2. It matches an already-established Tauri migration pattern in this repository:
   - preview proxy uses a Rust host that spawns a Node runtime asset
   - `check-problems` uses a Rust host that spawns a Node worker runner
3. It avoids sinking release time into a Rust port of logic that is likely to be superseded later by the post-release structured-agent core.
4. It keeps the Tauri host authoritative for lifecycle and desktop integration while allowing the current AI orchestration code to survive long enough to ship.

## 6. Required Refactor Boundary

The current Electron handler must be split into two layers.

### 6.1 Host Adapter Layer

This layer remains host-specific.

Responsibilities:

1. map IPC/Tauri contract inputs to runtime-session inputs
2. stream chunks and terminal events back to the renderer
3. manage cancellation
4. translate consent prompts into host events

### 6.2 Chat Runtime Service Layer

This layer must become host-neutral TypeScript.

Responsibilities:

1. message persistence
2. prompt assembly and settings/model resolution
3. codebase extraction and attachment preparation
4. stream processing and XML cleanup
5. retry/continuation/auto-fix loops
6. optional action application and completion metadata
7. MCP tool execution hooks via abstract host callbacks

The extraction rule is simple:

- if a function fundamentally needs desktop event transport, process lifecycle, or renderer callbacks, it belongs to the host adapter;
- if it fundamentally belongs to AI execution behavior, it belongs to the reusable chat runtime service.

## 7. Protocol Between Rust and the Node Worker

The worker protocol should be structured and event-driven, not ad hoc text parsing.

### 7.1 Rust -> Worker

1. `start`
   - chat id
   - prompt
   - redo flag
   - attachments
   - selected components
   - app/runtime paths
   - settings snapshot if needed
2. `cancel`
   - chat id or worker session id
3. `tool_consent_response`
   - request id
   - decision
4. `mcp_tool_consent_response`
   - request id
   - decision

### 7.2 Worker -> Rust

1. `stream_start`
2. `chunk`
3. `end`
4. `error`
5. `agent_tool_consent_request`
6. `mcp_tool_consent_request`
7. `log`
8. `debug_state` optionally during development

### 7.3 Protocol Requirements

1. JSON lines or another deterministic framed protocol over stdio
2. explicit session ids
3. explicit terminal message types
4. no scraping of arbitrary console output as control messages
5. cancellation must terminate promptly and deterministically

## 8. Scope Split

### 8.1 In Scope for This Migration

1. Real `build` chat execution in packaged Tauri
2. renderer parity for stream events and cancellation
3. current BYOK provider execution through the existing TypeScript path
4. persistence of user and assistant messages
5. XML/tagged response streaming and completion behavior
6. attachments, redo, selected components, and codebase context
7. current auto-approve path where already supported by build mode

### 8.2 Explicitly Out of Scope for This Migration

1. post-release structured-agent core
2. Logos/Codex-style agent daemon
3. reopening local-agent OSS behavior
4. broad Rust port of the current TypeScript chat runtime
5. using this migration as a vehicle for XML architecture redesign

## 9. Phased Plan

### Phase 0. Behavior Freeze and Coverage

Goal:

1. Freeze the expected semantics before extraction.

Tasks:

1. document event and end-state expectations from:
   - `chat.ts`
   - `useStreamChat.ts`
   - current Electron handler
2. add or expand transport/runtime tests around:
   - chunk ordering
   - end/error exclusivity
   - cancel semantics
   - placeholder assistant message lifecycle
3. add a clear manual packaged regression checklist for chat once runtime wiring begins

Exit:

1. there is one agreed target for what "chat parity" means on the current release line

### Phase 1. Extract a Host-Neutral TypeScript Chat Runtime Service

Goal:

1. stop treating `registerChatStreamHandlers()` as the only place where chat can run

Tasks:

1. create a reusable runtime entrypoint such as `runChatStreamSession(...)`
2. move Electron-specific send/cancel concerns behind callbacks or interfaces
3. keep Electron handler as a thin adapter over the new service
4. preserve existing behavior under the Electron path during extraction

Exit:

1. Electron still works
2. real chat logic is callable without `ipcMain`

### Phase 2. Build the Node Worker

Goal:

1. make the extracted TypeScript runtime invokable from Tauri without Electron

Tasks:

1. add a dedicated Node CLI/worker entrypoint
2. package it as a runtime asset, similar to preview proxy and `tsc_worker_runner`
3. implement structured stdio messages for start/chunk/end/error
4. support worker-side cancellation

Exit:

1. the worker can execute a real BYOK chat request outside Electron

### Phase 3. Replace the Tauri Stub with a Rust Session Manager

Goal:

1. make `wave_c_domains.rs::chat_stream` launch and supervise the real worker

Tasks:

1. replace stub-only logic in `wave_c_domains.rs`
2. spawn one worker per active chat stream or another deterministic managed session model
3. forward worker events to `app.emit("chat:*", ...)`
4. wire `chat_cancel` to actual worker cancellation and cleanup
5. keep active session tracking in Rust authoritative

Exit:

1. packaged Tauri no longer returns the current "chat runtime is not migrated yet" error for real prompts

### Phase 4. Recover Full Build-Mode Parity

Goal:

1. restore the current release-line build workflow, not only raw text streaming

Tasks:

1. attachments and selected-components context
2. redo behavior
3. XML cleanup and continuation behavior
4. auto-fix and retry behavior
5. auto-approve/apply-changes path where already enabled in settings
6. chat summary/title updates and persistence

Exit:

1. packaged Tauri build-mode behavior is meaningfully equivalent to the Electron path for in-scope release features

### Phase 5. MCP and Consent Parity

Goal:

1. recover the current optional MCP-assisted build path without collapsing the host boundary

Tasks:

1. allow the worker to request MCP tool consent through Rust-hosted events
2. return consent decisions back to the worker
3. validate that existing MCP server state and consent stores continue to work

Exit:

1. packaged Tauri supports the same current MCP-assisted path that build mode has today, or the remaining delta is explicitly documented and deferred

### Phase 6. Validation and Release Gate

Goal:

1. prove this is real packaged runtime behavior, not only a bridge illusion

Tasks:

1. targeted unit tests for:
   - worker protocol
   - Rust session manager
   - cancel semantics
2. Playwright/Tauri regression coverage for:
   - send prompt
   - stream chunk
   - stream end
   - cancel
   - build-mode completion with file updates
3. manual BYOK validation on packaged Windows build

Exit:

1. real packaged chat is a validated surface, not a best-effort integration

## 10. First Executable Slice Recommendation

Do not begin by trying to port all chat features at once.

The recommended first implementation slice is:

1. extract the host-neutral TypeScript runtime service
2. build the worker protocol
3. replace the Tauri stub with real BYOK text streaming
4. support message persistence plus cancel
5. keep renderer contract unchanged

Only after that slice is green should the work expand into:

1. XML post-processing parity
2. auto-approve/action application
3. MCP consent parity

## 11. Risks

1. Trying to rewrite current chat orchestration in Rust will likely delay delivery and still not align with the future post-release architecture.
2. Leaving the logic inside `chat_stream_handlers.ts` during Tauri work will encourage another compatibility stub instead of a real migration.
3. Allowing worker protocol messages to piggyback on ordinary logs will make cancellation and consent handling unreliable.
4. Pulling local-agent or future structured-agent work into this slice will blur the goal and extend the timeline unnecessarily.

## 12. Success Criteria

1. packaged Tauri can execute a real BYOK build-mode chat request
2. chunk/end/error/cancel semantics match the current renderer contract
3. the current Electron handler is reduced to a thin adapter over reusable runtime code
4. `chat_count_tokens` and `chat_add_dep` continue to work as already-migrated neighboring surfaces
5. the remaining difference between release-line build mode and future post-release agent architecture stays explicit

## Evidence

- path: `src/ipc/types/chat.ts`
  symbol: `chatContracts and chatStreamContract define the stable renderer contract`
  lines: 143-242
- path: `src/hooks/useStreamChat.ts`
  symbol: `Renderer expects stable chunk/end/error and cancellation semantics`
  lines: 78-277
- path: `src/ipc/runtime/core_domain_channels.ts`
  symbol: `Tauri already maps chat stream, cancel, count tokens, and add dependency commands`
  lines: 63-66
- path: `src-tauri/src/wave_c_domains.rs`
  symbol: `Current Tauri chat runtime only supports canned tests and emits a stub error for real prompts`
  lines: 146-285
- path: `src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `Electron-side handler still owns the real build-mode chat runtime`
  lines: 1-260, 300-520, 1200-1600
- path: `src-tauri/src/wave_f_domains.rs`
  symbol: `Tauri already uses Rust host plus Node runtime assets for preview proxy and tsc problem check`
  lines: 307-358, 595-614, 662-739
- path: `src-tauri/src/wave_w_domains.rs`
  symbol: `chat_count_tokens already lives in a dedicated migrated Tauri domain`
  lines: 87-90, 608-613
- path: `src-tauri/src/wave_ai_domains.rs`
  symbol: `chat_add_dep already lives in a dedicated migrated Tauri domain`
  lines: 69-77, 119-150
- path: `docs-new/04-sprint-workflow/sprints/sprint-5-tauri-wave-c-chat-and-agent.md`
  symbol: `Wave C delivered transport bridge, not a full native AI runtime replacement`
  lines: 38-51
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  symbol: `Release roadmap still treats build/chat path as a ship validation surface`
  lines: 145-146, 232-239

## Links

- [[../spec-template.md]]
- [[2026-03-28-prod-mvp-release-roadmap.md]]
- [[2026-03-29-non-chat-release-smoke-checklist.md]]
- [[2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md]]
