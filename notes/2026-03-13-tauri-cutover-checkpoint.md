# 2026-03-13 Tauri Cutover Checkpoint

## Context

This checkpoint captures the current migration status and the clarified near-term product direction after resuming work on `refactor/leptos-tauri2`.

## Confirmed State

1. The local branch `refactor/leptos-tauri2` is synchronized with `origin/refactor/leptos-tauri2`.
2. The repository already contains substantial migration work through `Sprint 11` waves recorded in `notes/2026-03-01-migration-state.md`.
3. `docs-new/` is the local documentation system and should hold stable decisions, governance, and evidence-backed source-of-truth docs.
4. `notes/` is the operational memory layer and currently contains the most complete execution log for the later `Sprint 11` waves.
5. The canonical sprint docs in `docs-new/` lag behind the execution log in `notes/` and need reconciliation before they can be trusted as a current implementation snapshot.

## Resume Summary

1. `Sprint 0` and `Sprint 3-10` are documented as complete.
2. `Sprint 11` is far beyond the first two waves described in canonical docs; the tracked note continues through `Wave 41`.
3. The branch already includes Tauri-side coverage for a large portion of the old Electron contract surface:
   - preview/problems path
   - app/chat CRUD
   - plans
   - GitHub/git lifecycle
   - `chat:count-tokens`
   - Vercel, Supabase, Neon, language-model flows
   - env/context paths
   - import, upgrades/versioning, proposal flows, debug bundle, screenshot, and release/build path work
4. The release/build direction has already shifted materially:
   - dedicated Tauri renderer build commands exist
   - a Tauri preview packaging workflow exists
   - Electron release scripts are explicitly marked legacy

## Open Gaps

1. Canonical docs still describe an older migration shape and do not yet reflect the later `Sprint 11` waves.
2. A fresh contract audit is still needed because the last explicit unmapped-channel count in the note is `25` after `Wave 37`, while `Wave 38-41` do not yet include a new audit result.
3. A milestone regression suite wider than `tauri-smoke` is still needed before final release cutover.
4. `help:chat:*` remains intentionally deferred behind a separate OSS/product decision.
5. Several partial-parity debts remain explicit in the note:
   - encrypted legacy Electron secrets for Supabase/Neon
   - environment parity for GUI-launched shells
   - cloud-coupled edge cases in revert/proposal/migration flows

## Strategy Update (2026-03-13)

1. The current release goal is a production-ready `Tauri 2` app without Electron.
2. The current release does not require a full Leptos migration.
3. The current UI may remain on the existing `TypeScript + shadcn` baseline where that preserves parity and reduces cutover risk.
4. The current production version should remove:
   - Dyad commercial logic
   - premium-shaped behavior that does not belong in the OSS fork
   - first-order Dyad aesthetics and identity debt that should not ship in Chaemera
5. Any broader Leptos migration is now treated as a later separate stage rather than the gating requirement for the current release.
6. Product and UI hardening should continue on the current stack unless a later spec explicitly reopens the Leptos migration as the next priority.

## Recommended Resume Order

1. Reconcile canonical docs with the actual `Sprint 11` execution log.
2. Run a fresh contract audit to identify the true remaining Electron-only surface.
3. Define a pragmatic milestone regression suite broader than `tauri-smoke`.
4. Finish the remaining Tauri cutover and Electron cleanup for the production release.
5. Revisit Leptos only after the Tauri-first production version is stable and accepted.
