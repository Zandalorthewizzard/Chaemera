---
id: chaemera-sprint-3-tauri-wave-a-core-domains
title: Sprint 3 - Tauri Wave A Core Domains
type: sprint
status: completed
tags: [sprint, migration, tauri2, wave-a]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-2-tauri2-bootstrap.md],
  ]
depends_on: [[sprint-2-tauri2-bootstrap.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 3 - Tauri Wave A Core Domains

## Sprint Goal

Migrate settings, system, window, and base app lifecycle domains onto the Tauri command/event path.

## Deliverables

1. Tauri-backed system, window, settings, and app lifecycle commands.
2. TypeScript compatibility bridge for Wave A domains.
3. Smoke-validation backlog for startup, settings persistence, and window actions.

## Parallel 3-Agent Plan

1. Agent 1: native shell command/event migration for core domains.
2. Agent 2: TypeScript bridge and renderer consumer migration for Wave A.
3. Agent 3: harness and smoke preparation for startup/settings/window flows.

## Done Criteria

1. Core startup and settings flows no longer depend on Electron-specific runtime paths.
2. Window and system actions are callable through the Tauri compatibility bridge.
3. Wave A is ready for full-sprint validation.

## Implementation Outcome

1. Implemented in commit `42c33e8` (`sprint-3: add tauri core bridge scaffold for wave-a domains`).
2. Added the first Tauri-compatible bridge for window actions, platform/version lookup, and user settings.
3. Kept Electron runtime behavior alive as fallback so Wave A landed as a safe compatibility layer instead of a big-bang cutover.

## Validation Snapshot

1. This sprint was later validated as part of the post-Sprint-10 stabilization pass on 2026-03-01.
2. `npm run ts`, `npm run build`, and the passing `tauri-smoke` path cover the Wave A bridge in the integrated app state.
3. Full Electron removal remains deferred to `Sprint 11`.
