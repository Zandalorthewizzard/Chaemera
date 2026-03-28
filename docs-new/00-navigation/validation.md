---
id: chaemera-nav-validation
title: Chaemera Validation Report
type: utility
status: active
tags: [validation, evidence]
related: [[INDEX.md], [progress.md]]
depends_on: []
generated: false
source_of_truth: mixed
outline: []
---

# Validation Report

## Summary

Pack 2.0 baseline is initialized in `docs-new` for Chaemera.

## Verified Claims

1. Layered docs structure exists (`00..06`).
2. Strict spec template is available for implementation tasks.
3. Discussion-first workflow and blind-zone handling templates are present.
4. Migration strategy discussion is captured as a standalone discussion artifact.
5. Leptos + Tauri 2 migration master plan is captured as a strict spec artifact.
6. Sprint 0/1/2 execution packs are authored with explicit 3-agent partitioning.
7. Per-agent exclude manifests are defined for conflict avoidance.
8. Long Slice v2 partitioning rules are documented and applied to Sprint 1/2.
9. Sprint 1/2 now include ownership maps and interface locks for autonomous parallel work.
10. Sprint 0 closure criteria are fully met and all `G0.*` gates are in `pass` state.
11. Hard sprint/slice rules are documented and applied:

- long slices only,
- parallel non-conflicting execution,
- no docs-only slices,
- docs by orchestrator after slice acceptance,
- tests run only after full sprint completion.

12. Sprint 1 implementation is complete and queued for full-sprint validation:

- Agent 1/2/3 slices are merged by commit history.
- OSS policy lock for Agent/Ask/Plan is explicit (`temporarily unavailable in OSS`).
- Full-sprint acceptance execution is intentionally deferred by user directive.

13. The global roadmap explicitly reserves UI redesign as a post-migration track:

- redesign is not part of the parity-critical migration path,
- default scope is cosmetic-first,
- functional changes require separate explicit scoping.

14. A dedicated redesign governance spec now exists for post-migration planning and guardrails.
15. A working-notes layer now exists for agent continuity, handoff, and crash/context recovery.
16. Working notes are explicitly governed as non-canonical and must be promoted into evidence-backed docs when findings become durable.
17. `Sprint 3` through `Sprint 8` are implemented and no longer merely planned:

- Tauri runtime bridge waves A-E are in the codebase.
- Tauri smoke harness and dual launcher path are present.

18. `Sprint 9` and `Sprint 10` established a live Leptos route-shell cut-in:

- low-risk routes already render through the Leptos shell path,
- core routes (`home`, `chat`, `app-details`) now also have a Leptos implementation path.

19. The current migration checkpoint is validated beyond static docs:

- `npm run ts` passed,
- `npm run build` passed,
- targeted Leptos shell unit coverage passed,
- `tauri-smoke` passed,
- a selected Electron regression subset passed.

20. `Sprint 11` is now the only remaining planned migration sprint in the active roadmap.
21. The sprint hub explicitly records that `Sprint 2` is a reconciliation item because the older bootstrap planning pack no longer matches the executed sprint timeline.
22. The migration spec now explicitly states that full parity is required at milestone/final-cutover states, not at every intermediate work-in-progress state.
23. The migration spec and strategy discussion now explicitly include the in-app preview surface as part of the target `Tauri + Leptos` product architecture.
24. `Sprint 11` is now active and no longer just a future placeholder.
25. The first `Sprint 11` runtime wave is implemented:

- Tauri app runtime commands exist for `run-app`, `stop-app`, `restart-app`, `respond-to-app-input`, and `edit-app-file`
- Tauri `app:output` event support exists
- Tauri support exists for `add-log`, `clear-logs`, and `open-external-url`

26. The Tauri workspace now compiles locally under `cargo check`, which means the Rust side is no longer only assumed-valid from static editing.
27. The second `Sprint 11` runtime wave is implemented:

- Tauri preview proxy startup now routes through a Node wrapper around `worker/proxy_server.js`
- Tauri `check-problems` now routes through a Node wrapper around the bundled `tsc_worker.js`
- Tauri packaging now explicitly lists the runtime assets needed for the proxy/injection/problem-check path

