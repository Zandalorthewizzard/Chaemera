---
id: chaemera-sprint-1-agent-1-scope
title: Sprint 1 Agent 1 Scope
type: task
status: planned
tags: [sprint-1, agent-1, scope]
related:
  [
    [../sprint-1-oss-detox.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-1.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Agent 1 Scope

## Workstream

Long Slice A: backend/runtime OSS detox.

## Owned Paths

1. `src/main.ts`
2. `src/main/**`
3. `src/preload.ts`
4. `src/ipc/**`
5. `src/paths/**`
6. `src/utils/codebase.ts`

## Responsibilities

1. Remove pro-specific handlers and deep-link branches.
2. Remove pro-only server endpoints usage in backend runtime.
3. Keep open provider integrations operational.

## Autonomy Rules

1. Do not edit frontend-owned paths.
2. Keep contract names stable per `interface-lock.md`.
3. If contract break is needed, stop and raise handoff request.

## Exclude

See `agent-1.exclude`.
