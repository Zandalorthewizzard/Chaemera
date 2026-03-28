---
id: chaemera-discussion-tauri2-leptos-migration-strategy-2026-02-23
title: Migration Strategy Discussion (Leptos + Tauri 2)
type: discussion
status: active
tags: [discussion, migration, architecture, leptos, tauri2, oss]
related:
  [
    [../discussion-template.md],
    [
      ../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md,
    ],
    [../../01-concepts/discussion-first.md],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: discussion
outline: []
---

# Migration Strategy Discussion (Leptos + Tauri 2)

1. Context

- Current app is Electron + Vite + React + TypeScript with a large IPC surface and broad e2e coverage.
- Goal is migration to Leptos + Tauri 2 with full open-source functional parity on the target stack by the accepted migration end-state.
- Repository must remain Apache-2.0 and remove proprietary/brand-locked/pro flows.

2. Problem

- A big-bang rewrite has high regression risk because runtime, UI framework, IPC transport, and test harness would all change at once.
- Current e2e stack is tightly coupled to Electron lifecycle and APIs.

3. Goals

- Preserve current open-source functionality at migration baseline.
- Move desktop runtime to Tauri 2.
- Move UI to Leptos in controlled stages.
- Keep migration auditable through small, scoped commits and explicit acceptance gates.
- Keep the in-app preview/workspace model on the target stack rather than treating preview as an optional casualty of the migration.

4. Alternatives

- Big-bang migration:
  - Pro: shorter calendar in ideal conditions.
  - Con: highest risk and hard rollback.
- Strangler migration (selected):
  - Pro: incremental parity checks and safer rollback.
  - Con: temporary dual-stack complexity.

5. Decision

- Use strangler migration with contract-first boundaries.
- Keep existing behavior frozen as acceptance baseline.
- Treat full parity as a milestone/final-cutover requirement, not a requirement for every intermediate work-in-progress state.
- Migrate in phases:
  1. Baseline and acceptance matrix.
  2. OSS/license detox track.
  3. Tauri 2 shell while keeping compatibility layer.
  4. Domain-by-domain IPC to Tauri commands/events.
  5. e2e harness migration from Electron coupling.
  6. React to Leptos route/module cutover.
  7. Final cleanup and Electron removal.

  5.1. Preview Position

- The target application still includes an in-app preview/workspace surface.
- Tauri replaces the outer desktop shell.
- Leptos replaces the application UI shell.
- The existing preview model can remain an embedded web-content surface inside the workspace during migration, with architectural replacement only if it becomes necessary for final parity.

6. Unknown / Deferred

- Exact sequencing for the first Leptos entry slice (chat-first vs settings-first).
- Final e2e adapter architecture for Tauri (full UI e2e vs split integration layers).
- Scope boundaries for template/community endpoints that currently reference upstream branding endpoints.
- Whether the final preview surface should remain a plain embedded `iframe` or move to a more Tauri-specific embedded webview abstraction.

## Links

- [[../discussion-template.md]]
- [[../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../01-concepts/discussion-first.md]]
