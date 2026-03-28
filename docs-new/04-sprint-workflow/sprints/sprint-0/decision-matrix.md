---
id: chaemera-sprint-0-decision-matrix
title: Sprint 0 Decision Matrix
type: artifact
status: active
tags: [sprint-0, decisions]
related: [[../sprint-0-baseline-scope-freeze.md], [risk-register.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Decision Matrix

| Decision ID | Scope              | Decision                                           | Status | Source                                     |
| ----------- | ------------------ | -------------------------------------------------- | ------ | ------------------------------------------ |
| D-0001      | Migration strategy | Use strangler migration                            | locked | strategy discussion                        |
| D-0002      | License            | Keep Apache-2.0                                    | locked | project constraint                         |
| D-0003      | Scope              | Remove pro/brand-locked flows                      | locked | OSS boundary                               |
| D-0004      | Execution          | 3-agent partition with exclude manifests           | locked | sprint process                             |
| D-0005      | Gate model         | Sprint transition only via measurable gates        | locked | phase-gates                                |
| D-0006      | Test policy        | P0 baseline blocks Sprint 1 if broken              | locked | acceptance-matrix + phase-gates            |
| D-0007      | Deep-link policy   | Preserve OSS deep links, remove pro deep link path | locked | proprietary-surface-map + main.ts analysis |
| D-0008      | PR hygiene         | No mixed-domain refactors inside migration sprints | locked | risk-register                              |

## Clarifications

1. `D-0007` means keep:
   - `supabase-oauth-return`
   - `neon-oauth-return`
   - `add-mcp-server`
   - `add-prompt`
     while removing `dyad-pro-return`.
2. `D-0008` applies to all three agents and is enforced at review time.
