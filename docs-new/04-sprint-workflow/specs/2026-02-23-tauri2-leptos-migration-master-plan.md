---
id: chaemera-spec-tauri2-leptos-migration-master-plan-2026-02-23
title: Migration Master Plan (Leptos + Tauri 2)
type: spec
status: active
tags: [spec, migration, architecture, tauri2, leptos, oss]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [
      ../../05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md,
    ],
    [../runbook.md],
    [../sprints/README.md],
  ]
depends_on:
  [
    [
      ../../05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Migration Master Plan (Leptos + Tauri 2)

1. Start Here

- Objective: migrate Chaemera off Electron to a production-ready Tauri 2 application, recover full OSS baseline functionality on the new desktop stack, and treat any broader Leptos migration as a later separate stage rather than the current release gate.
- This plan is iterative and gate-based, not big-bang.
- Reference contracts and runtime entrypoints before changes:
  - `src/main.ts`
  - `src/preload.ts`
  - `src/ipc/ipc_host.ts`
  - `src/ipc/preload/channels.ts`
  - `src/ipc/types/`
  - `e2e-tests/`

2. Intent + Non-goals

- Intent:
  - Recover full open-source baseline functionality on the target stack by milestone and final cutover.
  - Remove proprietary/pro/brand-locked behavior.
  - Replace runtime shell with Tauri 2.
  - Keep the current TypeScript/shadcn UI acceptable where it does not block the Tauri 2 cutover.
  - Defer any broader Leptos migration to a later explicitly scoped stage.
- Non-goals:
  - No upstream sync scope expansion during migration.
  - No opportunistic full redesign while parity is incomplete.
  - No mixing cosmetic UI redesign with functional parity migration.
  - No mixing unrelated refactors in migration commits.
  - No requirement that every intermediate migration commit or work-in-progress branch state remain fully user-ready.
  - No requirement that the current production cutover also complete a Leptos UI migration.

3. Target Outcome

- Desktop app runs on Tauri 2 without Electron as a required foundation.
- The current production UI may remain TypeScript/shadcn-backed where that preserves parity and momentum.
- Command/event bridge replaces Electron preload IPC.
- OSS-only feature set reaches full baseline parity on the target stack with validated acceptance criteria.
- CI includes migration-era test strategy for new runtime.
- The current production version removes Dyad commercial logic and first-order Dyad identity debt that should not ship in Chaemera.
- In-app web preview remains part of the target product:
  - Tauri owns the desktop shell.
  - The current app UI shell may remain on the existing TypeScript/React/shadcn stack for the production cutover.
  - The preview surface remains an embedded web-content panel inside the workspace, with preview orchestration preserved during migration and only reworked when needed for final parity.

    3.1. Current Checkpoint (2026-03-01)

- `Sprint 3` through `Sprint 8` are implemented, which means the current codebase already contains the Tauri runtime waves and the migration harness path.
- `Sprint 9` and `Sprint 10` are also implemented, which means low-risk and core routes now have a live Leptos route-shell cut-in, but those route-shell experiments are no longer the gating objective for the current production cutover.
- Current validation checkpoint is green for:
  - `npm run ts`
  - `npm run build`
  - `npx vitest run src/__tests__/tauri_leptos_shell_bridge.test.ts`
  - `npx playwright test --project=tauri-smoke e2e-tests/tauri-smoke.spec.ts --reporter=line`
  - selected `electron-regression` smoke coverage
- `Sprint 11` remains the final functional cutover:
  - remove Electron/Forge artifacts,
  - remove compatibility bridges that are no longer needed,
  - reconcile older sprint-planning artifacts such as `Sprint 2`.
- A dedicated spillover sprint is now reserved if token/context accounting remains too large for safe inclusion inside `Sprint 11`:
  - `Sprint 12 - Chat Count Tokens and Context Accounting`.
- Strategy update as of `2026-03-13`:
  - ship a production-ready `Tauri 2` version first,
  - keep the current TypeScript/shadcn UI where it does not block release,
  - remove remaining Electron dependencies and Dyad-specific commercial/identity debt in the current release line,
  - revisit broader Leptos migration only as a later separate stage if it still has enough payoff.

4. Locked Decisions

- Strategy: strangler migration, domain by domain.
- License: Apache-2.0 remains.
- Scope boundary: remove proprietary/pro/brand-locked flows; keep cloud providers that are open-compatible.
- Delivery: small, focused commits with explicit acceptance notes.
- Testing: gate milestone states with measurable parity checks; do not optimize for full temporary parity at every intermediate step.
- UI redesign is planned but deferred out of the migration critical path.
- Redesign scope defaults to cosmetic/visual refresh unless a separate functional spec explicitly expands it.
- Temporary breakage inside an active migration slice is acceptable if it accelerates cutover and the recovery target is explicit.
- The current production cutover does not require a full Leptos UI migration.
- The existing TypeScript/shadcn UI is acceptable for the current release where it preserves parity and reduces migration risk.
- Dyad commercial logic and first-order Dyad identity debt belong to the current production cutover, not a distant redesign-only phase.
- Any broader Leptos migration must be re-scoped as a later separate stage after the Tauri 2 production version is stable.
- Leptos UI primitives should follow a wrapper-first approach:
  - keep a shadcn-like primitive model for migration continuity,
  - expose project-local wrappers first,
  - treat any upstream Leptos UI kit as replaceable implementation detail.

5. Architecture Fit

- Current:
  - Electron app lifecycle and window in `src/main.ts`.
  - Preload bridge in `src/preload.ts`.
  - Handler registry in `src/ipc/ipc_host.ts`.
  - Domain contracts in `src/ipc/types/*`.
  - React renderer root in `src/renderer.tsx`.
- Target:
  - Tauri 2 shell (Rust commands/events for native boundaries).
  - The current TypeScript/React/shadcn renderer remains acceptable for the production cutover where it does not block release.
  - Contract-first bridge mapping current domains to Tauri commands/events.
  - Shared domain logic moved away from Electron-specific APIs.
  - Workspace preview remains embedded inside the application UI rather than being split into a separate desktop runtime.
- Expected preview implementation on the current production stack is the existing workspace UI hosting the current web preview flow (`iframe` or equivalent embedded web-content surface) with the existing preview-control semantics preserved unless a later spec changes them.
- Any future Leptos UI composition model should still follow:
  - local primitive wrappers mirror the current React `src/components/ui/` layer where practical,
  - upstream Leptos component libraries remain hidden behind Chaemera-owned wrappers,
  - route migration should reuse those wrappers instead of importing vendor primitives directly into feature views.

6. External References (optional)

- No external references required for this baseline plan.
- Source of truth is local repository behavior at clone baseline.

7. Implementation Tasks (ordered)

1. Phase 0 - Baseline freeze and acceptance matrix.

- Catalog existing open-source features from `e2e-tests/*.spec.ts` into must-keep matrix.
- Tag tests that are Electron-harness-specific.
- Define pass criteria per feature domain.

2. Phase 1 - OSS/license detox.

- Remove or isolate pro/brand-locked flows from runtime, handlers, UI, and i18n.
- Keep cloud provider integrations that are open-compatible.
- Update tests to OSS-expected behavior.

3. Phase 2 - Tauri 2 shell bootstrap.

- Create Tauri 2 app shell with window/deeplink/single-instance/update equivalents.
- Introduce compatibility bridge for command/event calls.
- Keep behavior parity for startup and core settings flows.

4. Phase 3 - Domain migration waves (IPC to Tauri).

- Wave A: settings/system/window/base app lifecycle.
- Wave B: file/app/import/template/context-path operations.
- Wave C: chat stream, local agent, MCP, token/problems.
- Wave D: integrations (GitHub, Supabase, Neon, Vercel, local models).
- Wave E: visual editing, security, release/support utilities.

5. Phase 4 - Test harness migration.

- Replace Electron launcher assumptions in e2e fixtures.
- Port critical smoke and regression suites to Tauri-compatible harness.
- Keep deterministic fake-LLM orchestration.

6. Phase 5 - Production UI stabilization on the current stack.

- Keep the current TypeScript/shadcn UI where it does not block the Tauri 2 release.
- Remove or isolate remaining Electron-coupled UI/runtime assumptions.
- Treat broader Leptos migration as a later separate stage instead of a current release gate.

7. Phase 6 - Cutover and cleanup.

- Remove Electron/Forge artifacts and dead bridge code.
- Finalize CI/release scripts for Tauri 2 path.
- Remove Dyad-branded commercial and first-order identity debt required for the production-ready fork.
- Freeze migration docs and publish final parity report.

8. Phase 7 - Deferred Leptos and later redesign track.

- Start only after the Tauri 2 production cutover is accepted.
- Any broader Leptos migration must be re-scoped as its own later stage.
- Broader redesign remains separate from parity-critical cutover work.
- Keep later UI-stage validation tied to the same OSS acceptance matrix so architecture or visual changes do not mask regressions.

8. Requirement -> Task -> Test -> Gate

1. Requirement: recover current OSS baseline behavior on the target stack.

- Task: build acceptance matrix from current tests and key manual scenarios.
- Test: run mapped smoke set at milestone checkpoints and final cutover.
- Gate: baseline parity is required at accepted sprint/milestone states and at final cutover, not at every intermediate work-in-progress state.

2. Requirement: remove proprietary/pro flows.

- Task: strip pro handlers, pro UI controls, pro deep links, pro budget endpoints.
- Test: unit checks + e2e assertions for OSS behavior.
- Gate: no runtime references to removed pro endpoints/flows.

3. Requirement: migrate runtime to Tauri 2 safely.

- Task: implement shell equivalents and command/event bridge.
- Test: startup, settings, navigation, and filesystem operations pass.
- Gate: Electron runtime no longer required for migrated domains.

4. Requirement: ship a production-ready Tauri 2 UI without Electron dependency.

- Task: preserve and adjust the current UI on the existing TypeScript/shadcn stack where needed for cutover, while removing Electron-coupled pieces.
- Test: route-level parity checks and integration smoke on the production UI path.
- Gate: the current production UI works on Tauri 2 without Electron as a required foundation.

  4.1. Requirement: preserve in-app preview workflow on the new stack.

- Task: keep preview-panel behavior available inside the Tauri + Leptos workspace, initially by carrying forward the current embedded preview flow.
- Test: preview open/close, refresh, navigation, and related workspace interactions pass at the relevant milestone gate.
- Gate: final cutover is not complete until preview functionality works inside the Tauri + Leptos workspace.

5. Requirement: defer broader Leptos migration and redesign without destabilizing the current cutover.

- Task: keep Leptos-as-a-stage and broader redesign explicitly out of the current production cutover unless a new spec reopens them.
- Test: production cutover decisions stay focused on Tauri parity, Electron removal, and OSS/product detachment.
- Gate: later UI architecture or redesign work starts only after the Tauri 2 production version is functionally stable.

9. Acceptance and Tests

- Minimum phase gates:
  - Unit tests for migrated domain pass.
  - Integration tests for command/event contracts pass.
  - e2e smoke for core app flows pass.
  - Manual check for startup, chat basic flow, settings persistence, and file operations.
- Working rule:
  - Temporary breakage is acceptable during an active migration sprint.
  - Validation is mandatory before sprint acceptance, milestone promotion, and final cutover.
- Core baseline domains:
  - App lifecycle and routing.
  - Chat stream and message rendering.
  - File operations and context paths.
  - Settings persistence and provider setup.
  - Import/export and versioning basics.

10. Promotion Artifacts

- Per phase:
  - Updated strict spec section status.
  - Updated discussion notes if decisions changed.
  - Progress entry and validation evidence links.
  - Commit series with clear domain-focused messages.
- End of migration:
  - Final parity report and removed-surface report.

11. Risks and Rollback

- Risks:
  - Runtime bridge incompatibilities.
  - Hidden Electron assumptions in deep features.
  - Test coverage gaps during harness migration.
  - Scope creep due to concurrent refactors.
- Rollback strategy:
  - Keep migration branches small and reversible.
  - Land domain by domain behind explicit gates.
  - Revert last domain wave if parity gate fails.

12. Agent Guardrails

- Always preserve behavior unless the spec explicitly authorizes change.
- Do not merge multi-domain risky changes in a single commit.
- Keep docs synchronized after each substantial change:
  - `../../00-navigation/INDEX.md`
  - `../../00-navigation/inventory.json`
  - `../../00-navigation/progress.md`
  - `../../00-navigation/validation.md`
- Respect OSS boundary rules and avoid reintroducing removed proprietary references.

## Evidence

- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Current release strategy update`
  lines: 1-200
- path: `../../05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`
  symbol: `Pragmatic TS while removing Electron`
  lines: 1-340
- path: `../specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Tauri-first roadmap tracks`
  lines: 1-260

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[../../05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md]]
- [[../../05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md]]
- [[../runbook.md]]
- [[../sprints/README.md]]
