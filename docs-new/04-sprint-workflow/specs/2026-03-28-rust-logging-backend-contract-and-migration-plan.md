---
id: chaemera-spec-rust-logging-backend-contract-and-migration-plan-2026-03-28
title: Rust Logging Backend Replacement Contract and Migration Plan
type: spec
status: active
tags: [spec, rust, logging, tauri, diagnostics, support, backend]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
    [
      ../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md,
    ],
  ]
depends_on: [[2026-03-28-final-tauri-host-capability-cutover.md]]
generated: false
source_of_truth: governance
outline: []
---

# Rust Logging Backend Replacement Contract and Migration Plan

1. Start Here

- This document is the canonical source of truth for replacing the current Electron-shaped logging implementation hidden behind `src/lib/app_logger.ts`.
- This document is not a spec for the application's required Rust/Tauri runtime backend as a whole.
- The required application backend already exists in `src-tauri/src/lib.rs` and is part of the current release line.
- `NOT MVP SCOPE` here applies only to the logging-backend replacement work described in this document.
- The current release line remains the already accepted `Tauri 2` cutover plus `OSS-first` and `BYOK-first` product posture with only minimal functional work required to ship that line.
- This spec defines only the logging-backend replacement as post-cutover infrastructure work so that the current MVP/release line is not re-opened by logging cleanup.
- The purpose of this spec is to keep the logging contract stable while changing the backend implementation from Electron-specific file transport to a Rust/Tauri-native subsystem.

2. Intent + Non-goals

- Intent:
  - preserve the current app logging contract while replacing the backend implementation;
  - keep all logging call sites and call semantics stable during the migration;
  - preserve persistent file-backed diagnostics for support bundles and bug reports;
  - make the backend host-agnostic so it can run under the current desktop host and later reuse the same contract from a daemon or other local runtime;
  - separate diagnostics logging from preview console state and from git/version history;
  - establish the logging subsystem as a first-class host capability rather than an Electron library detail.
- Non-goals:
  - no attempt to re-spec the already-required Tauri/Rust application backend;
  - no rewrite of all existing `log.scope(...)` call sites;
  - no coupling the logging backend migration to rollback, version history, or chat replay semantics;
  - no merging of the preview console store into the file-backed diagnostics logger;
  - no AI-visible automatic access to logs unless a future explicit tool or surface is separately spec'd;
  - no redesign of GitHub issue upload flows, support bundle UX, or user-facing help flows in this spec;
  - no requirement to change log formatting just because the backend changes.

3. Current Verified State

- The application already has an active Rust/Tauri backend surface in [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs).
- The current adapter layer already exists in [`src/lib/app_logger.ts`](../../src/lib/app_logger.ts): it exposes `createLogger`, `getLogFilePath`, and `readLogTail`.
- The runtime code no longer uses `electron-log` directly outside that adapter layer.
- The current debug bundle path reads the file-backed log tail through `readLogTail` and includes it in both system debug info and session debug bundles.
- The Help dialog uses those debug bundle APIs to build bug reports and session uploads.
- The preview console is a separate in-memory per-app console log store and is not the same thing as the file-backed diagnostics logger.
- Version history and rollback are handled through git/DB/message operations and are not source-of-truth logs.

4. Problem Statement

- The problem addressed here is narrow: the logging implementation is still Electron-shaped.
- The problem addressed here is not that the application lacks a backend.
- The logging backend is currently Electron-shaped even though the application host is now moving to Tauri.
- `electron-log` is still the concrete backend behind `app_logger.ts`, which means the current diagnostic pipeline depends on Electron transport/file primitives.
- That dependency is already isolated, but it remains the wrong implementation boundary for the post-Tauri host.
- The support/debug bundle path needs a durable file-backed log source that can survive the host swap without changing user-facing behavior.
- Keeping the backend as an Electron library detail would force future runtime work to retain Electron-shaped assumptions only for logging, which is avoidable technical debt.

5. Target Outcome

- The future logging system should have these properties:
  - a stable TypeScript adapter contract in `src/lib/app_logger.ts`;
  - a Rust-owned backend that handles file persistence, tail reading support, and safe host-level logging semantics;
  - persistent human-readable logs suitable for support bundles and bug reports;
  - optional structured fields such as `appId`, `sessionId`, or `source` when available;
  - cross-platform file path handling that does not depend on Electron runtime APIs;
  - compatibility with the existing debug bundle workflow and issue-report workflow;
  - an implementation path that can later be reused by the post-release agent daemon if needed.

6. Locked Decisions

