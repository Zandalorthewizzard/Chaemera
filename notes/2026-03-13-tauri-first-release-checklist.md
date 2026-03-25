# Tauri-First Release Checklist

Date: 2026-03-13
Branch: `refactor/leptos-tauri2`

## Current Objective

Ship a production-ready `Tauri 2` desktop app with current functional parity for the supported Chaemera product surface, while removing Electron as the runtime and delivery path.

Related gate note:

1. `notes/2026-03-13-tauri-regression-gate-before-electron-removal.md`
2. `notes/2026-03-25-tauri-first-harness-replacement-task.md`

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
   - the old product-facing Electron scripts (`start:electron`, `package:electron`, `make`, `publish`) have been removed
   - the remaining Electron build path is now explicit test infrastructure only: `build:test-electron-harness`
7. E2E prep is now split into explicit lanes:
   - `pre:e2e:tauri-smoke`
   - `pre:e2e:electron-regression`
   - `pre:e2e` now defaults to the Tauri regression lane for local development
   - `pre:e2e:full` and `pre:e2e:ci` keep the full Electron-plus-Tauri lane explicit
8. CI build wiring is now more explicit:
   - local `build` and `e2e` now default to the Tauri regression lane
   - CI uses explicit `pre:e2e:ci` and `e2e:ci` for the broader desktop lane
   - Tauri runtime check calls `check:tauri`
9. The browser-backed Tauri harness is now widened into a named regression lane:
   - `tauri-regression` runs both `e2e-tests/tauri-smoke.spec.ts` and `e2e-tests/tauri-regression.spec.ts`
   - compatibility aliases still keep the old `tauri-smoke` script names working
10. CI now runs `npm run audit:tauri-cutover` as an explicit build-time Tauri parity gate.
11. An Electron legacy inventory command now exists:

- `npm run audit:electron-legacy`
- use it to drive the next deletion pass instead of relying on ad hoc grep-only review

12. Current Electron legacy inventory snapshot:
    - `5` entrypoint/config files still exist: `src/main.ts`, `src/preload.ts`, `forge.config.ts`, `vite.main.config.mts`, `vite.preload.config.mts`
    - `30` tracked files still import from `electron`
    - `74` tracked files still import `electron-log`
    - `7` tracked files still reference Electron Forge
    - Electron is no longer part of the product-facing npm or release surface
    - the remaining Electron script/workflow surface is now limited to legacy regression harness support
13. Post-toolchain validation on 2026-03-25:

- `npm run ts` passed
- `npx vitest run src/__tests__/tauri_build_config.test.ts` passed
- `npm run build` passed through the Tauri regression prep lane
- `npm run e2e` passed and now resolves to the Tauri regression project

14. Real Tauri desktop runtime validation now exists:

- `build:tauri-runtime-app`
- `pre:e2e:tauri-runtime`
- `e2e:tauri-runtime`
- an isolated WebdriverIO runner under `testing/tauri-webdriver/`
- a real runtime boot check against `src-tauri/target/debug/chaemera-tauri.exe`

15. The real runtime gate required two concrete fixes:

- a renderer fallback to `@tauri-apps/api/event` when `window.__TAURI_INTERNALS__` exposes `invoke` but not a usable event bridge
- an explicit capability file at `src-tauri/capabilities/default.json` so the `main` window receives `core:default` and therefore `core:event:default`

16. Full post-fix validation on 2026-03-25:

- `npm run ts` passed
- `npm run test` passed with `682` tests
- `npm run check:tauri` passed
- `npm run audit:tauri-cutover` passed with `0` missing mappings or handlers
- `npm run e2e:tauri-runtime` passed without `SEVERE` browser errors

17. CI now has an explicit Windows-only real Tauri runtime gate in addition to the broader legacy desktop lane:

- install `tauri-driver`
- install `msedgedriver-tool`
- run `pre:e2e:tauri-runtime`
- run `e2e:tauri-runtime`

18. The remaining Electron Forge harness is now package-only:

- `forge.config.ts` no longer carries maker or GitHub publisher definitions
- `makers/MakerAppImage.ts` has been removed
- `build:test-electron-harness` still passes after this reduction

19. The browser-backed `tauri-regression` lane now covers import/storage dialog flows without Electron helpers:

