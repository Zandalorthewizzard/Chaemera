---
id: chaemera-spec-release-line-mvp-roadmap-2026-03-30
title: Release-Line MVP Roadmap
type: spec
status: active
tags: [spec, roadmap, mvp, release, tauri, legacy, xml, mcp]
related:
  [
    [README.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
    [2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md],
    [2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md],
    [../00-navigation/INDEX.md],
    [../03-templates/strict-spec.template.md],
  ]
depends_on:
  [
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
    [2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md],
    [2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Release-Line MVP Roadmap

1. Start Here

- This document defines the ordered execution roadmap from the completed runtime audit to the release-line MVP.
- The MVP is now locked as:
  - a ship-ready packaged Tauri desktop app,
  - with a stable `Legacy XML` runtime,
  - plus `MCP` support finished as the last MVP workstream before release cut.
- This roadmap exists to prevent two expensive mistakes:
  - polishing temporary TypeScript seams that should now be owned by Rust,
  - or reopening the future `Codex/Logos` architecture before the release line is stable.

2. Intent + Non-goals

- Intent:
  - convert the post-audit consensus into an execution order with explicit scope and exit gates;
  - fix release blockers first, not future architecture first;
  - separate `must ship now`, `can defer until after release`, and `future mainline` work.
- Non-goals:
  - no full Rust rewrite of the legacy runtime brain before release;
  - no requirement to ship `Codex/Logos` in the MVP;
  - no requirement to restore `local-agent` before the MVP;
  - no broad docs cleanup program beyond the nav sync needed for this roadmap.

3. Target Outcome

- The release line is considered MVP-ready when all of the following are true:
  - `npm run package:tauri` produces a fresh packaged build reliably;
  - packaged Tauri launches and the proven legacy build-mode chat lane works end to end;
  - Rust owns the critical host-authority fixes already identified in the reliability plan;
  - packaged manual verification passes for the supported release-line scenarios;
  - `MCP` works on the release line well enough to count as part of the MVP;
  - remaining known limitations are explicit and do not include hidden transport or lifecycle ambiguity.

4. Locked Decisions

1. The active release branch remains `origin/refactor/leptos-tauri2`.
1. `Legacy XML` is an allowed release-mode and may ship as an explicit supported runtime mode.
1. `MCP` is in scope for the MVP, but it is intentionally the final MVP phase after the release-line host/runtime seam is stable.
1. `local-agent` is out of MVP scope and should be reconsidered only after the `MCP` decision and stabilization work are complete.
1. Rust owns release-line host authority where lifecycle, packaging, session truth, consent truth, or environment truth are involved.
1. TypeScript may remain the legacy runtime brain on the release line unless a specific defect belongs more naturally to Rust ownership.
1. `Codex/Logos` remains the next mainline update path, not a hidden prerequisite for this MVP.

1. MVP Scope Boundary

### 5.1. In scope for MVP

- packaged Tauri build reliability and startup reliability;
- home chat, app-details chat, import flow, and transcript copy behavior on packaged Tauri;
- terminal-state, cancel-state, environment, consent, and session-lifecycle hardening at the Rust host boundary;
- final manual packaged verification for the supported release-line scenarios;
- `MCP` wiring, execution, and verification on the release line.

### 5.2. Explicitly out of scope for MVP

- full rewrite of `runChatStreamSession(...)` into Rust;
- `Codex/Logos` runtime replacement;
- broad XML-era cleanup beyond what is required to keep the supported lane trustworthy;
- `local-agent` restoration or expansion;
- renderer-wide runtime-mode branching or speculative dual-runtime implementation beyond the already-locked boundary docs.

### 5.3. Supported MVP scenario definition

- A user can launch the packaged app, open or import an app, chat in the legacy build-mode path, stream a response, cancel when needed, continue working from app-details, copy useful output, and use `MCP` in the release-supported way without lifecycle ambiguity.

6. Architecture Fit

- The audit result changed the roadmap because the release-line bridge is now proven viable.
- The remaining defects are concentrated in:
  - packaging and startup normalization,
  - host/session lifecycle truth,
  - cancellation and terminal semantics,
  - and the missing worker-side `MCP` adapter path.
- That means the MVP should proceed in this order:
  - unblock packaged build,
  - harden the host boundary,
  - verify the packaged legacy lane,
  - then add the final `MCP` slice,
  - and only after release return to `Codex/Logos` mainline work.

7. Workstreams and Ordered Phases

### 7.1. Phase 0 - Execution baseline and release ledger

- Goal:
  - convert the post-audit state into one active execution lane with explicit blockers and acceptance gates.
- Tasks:
  - treat this roadmap plus the legacy XML reliability plan as the release-line source of truth;
  - keep a short blocker ledger in notes if implementation spans multiple sessions;
  - classify every newly found issue as one of:
    - `ship blocker`,
    - `MVP follow-up`,
    - `post-release`,
    - or `future Codex/Logos`.
- Exit criteria:
  - no important task is justified only by chat memory;
  - no new issue silently expands MVP scope.

### 7.2. Phase 1 - Packaging and startup unblock

- Goal:
  - make fresh packaged Tauri builds reliable before more runtime polish work accumulates.
- Scope:
  - `npm run package:tauri` failure around path watching and Cargo resolution;
  - startup checks for worker entrypoint and packaged assets;
  - packaged path normalization so build/start errors fail clearly and early.
- Tasks:
  - identify why packaging expects `Cargo.toml` at the wrong location;
  - fix the packaging configuration rather than teaching the release process to tolerate a bad path assumption;
  - add or tighten Rust-side preflight checks for worker runner path, worker bundle path, and required assets;
  - ensure packaging failures become one clear host/build diagnosis instead of scattered watch or spawn errors.
- Out of scope:
  - no speculative refactor of unrelated Tauri config once packaging is stable.
- Exit criteria:
  - a fresh packaged build succeeds locally;
  - the packaged app launches cleanly;
  - known startup and asset failures are normalized enough to be diagnosable.

### 7.3. Phase 2 - Rust host authority hardening

- Goal:
  - finish the targeted Rust ownership set that prevents the legacy lane from feeling transport-fragile.
- Scope:
  - terminal-state authority and deduplication;
  - cancellation outcome normalization;
  - authoritative worker environment injection;
  - consent and session bookkeeping cleanup;
  - startup and worker-preflight normalization not already completed in Phase 1.
- Tasks:
  - guarantee exactly one terminal truth per session;
  - ensure `cancelled`, `errored`, and `completed` cannot coexist as mixed final outcomes;
  - make host-provided `appPath` and `settingsSnapshot` materially authoritative;
  - clean pending consent and request bookkeeping on every terminal path;
  - reduce worker-side hidden state coupling where Rust is the natural owner.
- Rust-now cut line:
  - if the problem is lifecycle truth, process supervision, packaging truth, or consent truth, fix it in Rust now;
  - if the problem is legacy prompt assembly or XML-specific behavior without host authority implications, keep it in TypeScript for release unless it becomes a ship blocker.
- Exit criteria:
  - no double-terminal behavior remains;
  - cancel semantics are coherent in transcript and persistence behavior;
  - worker env inputs are host-owned and predictable;
  - consent cleanup is not left dangling after completion, error, cancel, or worker exit.

### 7.4. Phase 3 - Legacy XML packaged verification lane

- Goal:
  - prove the release-supported `Legacy XML` path in the packaged app instead of relying only on harness confidence.
- Scope:
  - home composer flow;
  - app-details to chat flow;
  - import flow;
  - transcript copy behavior;
  - selected context, attachments, and rules/settings sensitivity;
  - cancel and redo behavior on realistic transcripts.
- Tasks:
  - convert the existing manual verification bucket into a release checklist;
  - run the checklist on a fresh packaged build after Phases 1 and 2;
  - classify any failures as either:
    - packaged-only release blockers,
    - acceptable known limitations,
    - or `MCP-phase` dependencies.
- Decision rule:
  - native dialog polish matters, but import should only block the MVP if the real product flow is unreliable for end users, not merely awkward in automation.
- Exit criteria:
  - the supported packaged legacy lane is verified and recorded;
  - unresolved issues have explicit disposition instead of vague concern.

### 7.5. Phase 4 - MCP MVP completion slice

- Goal:
  - finish `MCP` as the final MVP workstream after the legacy release lane is already stable.
- Scope:
  - worker adapter gap around `getMcpTools`;
  - consent transport and execution wiring on the release line;
  - transcript and lifecycle behavior for real `MCP` use.
- Tasks:
  - wire the worker path so `MCP` tools are actually reachable where consent transport already exists;
  - verify approval, execution, and cleanup behavior against the same Rust session authority rules as normal chat runs;
  - confirm `MCP` does not reintroduce terminal-state or cancel-state ambiguity;
  - run a targeted packaged `MCP` verification pass after the adapter work lands.
- Out of scope:
  - no `local-agent` restoration folded into the `MCP` phase;
  - no broad tool-runtime redesign for future `Codex/Logos` parity.
- Exit criteria:
  - `MCP` is actually usable in the release-supported lane;
  - `MCP` runs do not bypass consent or break lifecycle truth;
  - `MCP` no longer exists only as partial transport with unreachable execution.

### 7.6. Phase 5 - MVP cut and release readiness review

- Goal:
  - decide from evidence whether the release line is ready for an MVP cut.
- Tasks:
  - review packaging status, Rust hardening status, packaged verification, and `MCP` verification together;
  - write down final known limitations and confirm they are non-blocking;
  - confirm no deferred issue secretly invalidates the packaged legacy lane.
- Exit criteria:
  - the release team can name exactly what is shipping, what is deferred, and why the result qualifies as MVP.

8. Requirement -> Task -> Test -> Gate

1. Requirement: the release line must produce a real packaged desktop build.

- Task: fix packaging path resolution and startup preflight.
- Test: `npm run package:tauri` succeeds and the packaged app launches.
- Gate: MVP work does not proceed as if the app is shippable until packaged build reliability is proven.

2. Requirement: the legacy runtime must not feel semantically unreliable under Tauri.

- Task: move terminal-state, cancel-state, env authority, and consent/session lifecycle truth to Rust where appropriate.
- Test: packaged runs do not emit conflicting final outcomes and do not leave ambiguous cleanup state.
- Gate: no known double-terminal or mixed cancel/completion truth remains.

3. Requirement: the supported `Legacy XML` lane must be proven in a packaged app, not just in harnesses.

- Task: run and record the packaged manual verification checklist.
- Test: home chat, app-details chat, import continuation, copy behavior, attachments/context, and cancel/redo pass or receive an explicit non-blocking disposition.
- Gate: the packaged support story is explicit and evidence-backed.

4. Requirement: `MCP` must be part of the MVP without destabilizing the already-proven release lane.

- Task: finish the worker adapter path and verify consent plus lifecycle behavior.
- Test: packaged `MCP` runs execute with reachable tools, correct consent behavior, and clean final states.
- Gate: `MCP` is included only when it is real, not merely partially wired.

5. Requirement: future architecture work must not leak back into the release MVP by accident.

- Task: keep `Codex/Logos` and `local-agent` work outside this roadmap unless a later decision explicitly reopens scope.
- Test: no MVP task depends on daemon-first implementation or local-agent restoration.
- Gate: release-line work stays narrow and reviewable.

9. Acceptance and Tests

- This roadmap is accepted when:
  - MVP scope is explicit;
  - ordered phases are explicit;
  - `MCP` is included as the final MVP slice rather than omitted or allowed to sprawl earlier;
  - and docs navigation is synchronized.
- The MVP is accepted when:
  - packaged build reliability is proven;
  - Rust hardening items are complete or explicitly dispositioned;
  - packaged legacy verification is recorded;
  - `MCP` verification is recorded;
  - and remaining limitations are explicitly documented as non-blocking.

10. Promotion Artifacts

- packaged build and startup fix record
- final packaged legacy verification checklist or note
- `MCP` verification checklist or note
- post-MVP follow-up roadmap for `local-agent` decision and `Codex/Logos` mainline work

11. Risks and Rollback

- Risks:
  - treating packaging as a minor nuisance and accumulating unverified runtime work on top of it;
  - over-fixing TypeScript seams that should move to Rust authority now;
  - pulling `MCP` too early and destabilizing the release lane;
  - silently smuggling `local-agent` or `Codex/Logos` work back into MVP scope;
  - mistaking automation-host dialog quirks for generic runtime failure.
- Rollback and containment:
  - keep packaging and startup fixes isolated and verifiable first;
  - use the Rust cut line already established in the legacy reliability plan;
  - keep `MCP` as a final gated phase;
  - defer `local-agent` explicitly;
  - write down residual risk instead of broadening scope implicitly.

12. Agent Guardrails

- Do not treat this roadmap as permission for a whole-runtime Rust rewrite.
- Do not start `MCP` work before the packaged legacy lane is stable enough to measure regressions.
- Do not reopen `local-agent` during MVP execution unless the user explicitly changes scope.
- Do not count a dev-only or harness-only success as release readiness.
- Do not let `Codex/Logos` mainline planning override the release-line cut defined here.

## Evidence

- path: `../../AGENTS.md`
  symbol: `META-CONSENSUS and Release-line Rust scope`
  lines: 1-220
- path: `2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
  symbol: `Audit verdict, residual defects, manual verification bucket, and MCP adapter gap`
  lines: 55-221
- path: `2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md`
  symbol: `Locked decisions and targeted Rust hardening set`
  lines: 57-206
- path: `2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md`
  symbol: `Locked shared-host boundary and banned split points`
  lines: 48-214
- path: `../../testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`
  symbol: `Home composer runtime proof`
  lines: 1-198
- path: `../../testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
  symbol: `App-details to chat runtime proof`
  lines: 1-200
- path: `../../testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
  symbol: `Import core path proof`
  lines: 1-160
- path: `../../testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
  symbol: `Copied assistant output proof`
  lines: 1-210

## Links

- [[README.md]]
- [[2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
- [[2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
- [[2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md]]
- [[../00-navigation/INDEX.md]]
- [[../03-templates/strict-spec.template.md]]
