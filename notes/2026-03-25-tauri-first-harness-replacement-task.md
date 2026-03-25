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

## Current Constraint On Further Browser-Harness Migration

1. The remaining `import.spec.ts` case is not blocked on UI automation; it is blocked on backend realism.
2. The browser-backed `tauri-regression` harness does not currently model `chat:stream`, fake server dump capture, or file-backed imported app context closely enough to replace the AI-rules prompt-context assertion safely.
3. The other remaining Electron specs also lean on real side effects rather than shallow renderer flows:
   - `app_storage_path.spec.ts`: filesystem move verification
   - `performance_monitor.spec.ts`: user-settings file writes and timed runtime sampling
   - `version_integrity.spec.ts`: version snapshots and restore behavior across real app files
4. This means the next safest direction is likely to widen the real `tauri-runtime` lane, not the browser-backed `tauri-regression` lane.

## Tauri Runtime Infrastructure Added On 2026-03-25

1. The real runtime WebdriverIO harness now supports an optional prelaunch setup module via `CHAEMERA_TAURI_RUNTIME_SETUP`.
2. The setup module runs before `tauri-driver` starts and receives:
   - `rootDir`
   - `profileRoot`
   - `localAppDataDir`
   - `appDataDir`
3. This is intended to unblock migration of remaining Electron specs that need profile/file preparation before launch.
4. The default runtime lane still passes after this addition:
   - `npm run e2e:tauri-runtime`

## Additional Verification On 2026-03-25: Performance Monitor Migrated To Real Tauri Runtime

1. `performance_monitor` no longer depends on the Electron regression harness.
2. Tauri now carries the runtime lifecycle parity needed for this flow:
   - startup force-close detection from persisted settings
   - `isRunning` persistence
   - runtime performance sampling
   - `force-close-detected` event delivery to the renderer
   - final sampling on clean exit
3. The implementation lives in:
   - `src-tauri/src/runtime_lifecycle.rs`
   - `src-tauri/src/lib.rs`
   - `src-tauri/src/core_domains.rs`
4. The real runtime coverage now lives in:
   - `testing/tauri-webdriver/run-suite.mjs`
   - `testing/tauri-webdriver/runtime_profile.mjs`
   - `testing/tauri-webdriver/specs/performance-force-close.e2e.mjs`
   - `testing/tauri-webdriver/specs/performance-clean-shutdown.e2e.mjs`
   - `testing/tauri-webdriver/specs/performance-sampling.e2e.mjs`
5. The old Electron-only spec has been removed:
   - `e2e-tests/performance_monitor.spec.ts`
6. A concrete Windows runtime-test constraint was discovered and fixed:
   - under `tauri-driver`, Windows known-folder resolution does not honor `APPDATA` overrides for `app.path().app_data_dir()`
   - the Tauri settings helper now respects `CHAEMERA_TAURI_APP_DATA_DIR` so runtime setup modules can prepare an isolated profile deterministically
7. Another concrete parity bug was fixed during this migration:
   - Rust serialization was producing `memoryUsageMb` / `systemMemoryUsageMb` / `systemMemoryTotalMb`
   - this now matches the existing frontend contract exactly as `memoryUsageMB` / `systemMemoryUsageMB` / `systemMemoryTotalMB`
8. Validation for this slice passed with:
   - `cargo check --manifest-path src-tauri/Cargo.toml`
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
   - `npm run ts`
   - `npm run lint`
   - `npm run audit:tauri-cutover`
   - `npm run audit:electron-legacy`

## Updated Remaining Direct Electron Spec Usage

