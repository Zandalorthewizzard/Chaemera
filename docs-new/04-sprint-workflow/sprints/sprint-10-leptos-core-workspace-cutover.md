---
id: chaemera-sprint-10-leptos-core-workspace-cutover
title: Sprint 10 - Leptos Core Workspace Cutover
type: sprint
status: completed
tags: [sprint, migration, leptos, workspace]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-9-leptos-shell-and-low-risk-routes.md],
  ]
depends_on: [[sprint-9-leptos-shell-and-low-risk-routes.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 10 - Leptos Core Workspace Cutover

## Sprint Goal

Migrate the core workspace, chat, app management, and context-heavy UI flows from React to Leptos.

## Deliverables

1. Leptos chat and workspace route migration.
2. Leptos migration of app, context, and file-heavy UI modules.
3. Parity harness support for the core migrated workspace.

## Parallel 3-Agent Plan

1. Agent 1: runtime integration for the core workspace.
2. Agent 2: Leptos core workspace migration.
3. Agent 3: core workspace parity harness.

## Done Criteria

1. Core workspace UI has a Leptos implementation path.
2. Parity harness is ready for migrated chat, app, and context routes.
3. React-only equivalents are prepared for final cleanup.

## Implementation Outcome

1. Implemented in commit `755c00c` (`sprint-10: extend leptos shell to core routes`).
2. Extended the Leptos shell path to `home`, `chat`, and `app-details` so the core workspace now has a live cut-in path in Tauri.
3. Supporting stabilization commits `a026e7c` and `a728111` fixed the smoke harness and route-shell stability issues exposed by the migration checkpoint.

## Validation Snapshot

1. On 2026-03-01, `npm run ts` passed.
2. On 2026-03-01, `npx vitest run src/__tests__/tauri_leptos_shell_bridge.test.ts` passed.
3. On 2026-03-01, `npm run build` passed.
4. On 2026-03-01, `npx playwright test --project=tauri-smoke e2e-tests/tauri-smoke.spec.ts --reporter=line` passed with `4` tests.
5. On 2026-03-01, the selected Electron regression subset passed with `5` tests and `1` skipped case.
