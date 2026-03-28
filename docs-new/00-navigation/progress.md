---
id: chaemera-nav-progress
title: Chaemera Documentation Progress
type: utility
status: active
tags: [progress, changelog]
related: [[INDEX.md], [validation.md]]
depends_on: []
generated: false
source_of_truth: progress
outline: []
---

# Documentation Progress

## 2026-02-23

1. Initialized `docs-new` with Pack 2.0 layered structure (`00..06`).
2. Added baseline concepts, guides, templates, sprint workflow, and discussion templates.
3. Added experimental folder for semi-autonomous iterative discussion pipeline.
4. Added migration strategy discussion:
   - `05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`.
5. Added strict migration master plan:
   - `04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`.
6. Updated hubs and navigation links to include active migration artifacts.
7. Added sprint execution pack with 3-agent parallel partitioning:
   - `04-sprint-workflow/sprints/sprint-0-baseline-scope-freeze.md`
   - `04-sprint-workflow/sprints/sprint-1-oss-detox.md`
   - `04-sprint-workflow/sprints/sprint-2-tauri2-bootstrap.md`
8. Added per-sprint `agent-*.scope.md` and `agent-*.exclude` files for conflict-free parallel execution.
9. Regenerated `00-navigation/inventory.json` to include all current markdown artifacts.
10. Refactored sprint partitioning to Long Slice v2:

- Added `04-sprint-workflow/sprints/partitioning-v2.md`.
- Added `ownership-map.md` and `interface-lock.md` for Sprint 1 and Sprint 2.
- Reworked Sprint 1/2 scope and exclude boundaries to reduce cross-slice coupling.

11. Closed Sprint 0 (`Baseline and Scope Freeze`) with all gates passed:

- `G0.1` matrix/catalog sync fixed.
- `G0.2` proprietary surface freeze passed.
- `G0.3` risk governance freeze passed.
- `G0.4` parallel partition freeze passed.
- `G0.5` baseline/removal cross-check passed.

12. Added hard sprint/slice governance rules:

- `04-sprint-workflow/sprints/sprint-slicing-rules.md`.
- No docs-only slices.
- Orchestrator updates docs after accepting slice outputs (default Agent 1).
- Tests execute only once after full sprint completion.

13. Synced Sprint 1/2 ownership and scope docs with new rules.
14. Finalized Sprint 1 orchestration state:

- All three slices delivered and committed (`f430940`, `d8a8696`, `3acfcc0`).
- OSS availability policy lock applied (`d35614a`): Agent/Ask/Plan are `temporarily unavailable in OSS`.
- Added `04-sprint-workflow/sprints/sprint-1/phase-gates.md`.
- Sprint 1 moved to validation queue with state `IMPLEMENTATION COMPLETE / VALIDATION DEFERRED`.

## 2026-03-01

1. Updated the global migration roadmap to explicitly defer UI redesign to a post-migration track.
2. Locked redesign scope as cosmetic-first by default, outside the functional parity critical path.
3. Synced sprint hub and validation notes so future planning does not mix redesign work into `Sprint 3-11`.
4. Added a dedicated strict spec for the redesign reservation:
   - `04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md`.
5. Added an agent working-notes layer for continuity and handoff:
   - `notes/README.md`
   - `notes/2026-03-01-migration-state.md`
   - `02-guides/working-notes.md`
6. Updated `AGENTS.md` and docs governance to make `notes/` required for substantial continuity-worthy work and explicit for resume/replacement flow.
7. Synced navigation and template artifacts so the notes workflow is part of the documented Pack 2.0 operating model.
8. Synced the migration docs to the actual implementation checkpoint:
   - `Sprint 3` through `Sprint 10` are now marked as completed in sprint artifacts.
   - `Sprint 11` is the only remaining planned migration sprint.
9. Recorded the executed migration checkpoint in the master plan:
   - `Sprint 3-8` completed the Tauri runtime and harness migration line.
   - `Sprint 9-10` completed the current Leptos route-shell cut-in for low-risk and core routes.
10. Captured post-Sprint-10 stabilization evidence:

- `npm run ts` passed.
- `npm run build` passed.
- `npx vitest run src/__tests__/tauri_leptos_shell_bridge.test.ts` passed.
- `tauri-smoke` passed with `4` tests.
- Selected `electron-regression` passed with `5` tests and `1` skipped case.

11. Updated the working-notes resume point from "Sprint 10 next" to "Sprint 11 next" after the successful migration checkpoint.
12. Marked `Sprint 2` as a reconciliation item in the sprint hub because the older bootstrap planning pack no longer matches the executed sprint timeline.
13. Updated the migration governance to reflect the actual delivery strategy:

