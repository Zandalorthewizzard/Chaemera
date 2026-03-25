## Task: Replace Remaining Electron Test Harness With Tauri-First Coverage

Date: 2026-03-25
Status: in progress
Branch: `refactor/leptos-tauri2`

## Context

The product and release surface is already Tauri-first.

Electron is no longer part of:

1. default local runtime scripts
2. release workflow surface
3. production packaging intent

The remaining Electron layer is now a legacy test harness only.

## Why This Task Exists

The final Electron entrypoint cluster cannot be removed safely while broad desktop regression still depends on:

1. `electron-regression` in `playwright.config.ts`
2. `build:test-electron-harness`
3. `pre:e2e:electron-regression`
4. `e2e:electron`
5. `electron-playwright-helpers` in the Playwright fixture layer

## Short-Term Goal

Replace the highest-value Electron-based desktop regression dependencies with Tauri-first coverage until the Electron harness stops being a test blocker.

## Ordered Work Plan

1. Inventory the remaining Electron-based Playwright and fixture dependencies.
2. Identify the smallest high-signal user flows that still require Electron helpers.
3. Replace or isolate those helpers with Tauri-first equivalents where practical.
4. Move `pre:e2e:ci` and `e2e:ci` off the Electron harness once Tauri coverage is sufficient.
5. Only after that, delete:
   - `src/main.ts`
   - `src/preload.ts`
   - `forge.config.ts`
   - `vite.main.config.mts`
   - `vite.preload.config.mts`

## Current Confirmed State

1. Real Tauri runtime validation exists and passes locally:
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
2. Windows CI now includes a real Tauri runtime gate.
3. `audit:electron-legacy` still reports:
   - `entrypointCount: 5`
   - `electronScriptCount: 3`
   - `forgeReferenceFileCount: 5`
   - `workflowReferenceFileCount: 0`
4. Remaining Electron Playwright helper usage is currently concentrated in:
   - `e2e-tests/helpers/fixtures.ts`
   - `e2e-tests/helpers/page-objects/components/AppManagement.ts`
   - `e2e-tests/app_storage_path.spec.ts`
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/import_in_place.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`

## Slice Completed On 2026-03-25

1. The browser-backed `tauri-regression` harness now supports controlled replacements for native folder dialogs:
   - `select-app-folder`
   - `select-app-location`
   - `check-ai-rules`
2. The harness exposes explicit test controls for those dialogs through:
   - `window.__CHAEMERA_TAURI_SMOKE__.setNextSelectedAppFolder(...)`
   - `window.__CHAEMERA_TAURI_SMOKE__.setNextSelectedAppLocation(...)`
3. `e2e-tests/tauri-regression.spec.ts` now covers, without Electron helpers:
   - import app with copy-to-apps enabled
   - import app in place
   - move app folder from app details
4. This slice passed with:
   - `npm run lint`
   - `npm run ts`
   - `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`

## What This Reduced

1. Import and app-storage regression no longer require Electron-only dialog stubbing to stay covered in the Tauri-first lane.
2. Electron dialog stubbing no longer depends on the external `electron-playwright-helpers` package in:
   - `e2e-tests/helpers/page-objects/components/AppManagement.ts`
   - `e2e-tests/app_storage_path.spec.ts`
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/import_in_place.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`
3. Electron build discovery and packaged main resolution are now also project-owned:
   - `e2e-tests/helpers/electron_build_info.ts`
   - `e2e-tests/helpers/fixtures.ts`
4. `electron-playwright-helpers` has been removed from active code and npm dependencies.

## Next Likely Slice

1. Revisit whether the Windows-skipped import/version-integrity specs are still worth keeping once Tauri-first coverage is broad enough.
2. Reassess whether `electron-regression` itself can shrink further without lowering release confidence.
3. Once the remaining Electron fixture value is understood, use that to decide whether `build:test-electron-harness` and the `electron-regression` Playwright project can be downgraded or removed.

## Additional Verification On 2026-03-25

1. Local replacement of the dialog stub helper passed:
   - `npm run ts`
   - `npm run lint`
   - `npm run pre:e2e:electron-regression`
   - `npx playwright test --project=electron-regression e2e-tests/import.spec.ts e2e-tests/import_in_place.spec.ts e2e-tests/app_storage_path.spec.ts e2e-tests/version_integrity.spec.ts`
2. On this Windows workspace only the non-skipped Electron regression case executed at runtime:
   - `e2e-tests/app_storage_path.spec.ts`
3. The Windows-skipped import/version-integrity specs remain compile-checked here, while functional import/storage coverage is now exercised in the Tauri-first lane.
4. After replacing fixture bootstrap helpers and removing the package dependency, the remaining Electron bootstrap path still passed:
   - `npm run ts`
   - `npm run lint`
   - `npx playwright test --project=electron-regression e2e-tests/chat_mode.spec.ts --grep "default build mode"`

## Non-Goals

1. Do not archive Electron runtime files inside the active repo tree.
2. Do not remove the remaining Electron harness before an equivalent Tauri-first gate exists.
3. Do not expand this task into a full UI redesign or Leptos migration.

## Resume Point

1. Read this note.
2. Re-run:
   - `npm run audit:electron-legacy`
   - `rg -n "electron-playwright-helpers|electron-regression" -g '!node_modules' -g '!docs-new' .`
3. Treat the import/storage slice as complete and focus next on the remaining Electron fixture concentration.
4. Pick the next smallest replacement slice that reduces real harness dependency without lowering regression signal.
