# 2026-03-30 Legacy Chat Runtime Audit Snapshot 2

Status: working note, non-canonical.

## Purpose

This note records the first stop point after resuming the legacy chat-runtime audit from the GPT-5.4 handoff.

The audit did not continue into deeper runtime-core classification because the live Tauri WebDriver harness became unstable before a trustworthy `chat:stream` proof boundary was reached.

## What Was Reconfirmed

- Required audit context was re-read from:
  - `docs-new/07-codex-logos-phase/README.md`
  - `docs-new/07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md`
  - `docs-new/07-codex-logos-phase/2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
  - `docs-new/07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md`
  - `docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
  - `docs-new/04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
  - `docs-new/05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
  - `notes/2026-03-29-chat-runtime-architecture-context.md`
  - `notes/2026-03-30-legacy-chat-runtime-audit-snapshot-1.md`
- The current branch still contains the extracted runtime brain in:
  - `src/ipc/chat_runtime/run_chat_stream_session.ts`
- The current branch still contains the real Tauri worker host in:
  - `src-tauri/src/chat_worker_host.rs`
- The route-shift evidence from snapshot 1 is still valid:
  - import landing now goes to `/app-details`
  - `Open in Chat` remains the explicit transition path from app details into `/chat`

## Build Result

- `npm run pre:e2e:tauri-runtime` completed successfully.
- This rebuilt:
  - renderer assets
  - chat worker bundle
  - debug Tauri desktop binary

## Live Audit Runs Attempted

### 1. Home composer runtime path

Command shape:

- `npx wdio run wdio.conf.mjs --spec ./specs/home-chat-runtime.e2e.mjs`

Observed progression:

- desktop shell became reachable
- custom provider and model setup succeeded
- user settings persisted successfully through the Tauri bridge
- prompt entry into the home composer succeeded
- failure occurred while waiting for navigation to a `/chat?id=...` route

Observed failure:

- primary test failure: `Timeout`
- transport symptom after timeout: WebDriver request failed with `ECONNRESET`

Interpretation:

- this is not yet proof of a `chat_stream` runtime-core defect
- the failure boundary is still at or before route transition / app creation / app selection / desktop app stability

### 2. App-details runtime path

Command shape:

- `npx wdio run wdio.conf.mjs --spec ./specs/chat-from-app-details.e2e.mjs`

Observed progression:

- desktop shell became reachable
- custom provider and model setup succeeded
- app creation through the Tauri bridge succeeded
- failure occurred after the test forced a shell refresh and waited for the selected app to appear in the title bar

Observed failure:

- primary test failure: `Timeout`
- transport symptom after timeout: WebDriver request failed with `ECONNREFUSED`

Interpretation:

- this failure also occurs before a trustworthy `chat:stream` proof point
- the desktop app or WebDriver session likely became unavailable during or after refresh / app-selection stabilization

## Updated Failure Boundary

The current stop point is now narrower than snapshot 1 but still not inside the runtime core.

- confirmed working up to:
  - runtime asset build
  - desktop shell boot
  - Tauri core-command bridge for model/provider setup
  - Tauri core-command bridge for app creation
- not yet reliably proven:
  - home-composer app bootstrap into a real chat route
  - refreshed shell visibility of the newly created app in the sidebar/title bar
  - actual `chat:stream` invocation from the live desktop harness on this machine/session

## Audit Classification Impact

At this stop point the remaining runtime rows should still not be marked `broken` from live evidence alone.

Recommended temporary row language:

- `Packaged Tauri entrypoint`
  - current branch: `works`
  - proof method: `existing-test` + `new-e2e` boot/build evidence
- `User and assistant persistence`
  - current branch: `untested`
  - reason: live harness did not reach stable `chat:stream`
- `Redo semantics`
  - current branch: `untested`
- `Prompt, settings, and model resolve`
  - current branch: `partial`
  - reason: settings/model setup through the host bridge succeeds, but provider request path was not reached live
- `Codebase extraction`
  - current branch: `untested`
- `Attachments and selected context`
  - current branch: `untested`
- `Provider invocation and streaming`
  - current branch: `untested`
- `End and error semantics`
  - current branch: `untested`
- `XML cleanup`
  - current branch: `code-audit only`
- `Repair, continuation, and auto-fix`
  - current branch: `code-audit only`
- `Completion metadata`
  - current branch: `code-audit only`
- `Cancellation-aware behavior`
  - current branch: `code-audit only`
- `MCP consent and tool hooks`
  - current branch: `partial`
  - reason: protocol and host events exist, but worker path still lacks full parity hooks such as `getMcpTools`
- `Local-agent hook points`
  - current branch: `by-design-unavailable` on worker path for now

## Concrete Code Evidence Rechecked

- `src/ipc/chat_runtime/run_chat_stream_session.ts`
  - still owns persistence, redo, attachments, codebase extraction, provider invocation, XML cleanup, repair loops, completion metadata, cancellation checks, and optional MCP/local-agent hooks
- `src/ipc/chat_runtime/types.ts`
  - still defines a host-neutral runtime context and worker protocol
- `src/ipc/chat_runtime/worker_session_manager.ts`
  - still documents incomplete host-provided environment ownership and only exposes consent/log callbacks in the worker runtime context
- `src-tauri/src/chat_worker_host.rs`
  - still emits `chat:stream:start`, `chat:response:chunk`, `chat:response:end`, `chat:response:error`
  - still sends empty `appPath` and empty `settingsSnapshot` in the worker start payload
- `testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`
  - remains the best direct proof attempt for home-composer -> live chat route
- `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
  - remains the best direct proof attempt for `/app-details` -> `Open in Chat` -> live chat route

## Why The Audit Stopped Here

The handoff instruction explicitly said to stop and report immediately if environment or tooling issues blocked trustworthy progress.

That condition is now met because:

1. the rebuilt desktop binary exists,
2. the WebDriver harness starts,
3. but two direct live runtime specs fail before stable `chat_stream` proof,
4. and the post-failure symptoms (`ECONNRESET`, `ECONNREFUSED`) suggest harness or application instability rather than a clean runtime-core assertion.

## Recommended Next Debug Order

1. Inspect Tauri WebDriver profile/log artifacts for app crash or renderer disconnect evidence.
2. Determine whether `browser.refresh()` is invalid or unstable in this Tauri WebDriver environment.
3. Determine whether the desktop app crashes during route transition, sidebar refresh, or app selection.
4. Only after the live harness is stable should the audit continue into the remaining runtime matrix rows.