- import app with copy enabled
- import app in place
- move app folder from app details
- verified by `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`

20. Electron dialog stubbing is now localized to a project-owned helper instead of direct spec-level reliance on `electron-playwright-helpers`:

- `e2e-tests/helpers/electron_dialog_stub.ts`
- page objects and Electron import/storage/version-integrity specs now use the local helper

21. External `electron-playwright-helpers` usage has now been removed entirely from active test code:

- `e2e-tests/helpers/electron_build_info.ts` now provides packaged Electron build discovery and launch info
- `e2e-tests/helpers/fixtures.ts` now uses the project-owned helper instead of the npm package
- `electron-playwright-helpers` has been removed from `package.json`

22. Renderer deep-link regression no longer depends on Electron main-process event injection:

- `e2e-tests/add_prompt_deep_link.spec.ts` and `e2e-tests/add_mcp_server_deep_link.spec.ts` have been removed
- `e2e-tests/tauri-regression.spec.ts` now covers both flows through the harness `deep-link-received` event path
- there are now no direct `electronApp.evaluate(({ app }) => app.emit(...))` usages left in `e2e-tests`
- verified with `npm run build:tauri-regression`, `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`, `npm run ts`, and `npm run lint`

23. The trivial Electron-only boot smoke has been migrated out of the legacy lane:

- `e2e-tests/1.spec.ts` has been removed
- `e2e-tests/tauri-smoke.spec.ts` now verifies the default `/` home route, title bar no-selection state, and home chat input visibility
- verified with `npm run build:tauri-regression`, `npx playwright test --project=tauri-regression e2e-tests/tauri-smoke.spec.ts`, `npm run ts`, and `npm run lint`

24. Import-dialog validation is now broader in the `tauri-regression` lane:

- missing-`AI_RULES.md` feedback is covered
- advanced-options validation and persisted custom commands are covered
- `e2e-tests/import_in_place.spec.ts` has been removed
- `e2e-tests/import.spec.ts` has been narrowed to the remaining AI-rules-specific prompt-context case
- verified with `npm run build:tauri-regression`, `npx playwright test --project=tauri-regression e2e-tests/tauri-regression.spec.ts`, `npm run pre:e2e:electron-regression`, `npx playwright test --project=electron-regression e2e-tests/import.spec.ts`, `npm run ts`, and `npm run lint`

25. The old Electron-only performance-monitor regression has been migrated into the real `tauri-runtime` lane:

- Tauri now owns startup force-close detection, runtime performance sampling, and clean-exit persistence in `src-tauri/src/runtime_lifecycle.rs`
- the Windows runtime harness now uses an explicit `CHAEMERA_TAURI_APP_DATA_DIR` override for settings isolation because `app.path().app_data_dir()` does not follow `APPDATA` overrides under `tauri-driver`
- the runtime suite now runs dedicated performance specs through `testing/tauri-webdriver/run-suite.mjs`
- `e2e-tests/performance_monitor.spec.ts` has been removed
- verified with `cargo check --manifest-path src-tauri/Cargo.toml`, `npm run pre:e2e:tauri-runtime`, `npm run e2e:tauri-runtime`, `npm run ts`, `npm run lint`, `npm run audit:tauri-cutover`, and `npm run audit:electron-legacy`

26. The old Electron-only app-storage regression has been migrated into the real `tauri-runtime` lane:

- Tauri runtime now supports explicit isolated overrides for both SQLite `userData` and the `dyad-apps` workspace root
- Tauri now bootstraps `sqlite.db` from the checked-in Drizzle migration journal when a runtime profile starts from an empty database
- the real runtime suite now includes `testing/tauri-webdriver/specs/app-storage-location.e2e.mjs`
- `e2e-tests/app_storage_path.spec.ts` has been removed
- verified with `cargo fmt --manifest-path src-tauri/Cargo.toml`, `cargo check --manifest-path src-tauri/Cargo.toml`, `npm run ts`, `npm run lint`, `npm run pre:e2e:tauri-runtime`, `npm run e2e:tauri-runtime`, and `npm run audit:electron-legacy`

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
2. CI and broad regression still keep a legacy Electron harness:
   - `build:test-electron-harness`
   - `pre:e2e:electron-regression`
   - `e2e:electron`
   - current Forge reference count is down to `5`
   - the remaining question is now whether this legacy lane still covers anything not already exercised by `tauri-regression` plus the real `tauri-runtime` gate
   - the remaining direct Electron spec usage is now concentrated in import AI-rules prompt context and version integrity coverage
   - these remaining cases look more like `tauri-runtime` expansion work than additional browser-harness migration because they depend on real stream/file/runtime side effects
   - the real runtime harness now has a prelaunch setup hook path for preparing profile and file state before app launch
