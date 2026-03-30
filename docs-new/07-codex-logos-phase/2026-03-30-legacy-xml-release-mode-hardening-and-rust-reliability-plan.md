---
id: chaemera-spec-legacy-xml-release-mode-hardening-and-rust-reliability-plan-2026-03-30
title: Legacy XML Release Mode Hardening and Rust Reliability Plan
type: spec
status: active
tags: [spec, legacy, xml, tauri, rust, release, reliability]
related:
  [
    [README.md],
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
    [2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md,
    ],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
  ]
generated: false
source_of_truth: code-audit
outline: []
---

# Legacy XML Release Mode Hardening and Rust Reliability Plan

1. Start Here

- This document defines the final recommended release-line posture for the legacy XML mode after the Tauri runtime audit.
- The legacy XML mode is allowed to survive as an explicit alternate mode in the same application.
- It is not the future architectural center of gravity.
- The goal is narrower:
  - keep the legacy XML build workflow alive and trustworthy for release users,
  - harden the Tauri host boundary where that gives the highest reliability return,
  - and avoid spending release energy on a full Rust rewrite of the legacy runtime brain.

2. Intent + Non-goals

- Intent:
  - make the legacy XML mode reliable enough to ship as a real release-line compatibility mode;
  - close the highest-risk host/worker seams with focused Rust-side ownership;
  - define the minimum finishing work so the mode does not feel clearly worse than the original Dyad build flow on its intended scope.
- Non-goals:
  - no full Rust rewrite of `runChatStreamSession(...)`;
  - no attempt to make XML the future mainline control plane;
  - no requirement to revive dormant local-agent or plan-mode scaffolding under the legacy path;
  - no requirement to extend legacy MCP support unless it becomes a direct release blocker.

3. Target Outcome

- `Legacy XML` survives as an explicit alternate runtime mode for the current release line.
- The mode is considered release-ready when the following are true:
  - the proven build-mode XML path is stable on packaged Tauri,
  - terminal states are coherent,
  - cancellation is not misleading,
  - environment and session ownership are host-authoritative,
  - and users can trust the mode for the workflows it is actually meant to preserve.
- The parity target is not "every historical Dyad branch or dormant agent path."
- The parity target is the live XML build workflow that users actually experienced as the original Dyad build-mode path:
  - prompt submission,
  - streaming output,
  - file-writing/build flow,
  - import into app-details and open-in-chat continuation,
  - and post-stream copy and transcript behavior.

4. Locked Decisions

1. `Legacy XML` may ship as an explicit alternate mode in settings in the same desktop app as Codex/Logos.
1. The legacy runtime brain remains TypeScript on the release line.
1. Rust owns host authority, session lifecycle, worker supervision, consent routing, startup checks, and terminal event normalization.
1. The release line should harden the host shell in Rust rather than attempting a broad Rust port of XML prompt assembly, codebase extraction, or repair loops.
1. Local-agent and plan-mode scaffolding do not define legacy XML release parity.
1. XML-specific cleanup and repair logic may remain only inside the legacy mode and should not leak into the new mainline architecture.

1. Architecture Fit

- The audit shows the current release-line bridge is already viable after fixing the original cutover faults.
- The remaining weak points are concentrated in the host/worker seam, not in the full TypeScript runtime logic.
- That makes targeted Rust hardening the highest-leverage reliability work for the legacy mode.
- It also means a full Rust rewrite is still a large and unattractive task even with better docs and tests, because the runtime slice still includes:
  - persistence,
  - redo behavior,
  - attachments,
  - codebase extraction,
  - prompt assembly,
  - provider streaming,
  - XML cleanup,
  - continuation,
  - and auto-fix loops.

6. Targeted Rust Hardening Set

These are the 5 focused Rust-owned upgrades that give the highest reliability return for the legacy mode.

### 6.1. Terminal-state authority and deduplication

- Fix the host so one session cannot emit both `chat:response:error` and `chat:response:end` as two independent terminal truths.
- Rust should own the terminal-state guard and ensure exactly one terminal outcome per session.
- This is the highest-value hardening item because it simplifies renderer behavior and removes a real semantic defect already localized by the audit.

### 6.2. Cancellation outcome normalization

- Keep cancellation authoritative in the Rust session layer.
- Normalize what happens on `chat_cancel` and worker abort so the renderer and DB do not drift into mixed `cancelled but maybe completed` semantics.
- Rust should own the decision about whether a session is:
  - cancelled,
  - errored,
  - or completed,
    and emit one normalized outcome.

### 6.3. Authoritative worker environment injection

- Finish the contract that already exists for `appPath` and `settingsSnapshot`.
- Rust should populate the environment snapshot meaningfully instead of sending empty values.
- The worker runtime should then consume the host-provided values as the canonical runtime environment.
- This reduces hidden state coupling and makes the legacy mode less sensitive to side reads from implicit global state.

