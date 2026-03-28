---
id: chaemera-sprint-8-tauri-harness-migration
title: Sprint 8 - Tauri Harness Migration
type: sprint
status: completed
tags: [sprint, migration, tauri2, harness]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-7-tauri-wave-e-advanced-utilities.md],
  ]
depends_on: [[sprint-7-tauri-wave-e-advanced-utilities.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 8 - Tauri Harness Migration

## Sprint Goal

Replace Electron-specific test launcher assumptions with a Tauri-compatible smoke and regression harness.

## Deliverables

1. Tauri test launcher and native test hooks.
2. Bootstrap compatibility path for test-mode runtime and renderer adapters.
3. Playwright and CI migration for Tauri execution.

## Parallel 3-Agent Plan

1. Agent 1: native test hooks and launcher path.
2. Agent 2: bootstrap and adapter migration for test mode.
3. Agent 3: Playwright and CI migration.

## Done Criteria

1. Electron-specific launcher assumptions are removed from the primary harness path.
2. Tauri test bootstrap is available for smoke and regression execution.
3. Harness migration is ready for full-sprint validation.

## Implementation Outcome

1. Implemented in commit `b23901d` (`sprint-8: add tauri smoke harness and dual e2e launcher`).
2. Added a `tauri-smoke` Playwright project, browser-backed Tauri smoke fixture, and dual Electron/Tauri harness scripts.
3. Kept legacy Electron regression as fallback while making Tauri the migration-era smoke path.

## Validation Snapshot

1. On 2026-03-01, `npx playwright test --project=tauri-smoke e2e-tests/tauri-smoke.spec.ts --reporter=line` passed with `4` tests.
2. On 2026-03-01, a selected Electron regression subset passed with `5` tests and `1` skipped case.
3. The remaining harness noise is operational only: Windows `taskkill` cleanup warnings and occasional `EADDRINUSE` test-server churn.
