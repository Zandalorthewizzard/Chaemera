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

## Additional Verification On 2026-03-25: Deep-Link Renderer Flows

1. Renderer-consumed deep-link flows now pass in the `tauri-regression` lane without Electron main-process event injection:
   - prompt creation via `deep-link-received`
   - MCP server form prefill via `deep-link-received`
2. The following Electron-only specs have been removed because the meaningful behavior is renderer-side and now covered through the harness event bridge:
   - `e2e-tests/add_prompt_deep_link.spec.ts`
   - `e2e-tests/add_mcp_server_deep_link.spec.ts`
3. This also removes the last direct `electronApp.evaluate(({ app }) => app.emit(...))` pattern from `e2e-tests`.
4. Validation for this slice passed with:
   - `npm run build:tauri-regression`
   - `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`
   - `npm run ts`
   - `npm run lint`

## Additional Verification On 2026-03-25: Home Route Smoke

1. The trivial Electron-only boot smoke in `e2e-tests/1.spec.ts` has been removed.
2. Equivalent high-level coverage now lives in `e2e-tests/tauri-smoke.spec.ts`:
   - load `/`
   - assert the `Apps` home shell
   - assert no app is selected in the title bar
   - assert the home chat input container is visible
3. This slice passed with:
   - `npm run build:tauri-regression`
   - `npx playwright test --project=tauri-regression e2e-tests/tauri-smoke.spec.ts`
   - `npm run ts`
   - `npm run lint`

## Current Remaining Direct Electron Spec Usage

1. After removing the deep-link specs and the old `1.spec.ts` smoke, direct `electronApp` usage in spec files is now limited to:
   - `e2e-tests/app_storage_path.spec.ts`
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/performance_monitor.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`
2. This is now the highest-signal inventory for the next reduction slice.

## Additional Verification On 2026-03-25: Import Advanced Options

1. The `tauri-regression` lane now covers import-dialog behavior that previously lived only in Electron specs:
   - missing `AI_RULES.md` warning state
   - default empty advanced options
   - invalid one-command-only customization state
   - persisted custom install/start commands after import
2. This makes the following legacy Electron cases redundant and removable:
   - `import app`
   - `import app with custom commands`
   - `advanced options: both cleared are valid and use defaults`
   - `import app without copying to dyad-apps`
3. The remaining Electron import coverage is now intentionally narrowed to the AI-rules-specific prompt-context case in `e2e-tests/import.spec.ts`.
4. Validation for this slice passed with:
   - `npm run build:tauri-regression`
   - `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`
   - `npm run pre:e2e:electron-regression`
   - `npx playwright test --project=electron-regression e2e-tests/import.spec.ts`
   - `npm run ts`
   - `npm run lint`

## Updated Remaining Direct Electron Spec Usage

1. After removing `import_in_place.spec.ts` and shrinking `import.spec.ts`, direct `electronApp` usage in spec files is now limited to:
   - `e2e-tests/app_storage_path.spec.ts`
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/performance_monitor.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`
2. This is the current highest-value list for the next reduction slice.

## Non-Goals

1. Do not archive Electron runtime files inside the active repo tree.
2. Do not remove the remaining Electron harness before an equivalent Tauri-first gate exists.
3. Do not expand this task into a full UI redesign or Leptos migration.

## Resume Point

1. Read this note.
2. Re-run:
   - `npm run audit:electron-legacy`
   - `rg -n "electron-regression|build:test-electron-harness|pre:e2e:electron-regression|e2e:electron" -g '!node_modules' -g '!docs-new' .`
3. Treat both the import/storage slice and the deep-link renderer slice as complete.
4. Treat the old Electron-only home smoke as migrated to `tauri-smoke`.
5. Treat import advanced-options coverage and in-place import coverage as migrated to `tauri-regression`.
6. Focus next on the remaining direct Electron spec usage list in this note.
7. Pick the next smallest replacement slice that reduces real harness dependency without lowering regression signal.
