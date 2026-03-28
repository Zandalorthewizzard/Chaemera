---
id: chaemera-sprint-4-tauri-wave-b-files-and-apps
title: Sprint 4 - Tauri Wave B Files and Apps
type: sprint
status: completed
tags: [sprint, migration, tauri2, wave-b]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-3-tauri-wave-a-core-domains.md],
  ]
depends_on: [[sprint-3-tauri-wave-a-core-domains.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 4 - Tauri Wave B Files and Apps

## Sprint Goal

Migrate app/file/import/template/context/version domains to Tauri while keeping filesystem workflows stable.

## Deliverables

1. Tauri-backed file, app, import, template, context, and version operations.
2. Bridge migration for file and app lifecycle consumers.
3. Regression backlog for import, file tree, context management, and version workflows.

## Parallel 3-Agent Plan

1. Agent 1: native filesystem and app operations.
2. Agent 2: bridge and renderer consumer migration for Wave B.
3. Agent 3: harness and fixture preparation for file/app workflows.

## Done Criteria

1. File and app lifecycle operations route through the Tauri migration path.
2. Renderer consumers compile against the compatibility layer for Wave B domains.
3. Wave B is ready for full-sprint validation.

## Implementation Outcome

1. Implemented in commit `9b6cbf5` (`sprint-4: add tauri wave-b bridge for file and app flows`).
2. Added Tauri migration paths for file selection, template reads, app file reads/search, versions, and current-branch lookup.
3. DB-backed app mutation flows were intentionally left on fallback behavior instead of being half-ported.

## Validation Snapshot

1. This sprint was later validated as part of the post-Sprint-10 stabilization pass on 2026-03-01.
2. `npm run ts`, `npm run build`, and downstream smoke execution verified the integrated Wave B bridge still compiles and runs.
3. Full native replacement of all app CRUD flows remains deferred to the final cutover phase.
