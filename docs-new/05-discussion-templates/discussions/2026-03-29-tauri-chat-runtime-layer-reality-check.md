---
id: chaemera-discussion-tauri-chat-runtime-layer-reality-check-2026-03-29
title: Tauri Chat Runtime Layer Reality Check
type: discussion
status: active
tags: [discussion, tauri, chat, runtime, architecture, phase-audit]
related:
  [
    [../discussion-template.md],
    [../README.md],
    [
      ../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md,
    ],
    [
      ../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md,
    ],
    [
      ../../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
    [../../02-guides/agent-navigation.md],
  ]
depends_on:
  [
    [../../01-concepts/discussion-first.md],
    [
      ../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md,
    ],
  ]
generated: false
source_of_truth: code-audit
outline: []
---

# Tauri Chat Runtime Layer Reality Check

1. Context

- This document is a sober architecture review of the current release-line Tauri chat runtime work.
- It does not describe the future post-release structured-agent or Logos/Codex-derived architecture.
- It evaluates the current `build-mode chat runtime` migration line as it exists after the extraction, worker, and early Rust host phases.

2. What This Layer Actually Is

- The current slice is not "just chat transport".
- It is the release-line execution shell around the existing `build-mode` AI runtime.
- The center of gravity is still the extracted TypeScript runtime in `runChatStreamSession(...)`.
- Around that runtime, the repository now has:
  - an Electron adapter,
  - worker protocol types,
  - a Node worker entrypoint,
  - a plain JS stdio runner,
  - a Rust/Tauri host session manager,
  - and build/package wiring for runtime assets.

3. What Changed In the Tauri Reality

- Under Electron, the chat runtime could lean on:
  - `ipcMain`,
  - `event.sender`,
  - direct main-process file access,
  - and implicit app/settings lookup in one process.
- Under Tauri 2, that assumption is no longer sound.
- The system now has to distinguish:
  - renderer contract,
  - host process lifecycle,
  - reusable AI execution behavior,
  - and worker transport/protocol.
- This is why the migration expanded beyond "just reuse the old code".
- The heavy AI behavior was reused, but the execution shell had to be rebuilt.

4. Real Value Delivered By Phase 1, 2, and 3

4.1. Phase 1

- Phase 1 created the correct architectural separation.
- The real value is not the folder move by itself.
- The real value is that `chat_stream_handlers.ts` is no longer the only place where the runtime can exist.
- The extracted runtime boundary and typed protocol are worth keeping.

Verdict:

- Keep it.
- This is real progress and should remain the basis for any release-line Tauri chat work.

  4.2. Phase 2

- Phase 2 created the worker shell:
  - typed worker protocol,
  - worker session manager,
  - worker entrypoint,
  - stdio runner,
  - build output,
  - and Tauri resource packaging.
- This is valuable, but it is transitional infrastructure, not a final architecture truth.
- Its job is to let Tauri ship the existing build-mode runtime without rewriting the AI brain in Rust.

Verdict:

- Keep it as a transitional release-line mechanism.
- Do not mistake it for the long-term post-release AI architecture.

  4.3. Phase 3

- Phase 3 already exists in partial code form.
- The Rust host layer in `chat_worker_host.rs` is directionally right:
  - spawn worker
  - supervise session
  - forward events
  - route cancel and consent
- But Phase 3 is not "done" merely because the host exists.
- The remaining truth gate is real packaged runtime proof.

Verdict:

- Keep the host-authoritative direction.
- Do not declare Phase 3 complete until the real packaged Tauri chat path is validated through the real desktop runtime lane.

5. What Should Survive This Review

Keep:

1. Stable renderer contract in `src/ipc/types/chat.ts`.
2. Host-neutral TypeScript runtime extraction in `src/ipc/chat_runtime/`.
3. Rust-owned session authority for Tauri host lifecycle.
4. Worker protocol as a typed boundary instead of ad hoc log parsing.
5. Packaged runtime validation through the real Tauri desktop harness.

Do not overcommit to:

1. The current worker shell as a future permanent AI architecture.
2. Fake smoke/browser harness as proof of real chat runtime health.
3. The idea that Phase 2/3 are complete just because code paths compile and unit tests pass.

4. Current Architecture Debt Still Visible In Code

5. The runtime is only partially host-neutral.

- `WorkerStartMessage` already includes `appPath` and `settingsSnapshot`.
- But the current worker path still relies on the extracted runtime reading app/settings state internally instead of consuming a fully explicit host-provided environment.
- The worker session manager even records that this is still unfinished.

2. The host/worker environment contract is incomplete.

- The Rust host currently sends empty `appPath` and empty `settingsSnapshot`.
- That means the transport contract is ahead of the runtime contract.
- The shape exists, but the data ownership is not fully enforced yet.

3. The proof path was split between two different testing stories.

- The fake smoke or browser-backed path is useful for low-cost regression.
- It is not the right source of truth for packaged Tauri chat runtime.
- The real proof path is the Tauri WebDriver harness.

7. Optimal Release-Line Architecture For Tauri 2

For the current release line, the optimal architecture is:

1. Renderer remains stable.

- `useStreamChat` and the renderer event contract should continue to behave as the stable UI-facing API.

2. Rust host remains authoritative.

- Tauri should own command registration, active session lifecycle, cancellation, consent routing, worker supervision, and event emission back to the renderer.

3. TypeScript remains the release-line AI runtime brain.

- `runChatStreamSession(...)` should continue to own current build-mode execution behavior until the post-release architecture replaces it.

4. Node worker remains a transitional execution shell.

- It is a bridge that lets the release line reuse the existing AI logic under Tauri.
- It should not be confused with the future agent daemon architecture.

5. Real runtime proof must use the real desktop path.

- The correct validation lane is the packaged or debug Tauri desktop runtime harness under `testing/tauri-webdriver/`.

8. Final Judgment

- The repository did not end up with a clean one-step inheritance story.
- It ended up with a mixed result:
  - real reuse of the AI runtime brain,
  - plus a significant rebuild of the transport and host shell.
- That is acceptable for the release line.
- It is still far cheaper and less risky than a full Rust rewrite of the current build-mode runtime.
- The mistake would be to confuse this transitional shell with the desired final architecture.

9. Unknown / Deferred

- Whether the Node worker survives after the first fully working Tauri release remains deferred.
- Whether the explicit worker environment contract should absorb more settings/app-path duties remains open.
- Whether some build-mode XML behaviors should be simplified rather than carried forward verbatim remains open.
- The post-release structured-agent architecture is intentionally outside this document.

## Evidence

- path: `../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
  symbol: `Recommended architecture, required refactor boundary, and phased plan`
  lines: 44-239
- path: `../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md`
  symbol: `Phase 1 extraction goals, non-goals, and boundary requirements`
  lines: 14-161
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Extracted build-mode runtime brain`
  lines: 181-1448
- path: `../../src/ipc/chat_runtime/types.ts`
  symbol: `Host-neutral runtime context and typed worker protocol`
  lines: 1-188
- path: `../../src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `Electron-side thin adapter over runChatStreamSession`
  lines: 1-179
- path: `../../src/ipc/chat_runtime/worker_session_manager.ts`
  symbol: `Worker-side session lifecycle and explicit TODO about runtime env ownership`
  lines: 1-173
- path: `../../workers/chat/chat_worker.ts`
  symbol: `Worker entrypoint and database bootstrap`
  lines: 1-63
- path: `../../worker/chat_worker_runner.js`
  symbol: `Plain JS stdio runner and worker_threads bridge`
  lines: 1-62
- path: `../../src-tauri/src/chat_worker_host.rs`
  symbol: `Rust host session manager and current empty appPath/settingsSnapshot start payload`
  lines: 1-389
- path: `../../src-tauri/src/lib.rs`
  symbol: `Tauri command registration now routes chat stream and consent responses through chat_worker_host`
  lines: 1-193
- path: `../../src-tauri/tauri.conf.json`
  symbol: `Chat worker runner and bundle are packaged as Tauri resources`
  lines: 1-38
- path: `../../vite.chat-worker.config.mts`
  symbol: `Dedicated worker bundle build config`
  lines: 1-18
- path: `../../testing/tauri-webdriver/wdio.conf.mjs`
  symbol: `Real Tauri desktop runtime harness with fake LLM server and app profile isolation`
  lines: 1-206
- path: `../../testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
  symbol: `Existing real desktop chat-oriented runtime proof path`
  lines: 1-191

## Links

- [[../discussion-template.md]]
- [[../README.md]]
- [[../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[../../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md]]
- [[../../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
- [[../../02-guides/agent-navigation.md]]
