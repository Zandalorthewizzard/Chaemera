---
id: chaemera-sprint-0-phase-gates
title: Sprint 0 Phase Gates
type: artifact
status: active
tags: [sprint-0, gates]
related:
  [
    [../sprint-0-baseline-scope-freeze.md],
    [acceptance-matrix.md],
    [risk-register.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Phase Gates

## Gate Table

| Gate ID | Gate                       | Measurement                                          | Pass Criteria                                                               | Owner                |
| ------- | -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- | -------------------- |
| G0.1    | Acceptance baseline freeze | Matrix has P0/P1 rows mapped to concrete tests       | All P0 rows include source tests and gate type                              | Agent 1              |
| G0.2    | Proprietary surface freeze | Surface map + removal list completed                 | All known pro/deeplink/budget/branding surfaces mapped to candidate action  | Agent 2              |
| G0.3    | Risk governance freeze     | Risk register has severity/probability/owner/trigger | No unowned `high` risk remains                                              | Agent 3              |
| G0.4    | Parallel partition freeze  | Scope/exclude triad exists for Sprint 1              | 3 scopes + 3 excludes are present and non-overlapping by intent             | Sprint Lead          |
| G0.5    | Sprint 1 entry readiness   | Cross-check between baseline and removal candidates  | No removal candidate conflicts with P0 baseline without explicit mitigation | Sprint Lead + Agents |

## Execution Notes

1. Gate checks are sequential: `G0.1 -> G0.2 -> G0.3 -> G0.4 -> G0.5`.
2. If a gate fails, update artifacts first; do not start Sprint 1 coding.
3. Any new discovery after freeze reopens only affected gate, not all gates.

## Current Status (2026-02-23)

| Gate ID | Status | Evidence                                                                                                                       | Notes                                                                                          |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| G0.1    | pass   | `acceptance-matrix.md`, `baseline-feature-catalog.md`                                                                          | Matrix/catalog sync fixed; P0 mappings reference only `must-pass` rows                         |
| G0.2    | pass   | `proprietary-surface-map.md`, `removal-candidate-list.md`                                                                      | Agent 2 delivered full surface map + Sprint 1 backlog                                          |
| G0.3    | pass   | `risk-register.md`                                                                                                             | Risk ownership and rollback triggers are defined                                               |
| G0.4    | pass   | `../sprint-1/ownership-map.md`, `../sprint-1/interface-lock.md`, `../sprint-1/agent-*.scope.md`, `../sprint-1/agent-*.exclude` | Long Slice v2 partition is defined with no shared-write ownership intent                       |
| G0.5    | pass   | `acceptance-matrix.md`, `baseline-feature-catalog.md`, `removal-candidate-list.md`                                             | P0-removal cross-check documented with explicit mitigations and no unresolved blocker conflict |

## Exit Condition for Sprint 0

1. All gates `G0.1..G0.5` marked pass.
2. Sprint 1 backlog and owners are locked.

## Closure Verdict

Sprint 0 is closed as `PASS` on 2026-02-23.