- final parity is required at milestone acceptance and final cutover, not at every intermediate state;
- temporary breakage is acceptable inside an active migration slice;
- in-app preview is explicitly part of the target `Tauri + Leptos` architecture.

14. Started `Sprint 11` execution for real and replaced the earlier one-shot cutover assumption with a readiness-wave approach.
15. Recorded the first `Sprint 11` runtime wave:

- Tauri app runtime commands for preview-critical app execution flows
- Tauri `app:output` event path
- renderer-side app runtime metadata registry

16. Added local Rust toolchain validation to the migration evidence set:

- `cargo check` now passes in `src-tauri`.

17. Recorded the second `Sprint 11` runtime wave:

- Tauri preview proxy bootstrap now reuses the existing Node injection worker through a CLI wrapper
- Tauri `check-problems` now reuses the bundled TypeScript worker through a CLI runner
- Tauri resource packaging now explicitly includes preview/proxy/problem-check runtime assets

18. Locked the future Leptos UI primitive strategy:

- use a shadcn-like primitive model for migration continuity,
- keep a Chaemera-owned wrapper layer in front of any upstream Leptos UI kit,
- keep redesign concerns out of the first wrapper pass.

19. Added a tracked repository scaffold for future Leptos wrappers:

- `src-tauri/leptos-ui/README.md`
- `src-tauri/leptos-ui/components.manifest.json`
- `src-tauri/leptos-ui/primitives/README.md`

20. Added a dedicated discussion record for the Leptos UI baseline:

- `05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md`.

21. Added an open issue record for the remaining help-bot decision:

- `05-discussion-templates/discussions/2026-03-01-help-bot-oss-equivalent-issue.md`.

22. Added a dedicated planned sprint for the token/context accounting port:

- `04-sprint-workflow/sprints/sprint-12-chat-count-tokens-context-port.md`.

23. Explicitly recorded that `chat:count-tokens` should be treated as a large context-accounting migration sprint rather than a small bridge patch.
24. Added a dedicated integrations reference guide:

- `02-guides/integrations-reference.md`.

25. Documented the current native integration model for GitHub, Supabase, Neon, Vercel, language-model providers, and MCP.
26. Explicitly captured the architectural comparison rule:

- native integrations are stronger when the app must own state and workflow,
- MCP is stronger when the capability should remain generic and replaceable.

27. Recorded an implementation nuance in the MCP layer:

- the schema currently exposes `sse`,
- the runtime manager currently only implements `stdio` and `http`.

28. Added a discussion record for upstream patch adaptation instead of direct sync:

- `05-discussion-templates/discussions/2026-03-01-upstream-patch-adaptation-workflow.md`.

29. Captured the recommended intake model for future upstream Dyad changes:

- range-based review,
- domain classification,
- `PORT / REINTERPRET / DEFER / REJECT` statuses,
- `P0 / P1 / P2 / R` priority model.

30. Captured a recommended automation sketch for upstream tracking:

- add explicit `upstream` remote,
- store last-reviewed commit checkpoint,
- generate markdown/json adaptation logs from upstream ranges,
- pre-label likely reject candidates such as pro or branded surfaces.

31. Added a discussion record preserving the exact reasoning about the next two migration directions:

- `05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md`.

32. The new discussion explicitly distinguishes:

- full Tauri release cutover as an infrastructure/delivery step,
- milestone-level regression beyond `tauri-smoke` as the safer prerequisite.

33. Added a new architecture discussion for migration layer boundaries:

- `05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`.

34. The new discussion explicitly records the pragmatic split:

- Electron removal is a stronger priority than eliminating TypeScript,
- Rust owns native/runtime responsibilities,
- Leptos owns the target UI,
- TypeScript remains acceptable where it does not block the cutover.

35. Expanded the TS/Rust/Leptos layer-boundaries discussion with a practical performance and footprint section:

- what Tauri is expected to improve,
- what Leptos is expected to improve,
- what areas are unlikely to improve materially from the stack cutover alone,
- what must still be measured after the first comparable full Tauri release build.

36. Explicitly locked exact size and RAM deltas as `UNKNOWN` until a real apples-to-apples Tauri package baseline exists.

## 2026-03-02

1. Added a dedicated next-phase product roadmap covering the three-track direction after the current migration checkpoint:
   - OSS product completion and platform detachment,
   - context-system rethink,
   - minimal Chaemera identity redesign.
2. Locked the sequencing rule that UI styling is not the next priority after migration; the context operating model comes first.
3. Promoted the context-model concern from ad hoc discussion into a roadmap-level governance artifact tied to concrete code evidence in token counting, codebase extraction, and current context UX.