28. The Leptos UI migration baseline is now explicitly locked to a wrapper-first primitive model instead of direct vendor imports.
29. A tracked repository scaffold exists for future Leptos primitives in `src-tauri/leptos-ui/`.
30. The remaining help-bot surface is now tracked as an explicit open issue instead of an unclassified migration leftover.
31. A dedicated high-level sprint now exists for `chat:count-tokens` and context-accounting migration so that this dependency-heavy path is not hidden inside generic runtime waves.
32. A dedicated integrations reference now exists and distinguishes:

- native app-linked integrations,
- model-provider integrations,
- MCP as the generic extension layer.

33. The integrations reference documents evidence-backed native capabilities for GitHub, Supabase, Neon, Vercel, language-model providers, and MCP.
34. The current MCP transport gap is explicitly documented:

- contract schema includes `sse`,
- runtime manager currently implements `stdio` and `http`.

35. A dedicated discussion now exists for upstream Dyad patch adaptation after stack divergence from the original project.
36. That discussion records an explicit recommended intake model:

- review upstream by commit range,
- classify changes by domain,
- route items into `PORT / REINTERPRET / DEFER / REJECT`,
- and prioritize selected items with `P0 / P1 / P2`.

37. The upstream adaptation discussion also records a proposed automation path:

- add `upstream` remote,
- checkpoint last-reviewed commit,
- generate machine-readable and human-readable logs,
- pre-label likely reject candidates such as pro or branded surfaces.

38. A dedicated discussion now preserves the exact reasoning about the next migration fork in the road:

- milestone-level regression beyond `tauri-smoke`,
- versus full Tauri release cutover.

39. That discussion explicitly records the current recommendation order:

- run a targeted wider regression first,
- then replace the legacy Electron release path with a Tauri-first release path.

40. A dedicated architecture discussion now exists for layer ownership during the migration.
41. That discussion explicitly records the current operating split:

- remove Electron as the required foundation,
- move native/runtime duties to Rust and Tauri,
- keep pragmatic TS where it does not block the current cutover,
- and treat any broader Leptos migration as a later separate stage rather than the current release gate.

42. The layer-boundaries discussion now includes an explicit practical performance frame:

- what Tauri is expected to improve,
- what Leptos is expected to improve,
- what surfaces are unlikely to improve much from the shell swap alone,
- and which measurements are still required before quoting exact gains.

43. Exact packaged-size and RAM deltas are now explicitly recorded as `UNKNOWN` until a comparable full Tauri release build exists.

44. A dedicated next-phase product roadmap now exists for the post-checkpoint direction of Chaemera.
45. That roadmap explicitly locks the next three tracks in order:

- production-ready Tauri 2 cutover and OSS/product detachment,
- product, context, and UI hardening on the current TypeScript/shadcn baseline,
- later Leptos evaluation only as a separate stage.

46. The roadmap now records the context-model problem as a first-order product issue rather than a cosmetic or incidental cleanup item.
47. Canonical docs now explicitly lock the current release strategy to:

- ship Tauri 2 first,
- keep the current TypeScript/shadcn UI where it preserves parity and reduces risk,
- remove Dyad commercial logic and first-order identity debt in the current production version,
- defer broader Leptos migration to a later separate stage.

48. A canonical governance spec now exists for separating `BYOK Agent` capability from future hosted access and quota policy.
49. That spec explicitly locks the current product stance:

- disable active hosted or freemium-shaped legacy behavior in the current Chaemera release line,
- preserve quota and entitlement plumbing only as dormant future foundation,
- and avoid coupling future optional subscriptions to the baseline `BYOK Agent` path.

50. A structured short-form decision workflow now exists in `notes/Decisions/` with a reusable template and a linked operational snapshot for the accepted agent-access decision.
51. A code-audit discussion artifact now captures the current AI runtime split:

- build mode is the live execution path,
- local-agent/ask/plan are routed but stubbed in OSS,
- special-case AI flows such as security review, summarization, and plan persistence remain separate from the general runtime path.

52. An active discussion artifact now captures a candidate future AI architecture direction:

- structured agent core as the default runtime,
- legacy XML retained only as an expert-facing or compatibility path,
- and high-fanout batch application treated as a separate execution layer rather than proof that XML should remain the primary control plane.

