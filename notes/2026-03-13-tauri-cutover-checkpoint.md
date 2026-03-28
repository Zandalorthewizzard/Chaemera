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
3. A browser-backed milestone regression suite wider than `tauri-smoke` is now in progress through the named `tauri-regression` lane, but a real Tauri desktop runtime gate is still needed before final release cutover.
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

## 2026-03-28 Electron Runtime Cleanup

1. Removed the last Electron auto-update / installer-startup hooks from the main process:
   - deleted `electron-squirrel-startup` usage from `src/main.ts`
   - deleted `update-electron-app` usage from `src/main.ts`
2. Removed the corresponding package dependencies from:
   - `package.json`
   - `package-lock.json`
3. Added an explicit regression assertion in `src/__tests__/release_metadata.test.ts` so those dependencies stay out of the package manifest.
4. Validation passed after the cleanup:
   - `npm run ts`
   - `npx vitest run src/__tests__/release_metadata.test.ts src/__tests__/tauri_build_config.test.ts`
   - `node scripts/audit-electron-legacy-surface.js`
5. Current audit result after cleanup:
   - `electron-squirrel-startup` references: `0`
   - `update-electron-app` references: `0`
   - support-package import file count dropped from `74` to `72`
6. Remaining Electron legacy surface is now concentrated in:
   - `src/main.ts` Electron host itself
   - `src/preload.ts`
   - `forge.config.ts`
   - Electron imports across runtime handlers, utils, and legacy tests
7. The next high-value cutover step is now the broader Electron host/release tail, not the startup/update hooks.

## 2026-03-28 Electron First-Run Prompt Cleanup

1. Removed the stale macOS first-run prompt from `src/main.ts` that asked users to move the app to Applications for auto-update.
2. Added a regression assertion in `src/__tests__/release_metadata.test.ts` so `src/main.ts` stays free of:
   - `electron-squirrel-startup`
   - `update-electron-app`
   - the auto-update Applications-folder prompt text
3. Validation passed after the cleanup:
   - `npm run ts`
   - `npx vitest run src/__tests__/release_metadata.test.ts src/__tests__/tauri_build_config.test.ts`
4. The Electron legacy surface audit did not change further from the previous cleanup:
   - `electron-squirrel-startup` references: `0`
   - `update-electron-app` references: `0`
   - `supportPackageImportFileCount`: `72`
5. This confirms the updater/prompt tail is now fully removed from the Electron host, leaving the remaining tail concentrated in the actual Electron runtime and Forge packaging files.

## 2026-03-28 Electron Forge Packaging Cleanup

1. Removed the legacy Electron Forge packaging config files from the tracked tree:
   - `forge.config.ts`
   - `forge.env.d.ts`
   - `vite.main.config.mts`
   - `vite.preload.config.mts`
2. Removed the corresponding top-level Forge-related devDependencies from `package.json`.
3. Regenerated `package-lock.json` so the lockfile no longer retains the Forge package graph as a direct dependency surface.
4. Extended `src/__tests__/tauri_build_config.test.ts` so it now asserts those config files stay deleted and the Forge packages stay absent from `package.json`.
5. Validation passed after the cleanup:
   - `npm run ts`
   - `npx vitest run src/__tests__/release_metadata.test.ts src/__tests__/tauri_build_config.test.ts`
   - `node scripts/audit-electron-legacy-surface.js`
6. Current Electron legacy audit after Forge cleanup:
   - `entrypointCount`: `2`
   - `forgeReferenceFileCount`: `2`
   - only remaining entrypoints are `src/main.ts` and `src/preload.ts`
7. The broader Electron host/release tail is now materially smaller, and the next obvious targets are the live Electron host/preload files themselves rather than build scaffolding.

## 2026-03-28 Electron Host Removal

1. Deleted the final Electron host entrypoints from the repository:
   - `src/main.ts`
   - `src/preload.ts`
2. Removed the stale Electron package entry metadata from `package.json`:
   - deleted the `main` field that pointed at `.vite/build/main.js`
3. Extended the migration tests so they now assert:
   - `src/main.ts` does not exist
   - `src/preload.ts` does not exist
   - `package.json.main` is undefined
4. Validation passed after the host removal:
   - `npm run ts`
   - `npx vitest run src/__tests__/release_metadata.test.ts src/__tests__/tauri_build_config.test.ts`
   - `node scripts/audit-electron-legacy-surface.js`
5. Current Electron legacy audit after host removal:
   - `entrypointCount`: `0`
   - `electronImportFileCount`: `28`
   - `supportPackageImportFileCount`: `71`
   - `forgeReferenceFileCount`: `2`
6. The declared Electron runtime host is now gone. The remaining Electron surface is library-level and handler-level imports, which now need a separate decision: keep as compatibility/runtime debt for a while, or start pruning them module by module.
7. Follow-up validation completed after the host removal:
   - `npm run build` succeeded for the Tauri renderer bundle
   - `npm run check:tauri` initially failed in generated Tauri Rust code, then passed after fixing the `Option<&str>` typing in `src-tauri/src/wave_g_domains.rs` and the unused binding warning in `src-tauri/src/wave_t_domains.rs`
8. This confirms the cutover now has a clean renderer build and a clean Rust check with the Electron host/preload removed.

## Recommended Resume Order

1. Reconcile canonical docs with the actual `Sprint 11` execution log.
2. Run a fresh contract audit to identify the true remaining Electron-only surface.
3. Keep widening `tauri-regression` only where it adds real cutover signal.
4. Introduce at least one real Tauri desktop runtime gate.
5. Finish the remaining Tauri cutover and Electron cleanup for the production release.
6. Revisit Leptos only after the Tauri-first production version is stable and accepted.
