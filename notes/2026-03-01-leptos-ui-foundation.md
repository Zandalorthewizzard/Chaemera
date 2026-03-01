# 2026-03-01 Leptos UI Foundation

## Context

Chaemera is migrating toward `Tauri 2 + Leptos` as the end-state stack. The current React renderer already uses a Shadcn-style component layer in `src/components/ui/`, so the future Leptos UI layer should preserve that mental model instead of inventing a second, unrelated primitive system.

## Decision

1. Future Leptos UI should use a `shadcn`-like component approach.
2. We should not couple feature code directly to a third-party Leptos UI kit.
3. We should build a local wrapper layer first and let that wrapper layer choose the upstream implementation.
4. Current baseline choice:
   - prefer a living `shadcn`-style Leptos ecosystem project as the upstream source of primitives,
   - keep the project-level API local under `src-tauri/leptos-ui/`.

## Why

1. It preserves continuity with the current React UI composition model.
2. It reduces migration friction because primitive names and responsibilities remain familiar.
3. It avoids vendor lock-in if the chosen Leptos UI project changes direction, stalls, or breaks API compatibility.
4. It keeps redesign out of the critical migration path: we can migrate behavior first and tune visuals later.

## Working Rule

1. Feature code should import Leptos primitives only from the local wrapper layer.
2. Upstream Leptos UI libraries are implementation details, not public project architecture.
3. The first wrapper set should target the current high-value React primitives:
   - `button`
   - `input`
   - `textarea`
   - `dialog`
   - `sheet`
   - `tabs`
   - `tooltip`
   - `dropdown-menu`
   - `select`
   - `checkbox`
   - `radio-group`
   - `switch`
   - `popover`
   - `scroll-area`
   - `separator`
   - `badge`
   - `card`
4. Visual redesign remains post-migration work unless a later spec explicitly expands scope.

## Preparation Added

1. Added `src-tauri/leptos-ui/README.md` as the local wrapper policy entrypoint.
2. Added `src-tauri/leptos-ui/components.manifest.json` to map future Leptos wrappers to current React primitives.
3. Added `src-tauri/leptos-ui/primitives/README.md` to lock the rule that wrapper names stay local and upstream imports stay hidden.

## Open Questions

1. Which upstream Leptos component kit becomes the initial provider for the wrapper layer.
2. Whether theme tokens should live in Rust-side Leptos assets, shared CSS variables, or a cross-runtime token manifest.
3. How far we want naming parity with `src/components/ui/*.tsx` versus adapting to idiomatic Leptos naming.

## Resume Point

When Leptos component migration starts in earnest, read:

1. `src-tauri/leptos-ui/README.md`
2. `src-tauri/leptos-ui/components.manifest.json`
3. `src-tauri/leptos-ui/primitives/README.md`
4. `src/components/ui/`

Then create wrappers in priority order instead of importing any external Leptos UI crate directly into feature modules.