53. A dedicated code-audit discussion now localizes the current legacy XML runtime and defines the extraction boundary between:

- live XML build behavior,
- XML-specific recovery loops,
- and the dormant local-agent scaffold that should not be confused with the live runtime.

54. A dedicated code-audit discussion now captures a Codex-like transfer baseline for the future structured core:

- tool registry and model-visible specs,
- approval and sandbox orchestration,
- shell and patch runtimes,
- prompt layering with `AGENTS.md` and skills,
- and Chaemera-specific adaptations for app-root workspaces and real terminal support.

55. A canonical post-release architecture spec now exists for the future agent layer.
56. That spec explicitly locks that the new agent daemon, structured protocol, terminal runtime, and host-daemon split are not part of the current MVP or release scope.
57. The current release line remains the already accepted combination of:

- `Tauri 2` cutover,
- `OSS-first` posture,
- `BYOK-first` agent access,
- and only the minimum functionality work required to ship that line.

58. The post-release architecture now formally records:

- `Chaemera Desktop Host`,
- `Agent Core Daemon`,
- `Host Capability Gateway`,
- `Legacy XML Executor`,
- and a core-owned session event model.

59. The post-release architecture also formally locks that:

- session truth belongs to the core,
- `AppEnvironment` is the canonical execution context instead of plain `cwd`,
- host capabilities must be tool-addressable through a gateway,
- XML survives only as a legacy or expert path,
- and the desktop must not integrate against Codex CLI-shaped UX semantics.

60. A dedicated strict spec now exists for the final current-release Tauri cutover slice after the low-risk Electron cleanup.
61. That spec explicitly locks the correct execution model for the remaining work:

- treat the last Electron runtime imports as host-capability families,
- migrate leaf host capabilities before transport-core files,
- use the Electron audit as a gate rather than the implementation strategy,
- and keep post-release agent work out of this release-critical slice.

62. A dedicated strict spec now exists for the future Rust logging backend:

- it preserves the `src/lib/app_logger.ts` adapter contract,
- it replaces the backend implementation with a Rust/Tauri-native subsystem,
- it keeps support/debug bundle log tails intact,
- and it keeps preview console state and version history separate from diagnostics logging.

63. A dedicated strict spec now exists for the first production MVP release roadmap.
64. That roadmap explicitly locks the current release-critical scope to:

- final Tauri validation and real desktop runtime gating,
- Tauri parity debts around secret storage and environment behavior,
- Dyad-hosted and premium-shaped dependency detachment,
- first-order Dyad branding cleanup in shipped surfaces,
- and release acceptance plus packaging readiness.

65. The same roadmap explicitly records that post-release agent work and logging-backend replacement are not part of the first production MVP unless they become direct ship blockers.

## Open / Deferred

1. Full migration of prior docs from `docs/` is pending.
2. Cross-link lint automation is pending.
3. Phase-level acceptance matrix still needs to be expanded from `e2e-tests`.
4. `Sprint 11` final cutover and Electron/Forge cleanup are still open.
5. Snapshot line-ending noise remains in:
   - `src/__tests__/__snapshots__/local_agent_prompt.test.ts.snap`
   - `src/__tests__/__snapshots__/problem_prompt.test.ts.snap`
6. Electron E2E cleanup still produces noisy Windows `taskkill` warnings even when the suite passes.
7. Electron/Forge release and CI artifacts are still the primary delivery path and remain to be migrated.
8. The preview proxy and `check-problems` now have a migrated Tauri path, but native runtime validation of that path is still pending.
9. Any future Leptos stage, including the upstream UI library choice, remains intentionally deferred; only the wrapper-first integration rule is locked.
10. Exact parity against any specific third-party MCP server remains `UNKNOWN` unless that external server is audited separately.
11. Upstream patch adaptation workflow is still a discussion artifact and not yet an implemented automation system.
12. The hosted-entitlement disable and neutral-rename implementation described in the new agent-access spec is still pending; current code still contains legacy `Dyad Pro` and quota remnants until that implementation lands.
13. The new structured-agent direction now has a canonical post-release architecture spec, but implementation remains deferred until after the current release line ships.
14. Dedicated follow-up specs for protocol, session persistence, terminal behavior, and capability gateway semantics are still pending before post-release implementation begins.
15. `electron-log` neutralization is still outside the scope of the final host-capability cutover spec and remains a separate follow-up concern.
16. The new production MVP roadmap is governance-complete, but its implementation tasks remain open until the release-line work is actually executed and verified.

