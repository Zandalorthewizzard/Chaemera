---
id: chaemera-spec-post-migration-ui-redesign-track-2026-03-01
title: Post-Migration UI Redesign Track
type: spec
status: active
tags: [spec, ui, redesign, post-migration, leptos, tauri2]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [2026-02-23-tauri2-leptos-migration-master-plan.md],
    [../sprints/README.md],
  ]
depends_on: [[2026-02-23-tauri2-leptos-migration-master-plan.md]]
generated: false
source_of_truth: governance
outline: []
---

# Post-Migration UI Redesign Track

1. Start Here

- This spec reserves a follow-up UI redesign track after the functional `Tauri 2 + Leptos` migration is accepted.
- It is intentionally outside the parity-critical migration path.
- It exists to prevent cosmetic work from leaking into migration sprints `3-11`.

2. Intent + Non-goals

- Intent:
  - Refresh the product visual language after migration stabilization.
  - Improve perceived polish, consistency, and clarity without destabilizing OSS behavior.
  - Give redesign work its own gates, acceptance rules, and rollback boundaries.
- Non-goals:
  - No redesign work before functional migration cutover is stable.
  - No hidden functional rewrites inside "cosmetic" changes.
  - No cross-mixing redesign work with migration-critical runtime work.
  - No loss of OSS feature parity due to visual refactor.

3. Target Outcome

- Chaemera ships on `Tauri 2 + Leptos` first.
- After that cutover, the UI can be refreshed as a separate workstream.
- Default redesign scope is cosmetic-first:
  - typography
  - spacing
  - hierarchy
  - layout polish
  - visual language consistency
  - motion refinement where appropriate
- Any behavior change beyond that requires separate explicit scoping.

4. Locked Decisions

- UI redesign is deferred until after migration acceptance.
- Redesign is not part of the functional parity gate for migration sprints.
- Default redesign scope is cosmetic-first.
- Functional scope expansion requires dedicated follow-up spec(s).
- The OSS acceptance matrix remains authoritative during redesign validation.
- The redesign track inherits a wrapper-first Leptos UI baseline:
  - local Chaemera primitives stay stable,
  - upstream Leptos UI kits remain replaceable implementation details.

5. Architecture Fit

- Current migration path:
  - runtime moves from Electron to Tauri 2
  - UI moves from React slices to Leptos slices
- Redesign fits after these layers stabilize:
  - route chrome can then be visually unified
  - design tokens, layout systems, and motion can be refactored without concurrent runtime churn
- Expected primary redesign surfaces:
  - application shell and navigation
  - settings and library routes
  - chat/workspace visual hierarchy
  - shared primitives and page composition layers
- Shared primitive redesign should happen through the local Leptos wrapper layer rather than one-off page styling.

6. External References (optional)

- No external references required.
- Source of truth is the local repository migration plan and current UI entrypoints.

7. Implementation Tasks (ordered)

1. Define redesign baseline after migration cutover.

- Freeze the post-migration UI baseline from the accepted `Tauri 2 + Leptos` state.
- Identify cosmetic debt versus behavioral debt.

2. Build a redesign token map.

- Define typography, spacing, density, layout rhythm, and color-system decisions.
- Keep tokens separate from feature behavior.

3. Redesign low-risk shared surfaces first.

- App shell
- route headers
- navigation
- library/settings visual framing

4. Redesign high-density workflows second.

- chat layout
- workspace hierarchy
- context panels
- utility dialogs and settings clusters

5. Final polish and consistency sweep.

- motion cleanup
- responsive QA
- dark/light parity if still applicable
- visual debt removal

8. Requirement -> Task -> Test -> Gate

1. Requirement: keep redesign separate from migration critical path.

- Task: do not schedule redesign work until migration cutover is accepted.
- Test: redesign files/commits are absent from migration-critical sprint scope.
- Gate: redesign starts only after migration closure signal.

2. Requirement: keep redesign cosmetic-first.

- Task: limit default work to visual/systematic UI changes.
- Test: changed behavior must be called out explicitly in spec/review notes.
- Gate: no hidden functional delta inside cosmetic PRs/commits.

3. Requirement: preserve OSS behavior during redesign.

- Task: reuse the established smoke/regression suite during redesign.
- Test: OSS smoke suite passes after each redesign wave.
- Gate: no redesign promotion if OSS smoke fails.

4. Requirement: improve consistency rather than create isolated page art.

- Task: redesign shared primitives and layout systems before one-off page treatments.
- Test: visual changes land through reusable route/shell/component layers.
- Gate: reject redesign slices that add style divergence without system payoff.

9. Acceptance and Tests

- Minimum redesign validation:
  - existing OSS smoke suite passes
  - route-level visual sanity checks pass
  - responsive checks on desktop/mobile-width layouts pass
  - no regression in settings/library/chat core usability
- Preferred validation format:
  - targeted screenshots or snapshot-like visual references
  - smoke E2E on affected routes
  - manual review for hierarchy/readability/layout consistency

10. Promotion Artifacts

- Redesign phase note with before/after intent.
- Updated visual/token decisions if shared primitives change.
- Progress and validation updates in `docs-new/00-navigation/`.
- Commit series that separates cosmetic waves from any explicitly authorized behavior changes.

11. Risks and Rollback

- Risks:
  - cosmetic churn hiding behavior regressions
  - inconsistent visual direction across routes
  - rework if redesign starts before migration stabilizes
  - over-scoping from "polish" into product redesign
- Rollback strategy:
  - keep redesign waves small and route/system based
  - isolate visual commits from behavior commits
  - revert per wave if smoke validation fails

12. Agent Guardrails

- Do not start redesign work before migration cutover acceptance.
- Do not label functional rewrites as cosmetic.
- Prefer shared layout/token work over isolated page restyling.
- Keep redesign validation tied to the OSS smoke suite.
- Keep docs synchronized when redesign governance changes:
  - `../../00-navigation/INDEX.md`
  - `../../00-navigation/inventory.json`
  - `../../00-navigation/progress.md`
  - `../../00-navigation/validation.md`

## Evidence

- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Target Outcome, Locked Decisions, Phase 5-7 sequencing`
  lines: 1-260
- path: `src/renderer.tsx`
  symbol: `Current renderer entry`
  lines: 1-220
- path: `src/router.ts`
  symbol: `Current route shell registration`
  lines: 1-260
- path: `src/routes/settings.tsx`
  symbol: `Low-risk route shell already in migration path`
  lines: 1-120
- path: `src/routes/library.ts`
  symbol: `Low-risk route shell already in migration path`
  lines: 1-120
- path: `src/routes/themes.ts`
  symbol: `Low-risk route shell already in migration path`
  lines: 1-120

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md]]
- [[../sprints/README.md]]