1. After removing `e2e-tests/performance_monitor.spec.ts`, direct `electronApp` usage in spec files is now limited to:
   - `e2e-tests/app_storage_path.spec.ts`
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`
2. The next reduction slice should target these three files through the real `tauri-runtime` lane, not the browser-backed `tauri-regression` lane.

## Additional Verification On 2026-03-25: App Storage Migrated To Real Tauri Runtime

1. `app_storage_path` no longer depends on the Electron regression harness.
2. Tauri now owns the runtime infrastructure needed for file-backed app-move coverage:
   - explicit runtime overrides for the SQLite `userData` directory
   - explicit runtime overrides for the `dyad-apps` workspace root
   - Tauri-side SQLite bootstrap by applying the checked-in `drizzle/*.sql` migration set when the database is missing
3. The implementation lives in:
   - `src-tauri/src/sqlite_support.rs`
   - `src-tauri/src/wave_h_domains.rs`
   - `testing/tauri-webdriver/wdio.conf.mjs`
   - `testing/tauri-webdriver/runtime_profile.mjs`
   - `testing/tauri-webdriver/test_helpers.mjs`
4. The real runtime coverage now lives in:
   - `testing/tauri-webdriver/specs/app-storage-location.e2e.mjs`
5. The old Electron-only spec has been removed:
   - `e2e-tests/app_storage_path.spec.ts`
6. A concrete runtime constraint was resolved during this slice:
   - filesystem-backed runtime commands must not write into repo-local or user-home paths during tests
   - the runtime harness now passes `CHAEMERA_TAURI_USER_DATA_DIR` and `CHAEMERA_TAURI_DYAD_APPS_DIR`
7. Another concrete runtime gap was resolved during this slice:
   - `create-app` in Tauri could not run against a fresh profile because `open_db()` failed when `sqlite.db` did not already exist
   - Tauri now bootstraps the database from the Drizzle migration journal when needed
8. Validation for this slice passed with:
   - `cargo fmt --manifest-path src-tauri/Cargo.toml`
   - `cargo check --manifest-path src-tauri/Cargo.toml`
   - `npm run ts`
   - `npm run lint`
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
   - `npm run audit:electron-legacy`

## Updated Remaining Direct Electron Spec Usage

1. After removing `e2e-tests/app_storage_path.spec.ts`, direct `electronApp` usage in spec files is now limited to:
   - `e2e-tests/import.spec.ts`
   - `e2e-tests/version_integrity.spec.ts`
2. The next reduction slice should treat both remaining specs as real `tauri-runtime` candidates:
   - `import.spec.ts` is blocked on AI-rules prompt-context and runtime stream/file realism
   - `version_integrity.spec.ts` is blocked on version snapshots and restore behavior across real app files

## Additional Verification On 2026-03-25: Import AI_RULES Flow Migrated To Real Tauri Runtime

1. `import.spec.ts` no longer depends on the Electron regression harness and has been removed.
2. The real runtime suite now covers the remaining high-signal import case through:
   - `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
   - `testing/tauri-webdriver/specs/import-with-ai-rules.setup.mjs`
   - `testing/tauri-webdriver/run-suite.mjs`
3. The old `"[dump]"` prompt-context assertion has been replaced with a targeted unit test for imported app context extraction:
   - `src/__tests__/import_app_context.test.ts`
4. A concrete Tauri parity gap was discovered and fixed during this slice:
   - post-import runtime queries like `list-versions` and `get-current-branch` were logging `payload is not ready` errors because `import-app` did not register runtime metadata
   - `import-app` now returns `resolvedPath`, `installCommand`, and `startCommand`
   - `src/ipc/runtime/app_path_registry.ts` now tracks imported-app metadata immediately
5. This slice passed with:
   - `npm run build`
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
   - `npm run test`
   - `npm run ts`
   - `npm run lint`
   - `cargo check --manifest-path src-tauri/Cargo.toml`
   - `npm run audit:tauri-cutover`
   - `npm run audit:electron-legacy`

## Updated Remaining Direct Electron Spec Usage

1. After removing `e2e-tests/import.spec.ts`, direct `electronApp` usage in spec files is now limited to:
   - `e2e-tests/version_integrity.spec.ts`
2. The final remaining Electron runtime-regression candidate is now `version_integrity`, and it should be treated as a real `tauri-runtime` migration rather than a browser-harness task.

## Additional Verification On 2026-03-25: Version Integrity Migrated To Real Tauri Runtime

1. `version_integrity.spec.ts` no longer depends on the Electron regression harness and has been removed.
2. The real runtime suite now covers version checkout and restore behavior through:
   - `testing/tauri-webdriver/specs/version-integrity.e2e.mjs`
   - `testing/tauri-webdriver/specs/version-integrity.setup.mjs`
   - `testing/tauri-webdriver/run-suite.mjs`
3. A concrete Tauri runtime test constraint was resolved during this slice:
   - the version-history row selector could not rely on the old Electron text assumptions or raw container matching
   - the stable runtime interaction is to click the visible `Init Chaemera app` message row and then wait for `Restore to this version` to become visible before asserting filesystem checkout
4. This slice passed with:
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
   - `npm run ts`
   - `npm run lint`
   - `npm run audit:tauri-cutover`
   - `npm run audit:electron-legacy`

## Updated Remaining Direct Electron Spec Usage

1. There are now no remaining direct `electronApp` usages in `e2e-tests` spec files.
2. The next reduction slice should stop treating Electron as a test-runtime dependency and instead target the legacy harness surface itself:
   - `build:test-electron-harness`
   - `pre:e2e:electron-regression`
   - `e2e:electron`
   - `playwright.config.ts` Electron project wiring
   - the Electron entrypoint cluster behind that harness

## Additional Verification On 2026-03-25: Windows CI No Longer Builds Or Runs Electron Regression

1. The CI matrix now keeps broad Playwright sharding on macOS only for non-privileged authors.
2. Windows still participates in the build matrix, but now uses Tauri-only gates there:
   - `npm run pre:e2e:tauri-regression`
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
3. The Windows artifact upload no longer carries the packaged Electron `out/` directory for the sharded Playwright job.
4. This reduces Electron's CI footprint without dropping the remaining broad regression lane on macOS.
5. Validation for this slice passed with:
   - `npm run ts`
   - `npx vitest run src/__tests__/tauri_build_config.test.ts`
   - `npm run lint -- .github/workflows/ci.yml src/__tests__/tauri_build_config.test.ts`

## Additional Verification On 2026-03-25: Windows Local Full E2E Path Is Now Tauri-Only

1. The local `pre:e2e:full` script now dispatches by platform:
   - Windows: `pre:e2e:tauri-regression`
   - non-Windows: `pre:e2e:electron-regression`
2. The local `e2e:full` script now dispatches by platform:
   - Windows: `playwright test --project=tauri-regression`
   - non-Windows: `playwright test`
3. This aligns the local Windows developer flow with the CI reduction: Windows no longer tries to build or launch the Electron harness for the broad default desktop lane.
4. Validation for this slice passed with:
   - `npm run ts`
   - `npx vitest run src/__tests__/tauri_build_config.test.ts`
   - `npm run lint -- package.json scripts/prep-full-desktop-e2e.js scripts/run-full-desktop-e2e.js src/__tests__/tauri_build_config.test.ts`
   - `npm run pre:e2e:full`
   - `npm run e2e:full -- --list`

## Additional Verification On 2026-03-25: First Page-Object Spec Migrated Off Electron Fixture

1. The page-object helper layer is no longer hard-bound to Electron:
   - `e2e-tests/helpers/page-objects/PageObject.ts`
   - `e2e-tests/helpers/page-objects/components/AppManagement.ts`
2. A new browser-backed Tauri page-object fixture now exists:
   - `e2e-tests/helpers/tauri_page_object_fixtures.ts`
   - `e2e-tests/helpers/tauri_test_helper.ts`
3. `playwright.config.ts` now routes all `tauri-*.spec.ts` files to the `tauri-regression` project and excludes them from `electron-regression`.
4. The first broad page-object spec successfully migrated through this new path:
   - `e2e-tests/tauri-delete-provider.spec.ts`
   - the old `e2e-tests/delete_provider.spec.ts` file has been removed
5. A concrete triage rule was learned during this slice:
   - not every Electron page-object spec is a good first Tauri candidate
   - `chat_panel_toggle.spec.ts` depends on preview/runtime state, so preview-driven specs should not be the first migration batch
   - settings/apps flows without preview lifecycle or filesystem snapshots are better first movers
6. Validation for this slice passed with:
   - `npm run ts`
   - `npm run lint -- e2e-tests/helpers/page-objects/PageObject.ts e2e-tests/helpers/page-objects/components/AppManagement.ts e2e-tests/helpers/page-objects/components/Navigation.ts e2e-tests/helpers/tauri_page_object_fixtures.ts e2e-tests/helpers/tauri_test_helper.ts e2e-tests/tauri-delete-provider.spec.ts playwright.config.ts`
   - `npx playwright test --project=tauri-regression e2e-tests/tauri-delete-provider.spec.ts`

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
6. Treat the performance-monitor, app-storage, import-with-AI-rules, and version-integrity slices as complete runtime templates.
7. Focus next on removing the legacy Electron harness wiring rather than migrating another spec.
8. Use the current real `tauri-runtime` suite as the replacement confidence base for deleting the Electron harness and entrypoint cluster.
