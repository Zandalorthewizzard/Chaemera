---
id: chaemera-spec-tauri-chat-runtime-phase-1-foundation-2026-03-29
title: Tauri Chat Runtime Phase 1 Foundation Spec
type: spec
status: historical
tags: [spec, tauri, chat, phase-1, runtime, extraction]
related:
  [
    [../spec-template.md],
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-29-non-chat-release-smoke-checklist.md],
  ]
depends_on:
  [
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Tauri Chat Runtime Phase 1 Foundation Spec

## 1. Start Here

- Historical notice:
  - this document records the first executable extraction slice for the Tauri chat-runtime migration;
  - keep it as implementation history for the completed extraction phase, not as the current control document;
  - the current controlling documents are the 2026-03-30 audit conclusions and legacy XML hardening plan together with the broader migration plan.
- This spec defines the first executable implementation slice for restoring real packaged Tauri chat execution.
- It is narrower than the full migration plan.
- It exists to prevent Phase 1 from silently expanding into XML parity, MCP parity, or a full Rust rewrite.

## 2. Objective

Phase 1 must do exactly this:

1. extract the current build-mode chat runtime out of the Electron-only handler shape
2. preserve current Electron behavior while doing that extraction
3. define the reusable runtime boundary that a future Tauri Node worker will call
4. lock the worker protocol types before the Rust/Tauri session-manager phase starts

Phase 1 must not attempt to finish packaged Tauri chat by itself.

## 3. Non-Goals

1. no full `wave_c_domains.rs` rewrite yet
2. no Rust implementation of current AI orchestration logic
3. no MCP runtime parity
4. no reopening local-agent OSS behavior
5. no redesign of XML/build-mode architecture
6. no broad prompt or product-policy rewrite unrelated to the runtime boundary

## 4. Required Output

At the end of Phase 1, the repository must have:

1. a host-neutral TypeScript chat runtime entrypoint
2. an explicit runtime callback/context interface instead of direct Electron assumptions
3. an Electron adapter that delegates to the extracted runtime
4. a typed worker-protocol definition for later Tauri use
5. tests that prove the extraction did not regress the current Electron-side build-mode semantics for the covered slice

## 5. Target Code Shape

### 5.1 New or Restructured TypeScript Runtime Layer

Expected new area:

- `src/ipc/chat_runtime/`

Expected responsibilities:

1. `run_chat_stream_session`
   - orchestrates a single build-mode chat stream
2. runtime context types
   - send chunk
   - send end
   - send error
   - persist messages
   - request consent
   - check cancellation
3. stream processing helpers
4. worker protocol types

The exact file names may vary, but the boundary must be visible and coherent.

### 5.2 Existing Electron Handler After Phase 1

`src/ipc/handlers/chat_stream_handlers.ts` should remain as:

1. IPC registration
2. Electron-specific event sender plumbing
3. adapter glue into the reusable runtime
4. cancel registration and bridge cleanup

It should no longer be the only place where the build-mode chat runtime can exist.

## 6. Phase 1 File-Level Intent

### Files that should change

1. `src/ipc/handlers/chat_stream_handlers.ts`
2. supporting chat helper modules that currently assume Electron shape indirectly
3. new `src/ipc/chat_runtime/*` files
4. tests covering the extracted boundary

### Files that should probably not change much in Phase 1

1. `src-tauri/src/wave_c_domains.rs`
2. renderer-side `src/hooks/useStreamChat.ts`
3. contract definitions in `src/ipc/types/chat.ts`
4. already-separated `wave_w_domains.rs`
5. already-separated `wave_ai_domains.rs`

This restriction is deliberate. Phase 1 is an extraction and boundary-making slice, not the final chat cutover.

## 7. Runtime Boundary Requirements

The extracted runtime service must receive all host-dependent behavior through an explicit interface.

Minimum required capabilities:

1. `onStreamStart`
2. `onChunk`
3. `onEnd`
4. `onError`
5. `isCancelled`
6. `requestAgentToolConsent`
7. `requestMcpToolConsent`
8. `recordLog` or equivalent diagnostic callback if needed

It is acceptable for the extracted runtime to still use existing database utilities and existing TypeScript provider utilities, but it must not directly depend on:

1. `ipcMain`
2. Electron event objects
3. `event.sender`
4. direct `safeSend(...)` calls from deep inside the runtime layer

## 8. Worker Protocol Work Required in Phase 1

Phase 1 must define the protocol even if Rust is not using it yet.

The protocol document or type layer must include:

1. `start`
2. `cancel`
3. `chunk`
4. `end`
5. `error`
6. `agent_tool_consent_request`
7. `mcp_tool_consent_request`
8. response messages for consent decisions

The goal is to stop Phase 2 from inventing an ad hoc wire format under pressure.

## 9. Minimum Covered Behavior

Phase 1 must preserve behavior for this narrower covered slice:

1. inserting the user message
2. inserting the placeholder assistant message
3. streaming chunk updates
4. end/error completion semantics
5. cancel path not corrupting state
6. basic BYOK model invocation path

The following may remain partially covered by later phases:

1. XML continuation edge cases
2. full auto-fix loop parity
3. full MCP consent parity
4. all secondary build-mode repair loops

## 10. Required Tests

Phase 1 should add or update tests for:

1. extracted runtime service can run without Electron event objects
2. Electron adapter still produces the same chunk/end/error behavior for the covered slice
3. placeholder assistant message lifecycle remains valid
4. cancel path stops updates and resolves consistently
5. worker protocol types serialize deterministically

The goal is not exhaustive behavior proof yet. The goal is to make the boundary safe to continue building on.

## 11. Definition of Done

Phase 1 is done only when:

1. reusable build-mode chat runtime code exists outside the Electron registration file
2. Electron chat still works through the new adapter
3. the runtime service no longer fundamentally depends on Electron primitives
4. the worker protocol is typed and checked into the repo
5. no renderer contract change was required to reach this point

## 12. Failure Conditions

Phase 1 should be considered failed or incomplete if:

1. `chat_stream_handlers.ts` is still the only true runtime entrypoint
2. the extracted service still directly depends on `IpcMainInvokeEvent`
3. the slice expands into a partial Rust rewrite of build-mode chat
4. the renderer contract gets changed just to make extraction easier
5. the worker protocol is left implicit or stringly-typed

## 13. Follow-On Dependency

If Phase 1 completes cleanly, then Phase 2 becomes much simpler:

1. the Node worker only needs to call the extracted runtime
2. Rust only needs to supervise the session and forward events
3. the Tauri cutover is no longer blocked on re-understanding the entire Electron chat handler

## Evidence

- path: `src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `Current Electron-side build-mode chat runtime and transport coupling`
  lines: 1-260, 300-520, 1200-1600
- path: `src/ipc/types/chat.ts`
  symbol: `Stable renderer contract to preserve during Phase 1`
  lines: 143-242
- path: `src/hooks/useStreamChat.ts`
  symbol: `Renderer hook semantics that must remain stable`
  lines: 78-277
- path: `src-tauri/src/wave_c_domains.rs`
  symbol: `Current Tauri stub confirms Phase 1 should not try to solve the entire host cutover at once`
  lines: 199-285
- path: `docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
  symbol: `Parent migration plan and target architecture`
  lines: 20-59, 123-239

## Links

- [[../spec-template.md]]
- [[2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[2026-03-28-prod-mvp-release-roadmap.md]]
- [[2026-03-29-non-chat-release-smoke-checklist.md]]
