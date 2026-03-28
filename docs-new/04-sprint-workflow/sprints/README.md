---
id: chaemera-sprint-parallel-hub
title: Sprint Execution Hub (Parallel 3-Agent)
type: guide
status: active
tags: [sprint, workflow, parallel, agents]
related:
  [
    [../runbook.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [partitioning-v2.md],
    [sprint-slicing-rules.md],
    [sprint-0-baseline-scope-freeze.md],
    [sprint-1-oss-detox.md],
    [sprint-2-tauri2-bootstrap.md],
  ]
depends_on: [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
generated: false
source_of_truth: process
outline: []
---

# Sprint Execution Hub (Parallel 3-Agent)

## Goal

Enable three agents to work in one sprint simultaneously without file conflicts.

## Hard Rules

1. Follow `sprint-slicing-rules.md` as mandatory governance.
2. Every slice is coding-focused and long-form (no docs-only slices).
3. Orchestrator (default Agent 1) accepts slice results and updates docs.
4. Tests are executed only once after full sprint completion.

## Partition Rule

1. Each sprint has:
   - `agent-1.scope.md`, `agent-2.scope.md`, `agent-3.scope.md`
   - `agent-1.exclude`, `agent-2.exclude`, `agent-3.exclude`
2. `scope` defines allowed workstream and owned paths.
3. `exclude` defines hard-deny paths and patterns.
4. If a needed file is in another agent scope, escalate instead of editing.

## Long Slice v2

1. Slices are large and capability-based, not file-fragment-based.
2. `No shared write`: one file belongs to exactly one agent in a sprint.
3. Shared dependencies are handled through locked interfaces, not co-editing.
4. Cross-slice requests are done via handoff note, not direct edits.
5. Sprint promotion requires zero unresolved cross-slice conflicts.

## Exclude File Format

1. One pattern per line.
2. Uses glob-like path patterns relative to repository root.
3. Comment lines start with `#`.
4. `exclude` has priority over local intent.

## Mandatory Companion Docs

1. `partitioning-v2.md` defines global slicing rules.
2. `sprint-slicing-rules.md` defines hard sprint requirements.
3. Each sprint includes `ownership-map.md` and `interface-lock.md`.

## Active Sprints

1. None. Next planned sprint: [[sprint-11-final-cutover-and-electron-cleanup.md]].

## Validation Queue

1. [[sprint-1-oss-detox.md]]
2. `Sprint 1 state: IMPLEMENTATION COMPLETE / VALIDATION DEFERRED`

## Planned Sprints

1. [[sprint-11-final-cutover-and-electron-cleanup.md]]
2. [[sprint-12-chat-count-tokens-context-port.md]]

## Post-Migration Track

1. UI redesign is planned after `Sprint 11`, but it is not part of the parity-critical migration path.
2. Default redesign scope is cosmetic-first:
   - typography
   - spacing
   - layout polish
   - visual language refresh
3. Functional behavior changes must be specified separately and must not be smuggled into cosmetic redesign work.

## Completed Sprints

1. [[sprint-0-baseline-scope-freeze.md]]
2. [[sprint-3-tauri-wave-a-core-domains.md]]
3. [[sprint-4-tauri-wave-b-files-and-apps.md]]
4. [[sprint-5-tauri-wave-c-chat-and-agent.md]]
5. [[sprint-6-tauri-wave-d-integrations.md]]
6. [[sprint-7-tauri-wave-e-advanced-utilities.md]]
7. [[sprint-8-tauri-harness-migration.md]]
8. [[sprint-9-leptos-shell-and-low-risk-routes.md]]
9. [[sprint-10-leptos-core-workspace-cutover.md]]

## Reconciliation Queue

1. `Sprint 2` still exists as an earlier bootstrap planning artifact and should be reconciled or archived before final migration closeout.

## Links

- [[../runbook.md]]
- [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[partitioning-v2.md]]
- [[sprint-slicing-rules.md]]
- [[sprint-0-baseline-scope-freeze.md]]
- [[sprint-1-oss-detox.md]]
- [[sprint-2-tauri2-bootstrap.md]]