### 6.4. Consent and session bookkeeping hardening

- Keep request IDs, pending consent cleanup, and session ownership in Rust.
- Ensure consent requests are removed cleanly on:
  - session end,
  - session cancel,
  - worker exit,
  - and host cleanup.
- This is a good Rust-owned hardening slice because it is lifecycle infrastructure, not AI behavior.

### 6.5. Startup, packaging, and worker-preflight normalization

- Harden the Rust-side startup path so packaged or release builds fail clearly if assets or worker entrypoints are missing or misresolved.
- Add a preflight check around:
  - worker runner path,
  - worker bundle path,
  - and expected runtime asset presence.
- Normalize these failures into one clear release-line host error instead of scattered child-process or asset-resolution surprises.

7. Final Release Decisions For Legacy XML Mode

1. Ship the mode only as an explicit alternate mode, not the new default architecture.
1. Treat the current live build-mode XML path as the supported scope.
1. Require the following release-line finish work before calling the mode "ready":

- close the double-terminal host bug,
- tighten cancel semantics,
- complete worker environment ownership,
- fix packaged build/startup reliability,
- and run a final manual packaged verification pass.

4. Do not block legacy release readiness on full MCP parity or dormant local-agent restoration.
5. Do not invest in expanding XML-specific remediation UX beyond what is needed to keep the current build-mode lane trustworthy.

6. Requirement -> Task -> Test -> Gate

7. Requirement: legacy XML mode must not feel transport-fragile under Tauri.

- Task: harden Rust session authority, terminal-state normalization, and startup preflight.
- Test: packaged Tauri prompt path completes without duplicate terminal states or startup ambiguity.
- Gate: packaged legacy mode enters, streams, and terminates coherently.

2. Requirement: legacy XML mode must not hide cancellation ambiguity.

- Task: normalize cancel ownership and emitted state in Rust host plus worker session cleanup.
- Test: manual cancel during stream leaves one clear transcript outcome.
- Gate: no mixed `cancelled but also completed` perception remains.

3. Requirement: legacy XML mode should match original Dyad build-mode trust on its intended scope.

- Task: finish the final host hardening set, then run a final manual packaged checklist.
- Test: home prompt, app-details entry, imported-app continuation, and copy-output all pass in the packaged build.
- Gate: no clearly worse behavior remains on the supported legacy scope.

9. Acceptance and Tests

- This plan is accepted when:
  - the 5-item Rust hardening set is fixed,
  - the release decisions are explicit,
  - and the parity target is narrowed to the live XML build-mode lane rather than dormant historical scope.
- Legacy XML mode is release-ready when:
  - the packaged build succeeds,
  - the targeted hardening items are complete or explicitly accepted as deferred,
  - and the final manual packaged verification pass is recorded.

10. Promotion Artifacts

- `2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
- `2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md`
- final packaged legacy-mode verification checklist or release note

11. Risks and Rollback

- Risks:
  - over-hardening the legacy runtime brain instead of the host seam;
  - letting XML mode sprawl back into future default-path planning;
  - blocking release on dormant scope that was never part of the real live XML lane.
- Rollback:
  - keep the hardening slices isolated to host/session ownership;
  - keep legacy mode behind an explicit settings-controlled runtime selection;
  - if one hardening item slips, document the exact residual risk instead of inflating the rest of the runtime scope.

12. Agent Guardrails

- Do not treat this document as approval for a whole-runtime Rust rewrite.
- Do not count local-agent or plan-mode scaffolding as required parity for legacy XML release mode.
- Do not grow the worker bridge further just to rescue obscure XML-only edge behavior.
- Prefer Rust hardening only where Rust is already the natural owner.

## Evidence

- path: `../../src-tauri/src/chat_worker_host.rs`
  symbol: `Rust host owns worker spawn, session supervision, cancel routing, consent response routing, and renderer event emission`
  lines: 324-701
- path: `../../src/ipc/chat_runtime/worker_session_manager.ts`
  symbol: `Worker session manager TODO and current ownership split around runtime environment and consent bookkeeping`
  lines: 31-104, 106-194
- path: `../../src/ipc/chat_runtime/types.ts`
  symbol: `WorkerStartMessage and host-neutral runtime context including appPath/settingsSnapshot and optional Electron-only hooks`
  lines: 38-109, 116-176
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Legacy runtime brain breadth including prompt assembly, provider invocation, XML continuation, repair, auto-fix, cancellation, and completion metadata`
  lines: 397-541, 802-1451
- path: `2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
  symbol: `Canonical capability rows and audit scope`
  lines: 38-176
- path: `2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
  symbol: `Audit verdict, live-proven paths, and residual defect list`
  lines: 38-217
- path: `../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md`
  symbol: `Legacy XML survives only as an opt-in expert or compatibility mode`
  lines: 66-131

## Links

- [[README.md]]
- [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
- [[2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
- [[2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md]]
- [[../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
- [[../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md]]