## Evidence

- path: `03-templates/strict-spec.template.md`
  symbol: `Mandatory sections`
  lines: 1-220
- path: `05-discussion-templates/issue-template.md`
  symbol: `Issue template`
  lines: 1-220
- path: `05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  symbol: `Strategy decision`
  lines: 1-260
- path: `04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Implementation phases and gates`
  lines: 1-380
- path: `04-sprint-workflow/sprints/README.md`
  symbol: `Post-Migration Track`
  lines: 1-220
- path: `04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md`
  symbol: `Redesign scope, gates, and guardrails`
  lines: 1-260
- path: `04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Migration phases and 2026-03-01 checkpoint`
  lines: 1-420
- path: `05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  symbol: `Preview position and parity timing`
  lines: 1-220
- path: `../src-tauri/src/wave_f_domains.rs`
  symbol: `Sprint 11 preview-critical runtime wave`
  lines: 1-400
- path: `../src/ipc/runtime/app_path_registry.ts`
  symbol: `Renderer-side runtime metadata registry`
  lines: 1-220
- path: `../src/ipc/runtime/core_domain_channels.ts`
  symbol: `Expanded Tauri invoke and event coverage`
  lines: 1-220
- path: `../src/__tests__/tauri_wave_f_bridge.test.ts`
  symbol: `Wave F bridge coverage`
  lines: 1-220
- path: `../AGENTS.md`
  symbol: `Required reading chain and working-notes rules`
  lines: 104-132
- path: `../notes/README.md`
  symbol: `Notes rules and resume flow`
  lines: 1-80
- path: `../notes/2026-03-01-migration-state.md`
  symbol: `Resume point after Sprint 10`
  lines: 1-120
- path: `02-guides/working-notes.md`
  symbol: `Working-notes governance and promotion rule`
  lines: 1-220
- path: `../src-tauri/src/lib.rs`
  symbol: `Registered Tauri migration waves`
  lines: 1-260
- path: `../src-tauri/leptos-ui/README.md`
  symbol: `Leptos UI wrapper layer policy`
  lines: 1-160
- path: `../src-tauri/leptos-ui/components.manifest.json`
  symbol: `Leptos wrapper backlog and priority buckets`
  lines: 1-260
- path: `05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md`
  symbol: `Wrapper-first Leptos UI baseline discussion`
  lines: 1-220
- path: `../src-tauri/src/leptos_shell.rs`
  symbol: `Leptos route shell coverage for low-risk and core routes`
  lines: 1-260
- path: `02-guides/integrations-reference.md`
  symbol: `Integrations reference and native vs MCP comparison`
  lines: 1-320
- path: `05-discussion-templates/discussions/2026-03-01-upstream-patch-adaptation-workflow.md`
  symbol: `Upstream patch adaptation workflow`
  lines: 1-320
- path: `05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md`
  symbol: `Tauri release cutover vs regression discussion`
  lines: 1-220
- path: `05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`
  symbol: `TypeScript, Rust, and Leptos layer boundaries discussion`
  lines: 1-340
- path: `04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md`
  symbol: `Accepted BYOK-first agent access decision and staged detachment plan`
  lines: 1-240
- path: `04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`
  symbol: `Canonical post-release agent architecture boundary and MVP exclusion`
  lines: 1-420
- path: `04-sprint-workflow/specs/2026-03-28-final-tauri-host-capability-cutover.md`
  symbol: `Canonical final host-capability cutover plan`
  lines: 1-320
- path: `04-sprint-workflow/specs/2026-03-28-rust-logging-backend-contract-and-migration-plan.md`
  symbol: `Canonical Rust logging backend replacement contract and migration plan`
  lines: 1-260