3. CI is still not fully Tauri-first for broad regression:
   - `.github/workflows/ci.yml`
   - CI still uses the broader Electron-plus-Tauri lane as the full desktop proof path
   - the new `tauri-regression` lane is still browser-backed, not a real desktop runtime
4. There is no signed production Tauri release workflow yet:
   - `.github/workflows/release-tauri-preview.yml` remains a preview artifact lane, not a final signed release lane
5. There are still Electron-only implementation files that become removable only after script/CI cutover:
   - `src/ipc/handlers/window_handlers.ts`
   - `src/ipc/utils/telemetry.ts`
   - `src/ipc/handlers/debug_handlers.ts`
   - `src/ipc/handlers/github_handlers.ts`
   - other main-process handlers registered via `src/ipc/ipc_host.ts`

## Environment Constraints In This Workspace

1. `node_modules` is present.
2. `cargo` and `rustup` are available in `PATH`.
3. Visual Studio Build Tools are installed, but `cl.exe` is still expected to run through the Visual Studio developer environment rather than a plain PowerShell `PATH`.
4. The validated local commands in this workspace are currently:
   - `npm run ts`
   - `npx vitest run src/__tests__/tauri_build_config.test.ts`
   - `npm run build`
   - `npm run e2e`
5. The wider suite still needs follow-up verification:
   - full CI/full-lane desktop regression

## Recommended Next Work Order

1. Restore local toolchains:
   - install project npm dependencies
   - ensure Rust + Tauri CLI are available in `PATH`
2. Keep Electron confined to explicit legacy test-harness paths only while widening Tauri runtime coverage.
3. Convert CI from the current explicit Electron-plus-Tauri full lane to a real Tauri-first desktop gate.
4. Replace the removed Electron legacy release workflow with a real Tauri release path before calling the cutover complete.
5. Run `npm run audit:electron-legacy` and use its output to sequence the next Electron deletion pass.
6. Delete `src/main.ts`, `src/preload.ts`, `forge.config.ts`, and Electron-only handlers only after the new Tauri build/test path is working.
7. Treat `notes/2026-03-13-tauri-regression-gate-before-electron-removal.md` as a hard gate before final Electron removal.
8. Treat the current `tauri-regression` lane as an intermediate gate only:
   - it is broader than `tauri-smoke`
   - it is still not sufficient to delete Electron entrypoints without a real Tauri runtime lane
   - but it now covers import/storage dialog regressions that previously required Electron-only dialog stubs
9. Use the real Tauri runtime lane as the new hard checkpoint before each Electron deletion pass:
   - `npm run pre:e2e:tauri-runtime`
   - `npm run e2e:tauri-runtime`
10. The next deletion target should still be the Electron entrypoint cluster, but only after the broader Tauri gate replaces the legacy harness:

- `src/main.ts`
- `src/preload.ts`
- `forge.config.ts`
- `vite.main.config.mts`
- `vite.preload.config.mts`

11. Keep the new Tauri permissions and event bridge pieces intact while removing Electron:

- `src/ipc/runtime/bootstrap_tauri_core_bridge.ts`
- `src-tauri/capabilities/default.json`

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
6. Electron legacy inventory:
   - `scripts/audit-electron-legacy-surface.js`
7. Real Tauri runtime harness:
   - `scripts/build-tauri-runtime-app.js`
   - `testing/tauri-webdriver/wdio.conf.mjs`
   - `testing/tauri-webdriver/specs/boot.e2e.mjs`
8. Tauri event bridge fallback and permissions:
   - `src/ipc/runtime/bootstrap_tauri_core_bridge.ts`
   - `src/__tests__/tauri_wave_c_transport.test.ts`
   - `src-tauri/capabilities/default.json`
