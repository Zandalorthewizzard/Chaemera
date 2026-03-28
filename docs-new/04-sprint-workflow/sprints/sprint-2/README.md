---
id: chaemera-sprint-2-hub
title: Sprint 2 Workspace
type: hub
status: planned
tags: [sprint-2, workspace]
related:
  [
    [../sprint-2-tauri2-bootstrap.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-1.scope.md],
    [agent-2.scope.md],
    [agent-3.scope.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 Workspace

1. Agent 1 owns Tauri shell.
2. Agent 2 owns bridge/adapters.
3. Agent 3 owns build/test harness bootstrap.
4. Long Slice v2 enforced via ownership + interface lock docs.

Merge order recommendation: Agent 1 -> Agent 2 -> Agent 3.