1. `src/lib/app_logger.ts` remains the canonical adapter contract.
1. The application's required Rust/Tauri backend is already part of the current release architecture and is not re-opened by this spec.
1. The logging backend implementation under that adapter may change.
1. The backend replacement is Rust-first, not a new JavaScript logger wrapper.
1. Diagnostics logging and preview console logging are separate subsystems.
1. Version history rollback does not own or rewrite logging history.
1. The backend must keep file-backed support/debug bundle behavior intact.
1. The backend should be host-agnostic and not depend on Electron-specific transport APIs.
1. The backend should preserve `scope`-based logging semantics and the current log levels used by the codebase.
1. The backend should remain append-only in normal operation.
1. Log rotation or size limiting may be introduced, but only if it preserves tail-read behavior and debug bundle usefulness.

1. Logging Boundary Model

7.1. Adapter Boundary

- `src/lib/app_logger.ts` is the only contract the rest of the application should know about.
- That file currently exposes:
  - `createLogger(scopeName)`
  - `getLogFilePath()`
  - `readLogTail(linesOfLogs, level)`
- The future Rust backend must keep those semantics stable or provide a strictly compatible successor.

  7.2. Rust Backend Boundary

- The Rust backend should own:
  - the file sink;
  - log format and line framing;
  - path resolution under the current host profile;
  - tail-read support for support/debug bundle assembly;
  - runtime-safe flush behavior where needed.
- The Rust backend should not own:
  - preview console state;
  - git rollback state;
  - chat history as source of truth;
  - AI orchestration or agent memory.

  7.3. Diagnostic Log vs Console Log

- `app_logger`-backed file logs are for host diagnostics and support bundles.
- `src/lib/log_store.ts` is for per-app preview/runtime console entries.
- The two systems may both be visible in the UI, but they must remain distinct stores with distinct semantics.

  7.4. Diagnostic Log vs Version History

- Version history is derived from git commits plus database snapshots and is displayed in the version pane.
- Rolling back a version deletes or truncates later chat messages and updates git/database state.
- Rolling back a version does not rewrite or reindex the diagnostic log file.
- Diagnostic logs may record rollback operations, but they are append-only observations, not the rollback source of truth.

8. Functional Requirements

1. Scoped logging

- The backend must preserve the current `scope` model so that logs can still be attributed to subsystems such as settings, app handlers, version handlers, debug handlers, and future host capabilities.

2. Level semantics

- The backend must preserve the current level model used by call sites: `log`, `info`, `warn`, `error`, and `debug`.
- The `readLogTail` behavior must continue to support the current `warn` and `info` filtering semantics.

3. Persistent file sink

- The backend must continue writing logs to a persistent file that can be read later for support/debug bundles.
- Missing file paths must fail safely and return an empty tail instead of throwing during normal debug bundle generation.

4. Tail read support

- The backend must support the current `readLogTail(lines, level)` behavior used by system debug info and session debug bundle generation.
- The tail reader must remain efficient enough to support interactive bug-report and session-upload flows.

5. Support bundle compatibility

- The backend must continue to support:
  - `HelpDialog` bug report body generation;
  - `getSystemDebugInfo`;
  - `getSessionDebugBundle`;
  - manual GitHub issue creation with log excerpts;
  - upload flow review screens.

6. Host compatibility

- The backend must work under the Tauri host without requiring Electron-specific APIs.
- The backend must also be usable from future local runtime surfaces if the architecture later grows a daemon or agent process.

7. Structured metadata

- The backend should allow structured fields to be attached to records where available.
- A future implementation may include `appId`, `sessionId`, `source`, `component`, or `requestId` fields, but those fields must not break the existing human-readable file sink.

8. Rotation and retention

- The backend may implement file rotation or size limits.
- Any retention policy must preserve enough log tail for support bundles and preserve the ability to inspect recent errors.

9. Flush and crash safety

- The backend should provide a way to flush or stabilize file output before generating a debug bundle or during shutdown.
- The backend should minimize the risk of losing the last few diagnostic entries during abrupt exit.

10. No AI auto-ingest by default

- Logs are not a default model context source.
- Any future AI log-read tool must be explicit and separately designed so that diagnostics do not leak into agent reasoning automatically.

9. Data Model and Contract Shape

- The implementation contract should be centered on a simple log record shape:

```text
LogRecord {
  timestamp
  level
  scope
  message
  fields?
}
```

- Recommended backend-owned responsibilities:
  - format the log record for human-readable file output;
  - preserve stable line framing for tail reading;
  - make `scope` visible in the emitted line;
  - keep error and warning lines discoverable by the current tail filter.
- Recommended adapter-owned responsibilities:
  - expose a small API to the rest of the codebase;
  - keep existing imports stable;
  - hide the Rust backend transport details from application code.

