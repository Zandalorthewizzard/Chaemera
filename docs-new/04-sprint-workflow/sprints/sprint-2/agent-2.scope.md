---
id: chaemera-sprint-2-agent-2-scope
title: Sprint 2 Agent 2 Scope
type: task
status: planned
tags: [sprint-2, agent-2, scope]
related:
  [
    [../sprint-2-tauri2-bootstrap.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-2.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 Agent 2 Scope

## Workstream

Long Slice B: TypeScript bridge and adapter layer for Tauri command/event calls.

## Owned Paths

1. `src/ipc/types/**`
2. `src/ipc/contracts/**`
3. `src/ipc/preload/**`
4. `src/ipc/adapters/**` (if introduced)
5. `src/renderer.tsx`
6. `src/router.ts`

## Responsibilities

1. Build compatibility bridge for migrated commands/events.
2. Keep renderer-level consumers stable via adapter interface.
3. Document contract parity and temporary shims.

## Autonomy Rules

1. Do not edit native shell files.
2. Do not edit CI/tooling-owned files.
3. If interface lock must change, file handoff request.

## Exclude

See `agent-2.exclude`.