- path: `04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  symbol: `Canonical production MVP release roadmap`
  lines: 1-320
- path: `../scripts/audit-electron-legacy-surface.js`
  symbol: `Electron legacy surface audit summary`
  lines: 159-175
- path: `../src/ipc/runtime/core_domain_channels.ts`
  symbol: `Existing Tauri mappings for remaining host capabilities`
  lines: 47-178
- path: `../notes/README.md`
  symbol: `Structured Decision Notes`
  lines: 1-80
- path: `../notes/Decisions/2026-03-26-agent-access-foundation-decision.md`
  symbol: `Operational decision snapshot`
  lines: 1-80
- path: `../notes/Decisions/decision-template.md`
  symbol: `Decision note template`
  lines: 1-80
- path: `05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md`
  symbol: `Current AI Runtime State discussion`
  lines: 1-120
- path: `05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md`
  symbol: `Future AI architecture discussion`
  lines: 1-160
- path: `../src/ipc/types/mcp.ts`
  symbol: `MCP contracts and declared transport surface`
  lines: 10-194
- path: `../src/ipc/utils/mcp_manager.ts`
  symbol: `Implemented MCP transport construction`
  lines: 16-49
- path: `../src/routes/home.tsx`
  symbol: `Home route wrapped in LeptosRouteHost`
  lines: 1-120
- path: `../src/routes/chat.tsx`
  symbol: `Chat route wrapped in LeptosRouteHost`
  lines: 1-120
- path: `../src/routes/app-details.tsx`
  symbol: `App details route wrapped in LeptosRouteHost`
  lines: 1-160
- path: `../e2e-tests/tauri-smoke.spec.ts`
  symbol: `Tauri smoke validation coverage`
  lines: 1-220
- path: `../playwright.config.ts`
  symbol: `Dual Electron and Tauri Playwright projects`
  lines: 1-220
- path: `04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Three-track next-phase roadmap`
  lines: 1-260
- path: `../src/ipc/handlers/token_count_handlers.ts`
  symbol: `Current token-count and codebase extraction path`
  lines: 1-220
- path: `../src/utils/codebase.ts`
  symbol: `Current codebase extraction model`
  lines: 1-260
- path: `../src/components/ContextFilesPicker.tsx`
  symbol: `Current whole-codebase-first context UX`
  lines: 1-260
- path: `../package.json`
  symbol: `Electron harness and Tauri smoke build scripts`
  lines: 1-220
- path: `../src-tauri/Cargo.toml`
  symbol: `Tauri 2 runtime crate`
  lines: 1-120
- path: `../src/components/preview_panel/PreviewIframe.tsx`
  symbol: `Preview and browser-heavy compatibility logic`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-0-baseline-scope-freeze.md`
  symbol: `Sprint 0 baseline freeze`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-1-oss-detox.md`
  symbol: `Sprint 1 OSS detox`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-2-tauri2-bootstrap.md`
  symbol: `Sprint 2 Tauri bootstrap`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-1/agent-2.exclude`
  symbol: `Agent partition deny-list`
  lines: 1-120
- path: `04-sprint-workflow/sprints/partitioning-v2.md`
  symbol: `Long Slice v2`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-2/interface-lock.md`
  symbol: `Sprint 2 contract lock`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-0/phase-gates.md`
  symbol: `G0 gate pass status and closure verdict`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-0/baseline-feature-catalog.md`
  symbol: `Post-fix matrix/catalog sync`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-slicing-rules.md`
  symbol: `Hard sprint/slice requirements`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-1/ownership-map.md`
  symbol: `No docs-only slice ownership`
  lines: 1-220
- path: `04-sprint-workflow/sprints/sprint-1/phase-gates.md`
  symbol: `Sprint 1 gate status`
  lines: 1-240
- path: `04-sprint-workflow/sprints/sprint-10-leptos-core-workspace-cutover.md`
  symbol: `Sprint 10 completion and validation snapshot`
  lines: 1-120
- path: `04-sprint-workflow/sprints/README.md`
  symbol: `Sprint hub status, completion, and reconciliation queue`
  lines: 1-220
- path: `04-sprint-workflow/runbook.md`
  symbol: `Full-sprint test execution sequence`
  lines: 1-220
- path: `../notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Resume checkpoint and current release strategy`
  lines: 1-200

## Links

- [[INDEX.md]]
- [[progress.md]]
