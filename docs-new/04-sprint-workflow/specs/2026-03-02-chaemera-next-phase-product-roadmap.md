---
id: chaemera-spec-next-phase-product-roadmap-2026-03-02
title: Chaemera Next-Phase Product Roadmap
type: spec
status: active
tags: [spec, roadmap, product, oss, context, redesign, tauri, leptos]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [2026-02-23-tauri2-leptos-migration-master-plan.md],
    [2026-03-01-post-migration-ui-redesign-track.md],
    [
      ../../05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md,
    ],
    [../../02-guides/integrations-reference.md],
  ]
depends_on:
  [
    [2026-02-23-tauri2-leptos-migration-master-plan.md],
    [
      ../../05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Chaemera Next-Phase Product Roadmap

1. Start Here

- This roadmap defines the next product phase after the current Tauri migration checkpoint.
- It does not replace the migration master plan. It narrows the next product direction into three explicit tracks.
- The tracks are ordered and intentionally not parallelized as equal priorities.
- The sequence is:
  1. production-ready Tauri 2 cutover and OSS/product detachment,
  2. product, context, and UI hardening on the current TypeScript/shadcn baseline,
  3. only then evaluate any later Leptos migration as a separate stage.

2. Intent + Non-goals

- Intent:
  - Turn Chaemera into a compact, OSS-first app-builder with a clear reason to exist beyond being a public Dyad fork.
  - Finish the stack and product detachment work that makes Electron and Dyad-specific monetization logic non-foundational.
  - Remove remaining first-order Dyad aesthetics and identity debt from the current production version rather than treating that as a distant cosmetic-only step.
  - Continue improving context behavior and UI quality on the current TypeScript/shadcn baseline instead of waiting for a framework migration.
  - Treat any broader Leptos migration as a later separate stage that must justify itself after the Tauri 2 version is stable.
- Non-goals:
  - No full product reinvention before the current migration cutover is stable.
  - No styling-first rewrite while the agent context model is still structurally weak.
  - No aggressive recreation of paywalled or manipulative product funnels from the original project.
  - No assumption that every useful future integration must be a hosted premium service.

3. Target Outcome

- Chaemera ships as an OSS-first desktop product on Tauri 2 without Electron.
- Remaining branded or coercive product assumptions from the original Dyad direction are removed, deferred, or replaced with fork-appropriate logic.
- The shipped production UI can remain on the current TypeScript/shadcn baseline while product behavior and shell polish are stabilized.
- The default agent workflow no longer depends on shoving the whole project into context.
- Agents get practical retrieval tools and explicit context controls:
  - file search,
  - targeted file reads,
  - include/exclude and pinning,
  - changed-file and diff-aware context,
  - visible context composition and budget.
- The UI keeps functional continuity but no longer reads as Dyad with renamed package metadata.
- Context improvements and UI hardening can proceed on the current UI baseline.
- Leptos is not the immediate release gate; it is deferred to a later separate decision point.
- Future Chaemera integrations remain possible, but they must be less aggressive than the original monetization pattern and must not hold core capability hostage.

4. Locked Decisions

- The next product roadmap is three-track, not a single mixed cleanup bucket.
- Track order is locked:
  1. production-ready Tauri 2 cutover and OSS/product detachment,
  2. product, context, and UI hardening on the current TypeScript/shadcn baseline,
  3. later Leptos evaluation or migration only if it still has enough payoff.
- The current migration principle remains in force:
  - do not rewrite code merely for purity,
  - move code when it blocks the target product architecture.
- The current production version does not require Leptos.
- The current production version should remove first-order Dyad identity debt and commercial or premium-shaped behavior that does not belong in the OSS fork.
- The existing TypeScript/shadcn UI is acceptable for the current release where it preserves parity and reduces cutover risk.
- The end-state context model should be retrieval-first, not whole-codebase-first.
- Future integrations must be OSS-compatible and opt-in in spirit:
  - no forced upsell path for basic competence,
  - no context hostage strategy,
  - no hard dependency on branded hosted services for core usefulness.
- Broader Leptos work, if it happens at all, must be planned as a separate later stage.

5. Architecture Fit

- Track 1 fits directly on top of the current migration checkpoint:
  - final Electron cleanup,
  - remaining branded/deferred surface triage,
  - OSS-safe integration posture,
  - removal of first-order Dyad identity debt from the current shipped version.
- Track 2 sits on the current production UI and product model:
  - `chat:count-tokens`,
  - `extractCodebase`,
  - context include/exclude flows,
  - proposal and chat context assembly,
  - codebase snapshot assumptions in the current UI,
  - shell polish and incremental UI hardening on the existing TypeScript/shadcn baseline.
- Track 3 is a separate later Leptos stage if the product still needs it after the Tauri 2 version is stable.
- The roadmap therefore builds on the Tauri-first cutover and keeps Leptos as optional later architecture work.

6. External References (optional)

- No external references required.
- Source of truth is local repository behavior plus the accepted migration discussions/specs.

7. Implementation Tasks (ordered)

1. Track 1 - Production-ready Tauri 2 cutover and OSS/product detachment.

- Finish the current Tauri cutover and remaining Electron cleanup.
- Audit all remaining branded, deferred, and paywall-shaped surfaces.
- Keep explicit defer records where a feature remains unresolved but not accepted into core OSS scope.
- Define what counts as an acceptable Chaemera-native integration:
  - useful,
  - optional,
  - OSS-compatible,
  - not coercive.
- Remove or neutralize product assumptions that exist mainly to support premium upsell behavior.
- Remove first-order Dyad naming, tone, and presentation debt that should not ship in the current production fork.

2. Track 2 - Product, context, and UI hardening on the current stack.

- Audit the current context assembly path end to end:
  - token counting,
  - codebase extraction,
  - context file picker,
  - mentioned apps,
  - chat and proposal context composition.
- Replace the current whole-codebase-first default with a retrieval-first operating model.
- Define the minimum toolset the agent should have in-product, modeled after practical coding-agent workflows:
  - list/search files,
  - read targeted files,
  - inspect changed files and diffs,
  - pin or force-include selected files,
  - exclude noisy paths,
  - inspect context composition and token cost.
- Separate fast estimation from exact or higher-confidence recount where appropriate.
- Make context visible and inspectable instead of implicit and magical.
- Improve the current TypeScript/shadcn UI where needed for production quality without waiting for a framework migration.

3. Track 3 - Deferred Leptos stage.

- Re-evaluate whether a broader Leptos migration still has enough product and maintenance payoff after the Tauri 2 version is stable.
- If the answer is yes, author a separate strict spec for that stage.
- Keep the wrapper-first primitive rule if a future Leptos stage begins.
- Do not smuggle Leptos migration work into Track 1 or Track 2.

8. Requirement -> Task -> Test -> Gate

1. Requirement: Chaemera must become meaningfully OSS-first, not merely license-correct.

- Task: finish remaining product detachment from branded, premium, or coercive logic.
- Test: audit unresolved surfaces and verify explicit keep/defer/remove decisions.
- Gate: no ambiguous premium-shaped core surfaces remain unclassified.

2. Requirement: agent usefulness must no longer depend on whole-project context by default.

- Task: redesign context assembly around retrieval and explicit selection.
- Test: token/counting and context-composition validation, plus targeted e2e on context flows.
- Gate: default workflow no longer assumes that the entire codebase must be included to be useful.

3. Requirement: the agent should have practical context tools similar in spirit to modern coding agents.

- Task: add tool-like context controls and retrieval surfaces.
- Test: user can inspect and control what entered context, and the agent can work from targeted retrieval rather than blind full snapshots.
- Gate: context behavior is observable, controllable, and not dependent on a hidden premium mode.

4. Requirement: visual identity must be distinct from Dyad without destabilizing behavior.

- Task: remove first-order Dyad identity debt in the current production line, and defer any broader framework or redesign work until after the Tauri 2 version is stable.
- Test: smoke/regression on affected routes and manual identity review.
- Gate: the product reads as Chaemera, not as lightly renamed Dyad.

9. Acceptance and Tests

- Track 1 acceptance:
  - remaining branded/deferred/product-policy surfaces are inventoried and classified,
  - final Tauri/Electron cutover state is stable enough for product work,
  - no core OSS capability remains coupled to paywall-shaped behavior,
  - the shipped production version no longer presents first-order Dyad identity debt.
- Track 2 acceptance:
  - unit coverage for token/counting and retrieval helpers,
  - targeted e2e for context selection and context inspection flows,
  - explicit validation that the default path is no longer "entire codebase by default" as the primary operating model,
  - production UI improvements land on the current stack without waiting for Leptos.
- Track 3 acceptance:
  - a dedicated Leptos-stage spec exists before implementation begins,
  - route-level smoke exists for any later migrated surfaces,
  - no regression in settings/library/chat basic usability if the later stage proceeds.

10. Promotion Artifacts

- A follow-up strict spec for Track 1 if OSS/product detachment expands beyond Sprint 11 closure.
- A dedicated strict spec for context-system redesign and current-stack UI hardening before large implementation begins.
- A dedicated strict spec for any future Leptos stage before that work begins.
- Progress and validation entries synchronized in `docs-new/00-navigation/` after each accepted roadmap phase.

11. Risks and Rollback

- Risks:
  - over-mixing Tauri cutover with a premature framework migration,
  - trying to solve context quality with one heuristic instead of a proper operating model,
  - replacing one opaque context system with another opaque context system,
  - doing identity or UI cleanup in a way that masks unresolved product-model problems.
- Rollback strategy:
  - keep each roadmap track separately spec'd before implementation,
  - gate context-system work with explicit tests and inspection surfaces,
  - keep current-stack UI work isolated from any future Leptos-stage work,
  - defer unresolved integrations instead of forcing premature product commitments.

12. Agent Guardrails

- Do not collapse the three tracks into one vague cleanup sprint.
- Do not treat UI polish as a substitute for solving the context model.
- Do not reintroduce premium-shaped behavioral restrictions while replacing Dyad logic.
- Do not treat Leptos migration as the default answer for current product work.
- Prefer explicit defer records over silent product drift.
- Keep docs synchronized when roadmap or phase intent changes:
  - `../../00-navigation/INDEX.md`
  - `../../00-navigation/inventory.json`
  - `../../00-navigation/progress.md`
  - `../../00-navigation/validation.md`

## Evidence

- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Current migration target and checkpoint`
  lines: 1-320
- path: `docs-new/04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md`
  symbol: `Cosmetic-first redesign governance`
  lines: 1-220
- path: `docs-new/05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`
  symbol: `Layer boundaries and practical performance expectations`
  lines: 1-340
- path: `docs-new/02-guides/integrations-reference.md`
  symbol: `Native integration model and MCP comparison`
  lines: 1-320
- path: `src/ipc/handlers/token_count_handlers.ts`
  symbol: `Current token counting path and codebase extraction dependency`
  lines: 1-220
- path: `src/utils/codebase.ts`
  symbol: `Current codebase extraction model`
  lines: 1-260
- path: `src/components/ContextFilesPicker.tsx`
  symbol: `Current whole-codebase-first context UX`
  lines: 1-260
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Current release strategy update`
  lines: 1-200

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[2026-03-01-post-migration-ui-redesign-track.md]]
- [[../../05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md]]
- [[../../02-guides/integrations-reference.md]]
