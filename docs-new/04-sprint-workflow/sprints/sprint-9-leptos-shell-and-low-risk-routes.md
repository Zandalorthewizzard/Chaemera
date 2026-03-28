---
id: chaemera-sprint-9-leptos-shell-and-low-risk-routes
title: Sprint 9 - Leptos Shell and Low-Risk Routes
type: sprint
status: completed
tags: [sprint, migration, leptos, shell]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-8-tauri-harness-migration.md],
  ]
depends_on: [[sprint-8-tauri-harness-migration.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 9 - Leptos Shell and Low-Risk Routes

## Sprint Goal

Stand up the Leptos frontend shell and migrate low-risk routes while keeping the Tauri bridge stable.

## Deliverables

1. Leptos app shell mounted in the Tauri desktop app.
2. Low-risk route migration for settings, help, library, and provider setup flows.
3. Build and harness support for the first Leptos surface area.

## Parallel 3-Agent Plan

1. Agent 1: Rust and shell integration for Leptos.
2. Agent 2: Leptos low-risk route migration.
3. Agent 3: Leptos build and parity harness.

## Done Criteria

1. Leptos shell is mounted in the app.
2. Low-risk routes are migrated with parity-focused harness support.
3. High-risk routes remain deferred to the next sprint.

## Implementation Outcome

1. Implemented in commit `a964c6c` (`sprint-9: add leptos route shell for low-risk surfaces`).
2. Added the first live Leptos route-shell path for settings, themes, library, help, and provider setup routes.
3. Kept React route bodies as compatibility content under the new shell instead of forcing an unsafe full rewrite.

## Validation Snapshot

1. This sprint was validated on 2026-03-01 by the green `tauri-smoke` suite and downstream integrated build checks.
2. The smoke suite now anchors on stable route-shell behavior instead of the heavier home route.
3. High-risk workspace flows remained deferred by design until `Sprint 10`.
