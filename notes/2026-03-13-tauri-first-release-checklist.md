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
   - `start`
   - `package`
   - `make`
   - `publish`
   - `build`
   - `pre:e2e`
3. CI is still Electron-first for regression:
   - `.github/workflows/ci.yml`
   - Playwright default project still includes `electron-regression`
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
