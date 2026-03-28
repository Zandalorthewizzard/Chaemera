---
id: chaemera-sprint-1-ownership-map
title: Sprint 1 Ownership Map (Long Slice v2)
type: artifact
status: active
tags: [sprint-1, ownership, partitioning]
related:
  [
    [../sprint-1-oss-detox.md],
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

# Sprint 1 Ownership Map (Long Slice v2)

## Agent 1 - Backend/Runtime Detox

1. Owns all runtime + backend pro detox.
2. Write ownership: `src/main.ts`, `src/main/**`, `src/preload.ts`, `src/ipc/**`, `src/paths/**`, `src/utils/codebase.ts`.

## Agent 2 - Frontend Detox

1. Owns all UI/i18n pro detox.
2. Write ownership: `src/app/**`, `src/components/**`, `src/pages/**`, `src/routes/**`, `src/hooks/**`, `src/i18n/**`, `src/renderer.tsx`, `src/lib/schemas.ts`.

## Agent 3 - Tests/Tooling Detox

1. Owns all test and tooling realignment required for OSS detox.
2. Write ownership: `e2e-tests/**`, `src/__tests__/**`, `testing/**`, `README.md`, `CONTRIBUTING.md`.

## Orchestrator

1. Default orchestrator: Agent 1.
2. Orchestrator accepts slice outputs and then updates sprint documentation.

## No Shared Write Guarantee

1. Any file outside owned paths is read-only.
2. Cross-slice edits are requested via handoff note, not direct change.
