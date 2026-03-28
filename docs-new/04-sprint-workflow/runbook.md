---
id: chaemera-sprint-runbook
title: Sprint Pack Runbook
type: guide
status: active
tags: [sprint, runbook]
related:
  [
    [README.md],
    [spec-template.md],
    [sprints/README.md],
    [sprints/sprint-slicing-rules.md],
  ]
depends_on: []
generated: false
source_of_truth: process
outline: []
---

# Sprint Pack Runbook

1. Intake scope and constraints.
2. Create sprint pack and long slices (`3` coding slices, no docs-only slice).
3. Lock ownership and interface boundaries before coding starts.
4. Execute all slices in parallel with no shared-write.
5. Complete coding across all slices.
6. Run tests once after full sprint completion.
7. Orchestrator accepts slice outputs and updates docs/meta files.

## Links

- [[README.md]]
- [[spec-template.md]]
- [[sprints/README.md]]
- [[sprints/sprint-slicing-rules.md]]
