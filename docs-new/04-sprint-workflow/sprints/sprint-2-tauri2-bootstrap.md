---
id: chaemera-sprint-2-tauri2-bootstrap
title: Sprint 2 - Tauri 2 Bootstrap
type: sprint
status: planned
tags: [sprint, migration, tauri2, bootstrap]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-2/ownership-map.md],
    [sprint-2/interface-lock.md],
    [sprint-2/agent-1.scope.md],
    [sprint-2/agent-2.scope.md],
    [sprint-2/agent-3.scope.md],
  ]
depends_on: [[sprint-1-oss-detox.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 - Tauri 2 Bootstrap

## Sprint Goal

Stand up Tauri 2 desktop shell and a minimal command/event bridge while preserving core startup and settings behavior.

## Deliverables

1. Tauri 2 shell scaffold with app lifecycle baseline.
2. Initial command/event bridge for core domains.
3. Build and local run pipeline for the new shell.
4. Smoke test slice for startup, navigation, and settings.

## Parallel 3-Agent Plan

1. Agent 1: Tauri shell and native lifecycle.
2. Agent 2: TypeScript bridge and domain adapters.
3. Agent 3: build/test harness and migration CI glue.

## Long Slice Model

1. Work is partitioned by capability with zero shared-write.
2. Ownership and lock rules are defined in:
   - `sprint-2/ownership-map.md`
   - `sprint-2/interface-lock.md`
3. Cross-slice edits require handoff and lock reopen.
4. Slices are coding-only; documentation is finalized by orchestrator after slice acceptance.
5. Test execution happens once after all slices in the sprint are complete.

## Done Criteria

1. App boots via Tauri 2 in dev mode.
2. Core command paths are callable through the new bridge.
3. Smoke checks for startup/settings/navigation pass.
4. Phase-3 domain wave plan is ready.

## Links

- [[README.md]]
- [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[sprint-2/ownership-map.md]]
- [[sprint-2/interface-lock.md]]
- [[sprint-2/agent-1.scope.md]]
- [[sprint-2/agent-2.scope.md]]
- [[sprint-2/agent-3.scope.md]]
