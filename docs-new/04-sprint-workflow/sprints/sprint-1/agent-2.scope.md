---
id: chaemera-sprint-1-agent-2-scope
title: Sprint 1 Agent 2 Scope
type: task
status: planned
tags: [sprint-1, agent-2, scope]
related:
  [
    [../sprint-1-oss-detox.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-2.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Agent 2 Scope

## Workstream

Long Slice B: frontend UI and localization OSS detox.

## Owned Paths

1. `src/app/**`
2. `src/components/**`
3. `src/pages/**`
4. `src/routes/**`
5. `src/renderer.tsx`
6. `src/hooks/**`
7. `src/i18n/**`
8. `src/lib/schemas.ts`

## Responsibilities

1. Remove pro UI toggles, dialogs, and banners.
2. Remove pro labels/strings from locales.
3. Preserve OSS user flows and non-pro UX.

## Autonomy Rules

1. Do not edit backend/runtime-owned paths.
2. Keep UI API usage compatible with locked backend contracts.
3. If a backend change is required, file handoff request.

## Exclude

See `agent-2.exclude`.
