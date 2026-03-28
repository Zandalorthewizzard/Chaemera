---
id: chaemera-sprint-slicing-rules
title: Sprint and Slice Rules (Hard Requirements)
type: guide
status: active
tags: [sprint, slices, governance, hard-rules]
related: [[README.md], [partitioning-v2.md], [../runbook.md]]
depends_on: [[partitioning-v2.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint and Slice Rules (Hard Requirements)

## Mandatory Rules

1. Each slice must be a long, substantial, end-to-end work chunk.
2. All three slices must run in parallel with no file conflicts.
3. No slice can be documentation-only; all slices are development/coding slices.
4. Documentation is updated by the orchestrator after accepting slice results.
5. Default orchestrator is Agent 1 unless reassigned explicitly.
6. Tests can be written in slices but must not be executed during slice work.
7. Test execution is performed once after the full sprint is completed.

## Operational Clarifications

1. `No shared write` is mandatory while slices are active.
2. Cross-slice needs are handled through handoff requests.
3. Sprint is accepted only after orchestrator validates all slices and updates docs.
4. Partial per-slice test runs are not used as sprint-acceptance signal.

## Links

- [[README.md]]
- [[partitioning-v2.md]]
- [[../runbook.md]]