## 2026-03-13

1. Added a dated resume checkpoint note for the current branch state:
   - `notes/2026-03-13-tauri-cutover-checkpoint.md`.
2. Updated the canonical migration and roadmap docs to lock the current release strategy as:
   - production-ready `Tauri 2` first,
   - current `TypeScript + shadcn` UI is acceptable for the release line,
   - broader `Leptos` migration is deferred to a later separate stage.
3. Explicitly promoted the clarified product direction into the docs:
   - remove remaining Electron dependency,
   - remove Dyad commercial logic from the current release,
   - remove first-order Dyad identity debt from the current release,
   - continue product and UI hardening on the current stack before revisiting Leptos.

## 2026-03-26

1. Added a canonical governance spec for separating `BYOK Agent` capability from future hosted access and quota policy:
   - `docs-new/04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md`.
2. Locked the current product decision that hosted or freemium-shaped legacy behavior should be disabled in active Chaemera UX while entitlement and quota plumbing remain documented as dormant foundation for future optional subscriptions.
3. Added a structured short-form decision note for this accepted direction:
   - `notes/Decisions/2026-03-26-agent-access-foundation-decision.md`.
4. Added a reusable decision-note template for future repository decisions:
   - `notes/Decisions/decision-template.md`.
5. Updated `notes/README.md`, `00-navigation/INDEX.md`, `00-navigation/inventory.json`, and `00-navigation/validation.md` to include the new decision record workflow and canonical spec.

## 2026-03-28

1. Added a code-audit discussion artifact capturing the current AI runtime state:
   - `05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md`.
2. Synced the discussion hub and navigation index to include the new runtime-state discussion.
3. Captured the current split between live build-mode execution, stubbed local-agent routing, and special-case AI flows.
4. Added an architecture discussion artifact for the proposed future AI direction:
   - `05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md`.
5. Captured the proposed split between:
   - structured agent core as the default runtime,
   - legacy XML expert mode as an opt-in path,
   - and a separate batch-execution layer rather than XML as the primary control plane.
6. Added a code-audit discussion artifact that localizes the current legacy XML runtime so it can be isolated from the future default agent path:
   - `05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md`.
7. Added a code-audit discussion artifact using `C:\Work\codex-main` as the structured-agent reference and transfer baseline:
   - `05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md`.
8. Synced the discussion hub, navigation index, inventory, and validation docs to include the new XML extraction and Codex transfer discussions.
9. Added a canonical post-release architecture spec for the future agent layer:
   - `04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`.
10. Explicitly locked that the new agent daemon, structured protocol, terminal runtime, and host-daemon split are `NOT MVP SCOPE`:
    - the current release line remains `Tauri 2` cutover plus `OSS-first` and `BYOK-first` product posture with minimal functional expansion.
11. Promoted the accepted host/daemon architecture into repo-governed docs:
    - `Chaemera Desktop Host`
    - `Agent Core Daemon`
    - `Host Capability Gateway`
    - `Legacy XML Executor`
    - `Session Event Model`
12. Locked the future boundary rules that:
    - session truth belongs to the core,
    - `AppEnvironment` is the canonical execution context,
    - XML is legacy or expert mode only,
    - and the desktop must not integrate against Codex CLI-shaped UX behavior.
13. Synced navigation, inventory, progress, and validation docs to include the new canonical post-release agent architecture spec.
14. Added a canonical strict spec for the final release-line Tauri cutover slice:
    - `04-sprint-workflow/specs/2026-03-28-final-tauri-host-capability-cutover.md`.
15. Locked the remaining `Sprint 11` work to a `host-capability boundary` approach instead of blind file-by-file Electron cleanup.
16. Captured the ordered migration plan for the remaining runtime Electron surface:
    - dialogs and app-host leaves,
    - shell and reveal behavior,
    - session clearing,
    - screenshot and debug-window behavior,
    - GitHub flow affinity,
    - and only then the old invoke and stream registration spine.
17. Synced navigation, inventory, progress, and validation docs to include the new final-cutover spec.
18. Added a canonical strict spec for the future Rust logging backend:

- `04-sprint-workflow/specs/2026-03-28-rust-logging-backend-contract-and-migration-plan.md`.

19. Added a canonical orientational roadmap for the first production MVP release:

- `04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`.

20. Locked the current production release scope to:

- final Tauri validation and desktop runtime gating,
- Tauri parity debts around secrets and environment behavior,
- Dyad-hosted and premium-shaped detachment,
- first-order branding cleanup,
- and final release acceptance work.

