---
id: chaemera-sprint-2-agent-1-scope
title: Sprint 2 Agent 1 Scope
type: task
status: planned
tags: [sprint-2, agent-1, scope]
related:
  [
    [../sprint-2-tauri2-bootstrap.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-1.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 Agent 1 Scope

## Workstream

Long Slice A: Tauri 2 shell bootstrap and native lifecycle equivalents.

## Owned Paths

1. `src-tauri/**`
2. `Cargo.toml` (if introduced)
3. `tauri.conf.json` (if introduced)
4. `scripts/tauri/**` (if introduced)

## Responsibilities

1. Setup shell lifecycle parity for startup and window management baseline.
2. Implement deeplink and single-instance baseline behavior.
3. Provide migration notes for command/event bridge needs.

## Autonomy Rules

1. Do not edit TS bridge or harness-owned paths.
2. Keep shell public behavior compatible with locked interfaces.
3. Raise handoff request when bridge changes are required.

## Exclude

See `agent-1.exclude`.