10. Implementation Plan

1. Contract freeze

- Freeze the current `app_logger.ts` API as the compatibility boundary.
- Document any new backend-only helper methods separately so they do not leak into general application code.

2. Rust backend design

- Implement a Rust logging subsystem for the Tauri side of the application.
- Prefer a host-owned file sink and a deterministic, human-readable record format.
- Keep the exact Rust library choice flexible as long as the behavior stays aligned with this spec.

3. Adapter swap

- Update `src/lib/app_logger.ts` so it calls the Rust backend instead of `electron-log`.
- Keep `createLogger`-style call sites stable so the migration remains low-churn.

4. Debug bundle continuity

- Verify that `getSystemDebugInfo` and `getSessionDebugBundle` still get a usable tail string.
- Verify that the help dialog and upload flow continue to work without UX changes.

5. Cleanup

- Remove the last `electron-log` backend dependency once the Rust path is proven.
- Keep the app console store and versioning logic unchanged unless a separate spec says otherwise.

6. Later reuse

- If the post-release agent daemon needs the same host-level logging semantics, reuse the same Rust backend or protocol rather than inventing a second logging system.

11. Acceptance Criteria

- The rest of the codebase continues to call the same adapter contract.
- Support bundle generation still includes recent log output.
- Bug report workflows still include a log excerpt.
- Version rollback behavior remains unchanged except for any normal diagnostic log entries that the rollback itself produces.
- The preview console remains a distinct runtime surface and is not replaced by the diagnostics logger.
- No Electron runtime API is required for the logging backend to function.

12. Verification

- Required checks after implementation:
  - `npm run ts`
  - `npm run build`
  - the Electron legacy-surface audit must report no direct `electron-log` runtime consumers outside the adapter boundary;
  - debug bundle generation must still return logs;
  - version rollback must still work and must not mutate log history.
- Recommended additional checks:
  - verify tail output when the log file is missing;
  - verify warning-only tail filtering;
  - verify that app console entries are not accidentally pulled into the diagnostics tail.

13. Risks and Rollback

- Risks:
  - losing compatibility with the existing support bundle and bug-report flows;
  - accidentally conflating the file-backed diagnostics logger with the preview console store;
  - introducing a Rust backend that is host-specific in a new way;
  - breaking log tail formatting so that the current filter logic stops working;
  - creating a second logging pipeline instead of replacing the current one.
- Rollback:
  - keep `src/lib/app_logger.ts` as the stable adapter;
  - switch the adapter backend back only if the Rust backend fails validation;
  - do not remove the console store or version history code as part of this logging migration.

14. Promotion Artifacts

- Before implementation begins, future work must produce:
  - a Rust backend design note or crate-level implementation spec;
  - a contract test plan for `app_logger.ts`;
  - a debug bundle regression checklist;
  - a decision note on log rotation and retention if the file sink behavior changes materially.
- Any implementation task touching the logging backend should link back to this document.

15. Evidence

- path: `src/lib/app_logger.ts`
  symbol: `Current logging adapter boundary and file-tail helper`
  lines: 1-43
- path: `src/ipc/handlers/debug_handlers.ts`
  symbol: `System and session debug bundle assembly uses readLogTail`
  lines: 11-93, 202-385
- path: `src/components/HelpDialog.tsx`
  symbol: `Bug report and chat-session upload flows consume debug logs`
  lines: 72-107, 289-420
- path: `src/lib/log_store.ts`
  symbol: `In-memory app console log store`
  lines: 1-41
- path: `src/ipc/handlers/app_handlers.ts`
  symbol: `Console store writes and clears remain separate from diagnostics logging`
  lines: 27-28, 308-315, 369-376, 1811-1818
- path: `src/ipc/handlers/version_handlers.ts`
  symbol: `Version rollback is git/DB/message state, not log state`
  lines: 36-365
- path: `src/components/chat/VersionPane.tsx`
  symbol: `Version selection and rollback UI`
  lines: 24-101, 224-237
- path: `src/hooks/useVersions.ts`
  symbol: `Version mutations and cache invalidation`
  lines: 11-99
- path: `src/components/chat/DyadMarkdownParser.tsx`
  symbol: `dyad-read-logs is UI rendering, not a runtime executor`
  lines: 45-79, 502-517
- path: `src/components/chat/DyadLogs.tsx`
  symbol: `Log tag display component`
  lines: 21-68
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-final-tauri-host-capability-cutover.md`
  symbol: `Final Tauri host cutover boundary`
  lines: 1-320
- path: `docs-new/05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md`
  symbol: `Current runtime split and support-path context`
  lines: 1-120

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-03-28-final-tauri-host-capability-cutover.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md]]