21. Explicitly kept post-release agent architecture and logging-backend replacement outside the immediate release critical path unless they become true ship blockers.
22. Synced navigation, inventory, progress, and validation docs to include the new production MVP roadmap spec.
23. Added a canonical hosted-paywall inventory and archive policy spec that:

- classifies the current hosted-paywall, premium UI, hosted-service, branding, and test surfaces;
- keeps the future optional subscription reference material in a local-only archive outside the public release tree;
- and explicitly separates public BYOK-first product behavior from archival subscription scaffolding.

## Deferred

1. Migrate existing `docs/` canonical content into `docs-new` references and architecture docs.
2. Add automation for inventory regeneration.

## Evidence

- path: `docs/architecture.md`
  symbol: `Current architecture document`
  lines: 1-220
- path: `docs/agent_architecture.md`
  symbol: `Agent architecture notes`
  lines: 1-220
- path: `docs-new/05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  symbol: `Migration strategy discussion`
  lines: 1-260
- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Migration strict spec`
  lines: 1-340
- path: `docs-new/04-sprint-workflow/sprints/README.md`
  symbol: `Parallel sprint partition rules`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Phase 7 post-migration UI redesign track`
  lines: 1-380
- path: `docs-new/04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md`
  symbol: `Dedicated redesign governance spec`
  lines: 1-260
- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `2026-03-01 migration checkpoint`
  lines: 1-420
- path: `docs-new/05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  symbol: `Parity timing and preview position`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md`
  symbol: `Sprint 11 active state and first runtime wave`
  lines: 1-220
- path: `docs-new/02-guides/integrations-reference.md`
  symbol: `Integration landscape and native vs MCP comparison`
  lines: 1-320
- path: `docs-new/05-discussion-templates/discussions/2026-03-01-upstream-patch-adaptation-workflow.md`
  symbol: `Upstream patch adaptation workflow`
  lines: 1-320
- path: `docs-new/05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md`
  symbol: `Tauri release cutover vs regression discussion`
  lines: 1-220
- path: `docs-new/05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`
  symbol: `TypeScript, Rust, and Leptos layer boundaries discussion`
  lines: 1-340
- path: `docs-new/05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md`
  symbol: `Wrapper-first Leptos UI decision`
  lines: 1-220
- path: `src-tauri/leptos-ui/components.manifest.json`
  symbol: `Planned Leptos wrapper inventory`
  lines: 1-260
- path: `notes/2026-03-01-leptos-ui-foundation.md`
  symbol: `Tracked Leptos UI foundation note`
  lines: 1-220
- path: `notes/2026-03-01-migration-state.md`
  symbol: `Sprint 11 audit and wave-f resume state`
  lines: 1-220
- path: `AGENTS.md`
  symbol: `Documentation governance and working notes rules`
  lines: 104-132
- path: `notes/README.md`
  symbol: `Agent Working Notes`
  lines: 1-80
- path: `notes/2026-03-01-migration-state.md`
  symbol: `Current resume point after Sprint 10 validation`
  lines: 1-120
- path: `docs-new/02-guides/working-notes.md`
  symbol: `Agent Working Notes Guide`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-10-leptos-core-workspace-cutover.md`
  symbol: `Sprint 10 completion and validation snapshot`
  lines: 1-120
- path: `docs-new/04-sprint-workflow/sprints/README.md`
  symbol: `Sprint hub status through Sprint 10`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-1/agent-1.exclude`
  symbol: `Agent partition deny-list sample`
  lines: 1-120
- path: `docs-new/04-sprint-workflow/sprints/partitioning-v2.md`
  symbol: `Long Slice v2 rules`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-1/ownership-map.md`
  symbol: `Sprint 1 ownership map`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-0/phase-gates.md`
  symbol: `Sprint 0 gate status and closure verdict`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-0-baseline-scope-freeze.md`
  symbol: `Sprint 0 completion summary`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/sprints/sprint-slicing-rules.md`
  symbol: `Hard requirements for sprint slicing`
  lines: 1-220
- path: `docs-new/04-sprint-workflow/runbook.md`
  symbol: `Sprint execution sequence with full-sprint test stage`
  lines: 1-220

- path: `docs-new/04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Three-track next-phase roadmap`
  lines: 1-260
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`
  symbol: `Canonical post-release agent architecture boundary`
  lines: 1-420
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-rust-logging-backend-contract-and-migration-plan.md`
  symbol: `Canonical Rust logging backend replacement contract and migration plan`
  lines: 1-260
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  symbol: `Canonical production MVP release roadmap`
  lines: 1-320
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Resume checkpoint and strategy update`
  lines: 1-200

## Links

- [[INDEX.md]]
- [[validation.md]]
