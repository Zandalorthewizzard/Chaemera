---
id: chaemera-discussion-leptos-ui-wrapper-baseline-2026-03-01
title: Leptos UI Wrapper Baseline
type: discussion
status: active
tags: [discussion, leptos, ui, wrappers, migration]
related:
  [
    [2026-02-23-tauri2-leptos-migration-strategy.md],
    [
      ../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md,
    ],
    [
      ../../04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md,
    ],
    [../../../notes/2026-03-01-leptos-ui-foundation.md],
  ]
depends_on: [[2026-02-23-tauri2-leptos-migration-strategy.md]]
generated: false
source_of_truth: discussion
outline: []
---

# Leptos UI Wrapper Baseline

## Decision

1. The future Leptos UI layer should keep a `shadcn`-like primitive model.
2. Chaemera feature code should not bind directly to any external Leptos UI kit.
3. The project should own a local wrapper layer first, and choose the upstream implementation behind that layer.
4. The first wrapper pass is parity-oriented, not redesign-oriented.

## Reasoning

1. Current React UI is already organized around a reusable primitive layer in `src/components/ui/`.
2. Preserving that mental model reduces migration friction and keeps route-level conversion more mechanical.
3. A local wrapper layer protects the migration from upstream churn in the still-young Leptos UI ecosystem.
4. This fits the migration rule already locked in the master plan:
   - functional parity first,
   - redesign later.

## Working Rule

1. New Leptos feature surfaces should consume primitives from a Chaemera-owned wrapper layer.
2. Upstream Leptos UI crates are replaceable implementation details.
3. Primitive naming should stay close to the current React UI layer when that improves migration clarity.
4. Visual divergence or redesign experiments belong to the post-migration redesign track, not the parity-critical migration path.

## Preparation Outcome

1. Added a tracked scaffold in `src-tauri/leptos-ui/`.
2. Added a wrapper manifest that maps current React primitives to future Leptos wrappers.
3. Added a tracked note that records the decision and resume path:
   - `notes/2026-03-01-leptos-ui-foundation.md`

## Open Questions

1. Which upstream Leptos UI project will provide the first implementation behind the wrapper layer.
2. Whether token definition should live in shared CSS variables, Leptos-side assets, or a hybrid layer.
3. Which P0 wrapper should be implemented first when route-shell compatibility begins to be replaced by true Leptos UI bodies.

## Evidence

- path: `src/components/ui/button.tsx`
  symbol: `Current reusable React primitive layer`
  lines: 1-220
- path: `src/components/ui/dialog.tsx`
  symbol: `Current reusable dialog primitive`
  lines: 1-260
- path: `src/components/ui/select.tsx`
  symbol: `Current reusable select primitive`
  lines: 1-260
- path: `src-tauri/src/leptos_shell.rs`
  symbol: `Current Leptos route-shell entrypoint`
  lines: 1-260
- path: `src-tauri/leptos-ui/README.md`
  symbol: `Wrapper layer purpose and rules`
  lines: 1-120
- path: `src-tauri/leptos-ui/components.manifest.json`
  symbol: `Planned wrapper inventory`
  lines: 1-260
- path: `notes/2026-03-01-leptos-ui-foundation.md`
  symbol: `Tracked working decision and resume point`
  lines: 1-200

## Links

- [[2026-02-23-tauri2-leptos-migration-strategy.md]]
- [[../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../04-sprint-workflow/specs/2026-03-01-post-migration-ui-redesign-track.md]]
- [[../../../notes/2026-03-01-leptos-ui-foundation.md]]
