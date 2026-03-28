---
id: chaemera-sprint-2-ownership-map
title: Sprint 2 Ownership Map (Long Slice v2)
type: artifact
status: active
tags: [sprint-2, ownership, partitioning]
related:
  [
    [../sprint-2-tauri2-bootstrap.md],
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

# Sprint 2 Ownership Map (Long Slice v2)

## Agent 1 - Native Shell Track

1. Owns Tauri shell and native lifecycle.
2. Write ownership: `src-tauri/**`, `Cargo.toml`, `tauri.conf.json`, `scripts/tauri/**`.

## Agent 2 - Bridge/Adapter Track

1. Owns TS command/event bridge and compatibility layer.
2. Write ownership: `src/ipc/types/**`, `src/ipc/contracts/**`, `src/ipc/preload/**`, `src/ipc/adapters/**`, `src/renderer.tsx`, `src/router.ts`.

## Agent 3 - Tooling/Harness Track

1. Owns build/test/CI migration path.
2. Write ownership: `package.json`, `playwright.config.ts`, `e2e-tests/helpers/**`, `testing/**`, `.github/workflows/**`, `scripts/**` except `scripts/tauri/**`.

## Orchestrator

1. Default orchestrator: Agent 1.
2. Orchestrator accepts slice outputs and then updates sprint documentation.

## No Shared Write Guarantee

1. Any file outside owned paths is read-only.
2. Cross-slice edits are requested via handoff note, not direct change.
