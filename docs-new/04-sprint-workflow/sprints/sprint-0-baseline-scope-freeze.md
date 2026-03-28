---
id: chaemera-sprint-0-baseline-scope-freeze
title: Sprint 0 - Baseline and Scope Freeze
type: sprint
status: completed
tags: [sprint, migration, baseline, acceptance]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [
      ../../05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md,
    ],
    [sprint-0/agent-1.scope.md],
    [sprint-0/agent-2.scope.md],
    [sprint-0/agent-3.scope.md],
  ]
depends_on: [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 - Baseline and Scope Freeze

## Sprint Goal

Lock the current open-source functional baseline and migration boundaries before invasive refactoring.

## Deliverables

1. Acceptance matrix mapped from `e2e-tests/*.spec.ts`.
2. Proprietary/brand/pro surface map with removal candidates.
3. Migration risk register with severity and mitigation.
4. Locked sprint decisions and gate criteria for Sprint 1.

## Parallel 3-Agent Plan

1. Agent 1: acceptance matrix and baseline feature catalog.
2. Agent 2: proprietary surface discovery and OSS boundary map.
3. Agent 3: risks, gates, and sprint decision matrix.

## Done Criteria

1. Critical baseline flows are listed and prioritized.
2. All known pro/brand entry points are mapped to files.
3. Risks have owner, mitigation, and rollback note.
4. Sprint 1 backlog is frozen with explicit include/exclude scope.

## Completion Summary (2026-02-23)

1. `acceptance-matrix.md` and `baseline-feature-catalog.md` finalized and synchronized.
2. `proprietary-surface-map.md` and `removal-candidate-list.md` finalized with D-0007 alignment.
3. `risk-register.md`, `phase-gates.md`, and `decision-matrix.md` finalized.
4. All gates `G0.1..G0.5` passed; Sprint 1 is ready to start.

## Links

- [[README.md]]
- [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[sprint-0/agent-1.scope.md]]
- [[sprint-0/agent-2.scope.md]]
- [[sprint-0/agent-3.scope.md]]
