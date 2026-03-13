# Tauri-First Release Checklist

Date: 2026-03-13
Branch: `refactor/leptos-tauri2`

## Current Objective

Ship a production-ready `Tauri 2` desktop app with current functional parity for the supported Chaemera product surface, while removing Electron as the runtime and delivery path.

Related gate note:

1. `notes/2026-03-13-tauri-regression-gate-before-electron-removal.md`

## What Was Verified

1. Added a local audit command:
   - `npm run audit:tauri-cutover`
2. Current audit result after cleanup:
   - `173` contract invoke channels
   - `19` contract receive channels
   - `173` Tauri invoke mappings
   - `19` Tauri event mappings
   - `173` Rust invoke handlers
   - `0` missing invoke mappings
   - `0` missing receive mappings
   - `0` missing Rust handlers
3. Runtime transport was tightened so migrated channels no longer silently fall back to Electron when a Tauri bridge is present.
4. Renderer zoom no longer depends on Electron `webFrame`; it now uses a runtime-neutral DOM zoom helper.
5. Electron preload API was narrowed to IPC only; `webFrame` exposure was removed.
6. Local script layer now exposes explicit Tauri entrypoints:
   - `start` -> `start:tauri`
   - `package` -> `package:tauri`
   - `build:electron-harness` now calls `package:electron` explicitly instead of relying on the default `package` alias
7. E2E prep is now split into explicit lanes:
   - `pre:e2e:tauri-smoke`
   - `pre:e2e:electron-regression`
   - current `pre:e2e` still points to the Electron regression lane for compatibility
8. CI build wiring is now more explicit:
   - current desktop build step calls `pre:e2e:electron-regression`
   - Tauri runtime check calls `check:tauri`
9. The browser-backed Tauri harness is now widened into a named regression lane:
   - `tauri-regression` runs both `e2e-tests/tauri-smoke.spec.ts` and `e2e-tests/tauri-regression.spec.ts`
   - compatibility aliases still keep the old `tauri-smoke` script names working
10. CI now runs `npm run audit:tauri-cutover` as an explicit build-time Tauri parity gate.

## Decisions Applied In This Pass

1. Removed the unused help-bot IPC surface from active code:
   - `src/ipc/types/help.ts`
   - `src/ipc/handlers/help_bot_handlers.ts`
   - `src/components/HelpBotDialog.tsx`
2. Reason:
   - the feature was not part of the active help route,
   - it depended on `helpchat.dyad.sh`,
   - it remained an unresolved branded/commercial surface,
   - keeping it in contracts was the only remaining Tauri IPC parity gap.
3. The surviving help surface is still:
   - docs link,
   - bug reporting,
   - debug bundle upload flow.

## Remaining Blockers Before Electron Can Be Fully Removed

1. Electron app bootstrap still exists:
   - `src/main.ts`
   - `src/preload.ts`
   - `forge.config.ts`
2. Default npm workflow is still Electron-first:
   - `make`
   - `publish`
   - `build`
   - `pre:e2e`
   - `build:electron-harness`
3. CI is still Electron-first for regression:
   - `.github/workflows/ci.yml`
   - Playwright default project still includes `electron-regression` as the broader desktop lane
   - the new `tauri-regression` lane is still browser-backed, not a real desktop runtime
4. There are still Electron-only implementation files that become removable only after script/CI cutover:
   - `src/ipc/handlers/window_handlers.ts`
   - `src/ipc/utils/telemetry.ts`
   - `src/ipc/handlers/debug_handlers.ts`
   - `src/ipc/handlers/github_handlers.ts`
   - other main-process handlers registered via `src/ipc/ipc_host.ts`

## Environment Constraints In This Workspace

1. `node_modules` is currently absent.
2. `cargo` is not available in `PATH`.
3. `rustup` is not available in `PATH`.
4. Because of that, this pass could not run:
   - `npm run ts`
   - `npm run test`
   - `npm run build`
   - `cargo check`

## Recommended Next Work Order

1. Restore local toolchains:
   - install project npm dependencies
   - ensure Rust + Tauri CLI are available in `PATH`
2. Introduce verified Tauri-first npm scripts and demote Electron scripts to explicit legacy names.
3. Convert CI from Electron-harness-first to Tauri-first.
4. Delete `src/main.ts`, `src/preload.ts`, `forge.config.ts`, and Electron-only handlers only after the new Tauri build/test path is working.
5. Treat `notes/2026-03-13-tauri-regression-gate-before-electron-removal.md` as a hard gate before final Electron removal.
6. Treat the current `tauri-regression` lane as an intermediate gate only:
   - it is broader than `tauri-smoke`
   - it is still not sufficient to delete Electron entrypoints without a real Tauri runtime lane

## Evidence Pointers

1. Audit script:
   - `scripts/audit-tauri-cutover.js`
2. Strict runtime boundary:
   - `src/ipc/runtime/desktop_runtime.ts`
   - `src/__tests__/desktop_runtime.test.ts`
3. Renderer-neutral zoom:
   - `src/lib/app_zoom.ts`
   - `src/__tests__/app_zoom.test.ts`
   - `src/app/layout.tsx`
4. Tauri channel registry:
   - `src/ipc/runtime/core_domain_channels.ts`
   - `src-tauri/src/lib.rs`
5. Tauri regression harness:
   - `playwright.config.ts`
   - `e2e-tests/tauri-smoke.spec.ts`
   - `e2e-tests/tauri-regression.spec.ts`
