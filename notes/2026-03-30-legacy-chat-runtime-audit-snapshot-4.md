# 2026-03-30 Legacy Chat Runtime Audit Snapshot 4

Status: working note, non-canonical.

## Purpose

This snapshot records the next audit slice after snapshot 3, focused on the remaining `app-details` runtime path and on suspicious runtime app-root environment alignment.

## Confirmed Findings

### 1. The old `chat-from-app-details` failure was not the runtime core anymore

After the chat runtime protocol fixes from snapshot 3, the remaining failing spec turned out to be blocked by stale test setup assumptions.

Confirmed behavior before the fix:

- `create-app` invoked through the hidden Tauri core bridge successfully created the app in the database
- but the live renderer shell did **not** automatically refresh its React Query app list just because the hidden core command mutated state underneath it
- as a result:
  - the title bar stayed at `(no app selected)`
  - the sidebar did not immediately show the new app item
  - `browser.refresh()` was being used as a recovery mechanism in the spec
- that made the spec measure the wrong thing: shell cache invalidation instead of the `app-details -> Open in Chat` runtime path itself

Evidence from debug run:

- `list-apps` via the Tauri bridge returned the new app
- the live shell still showed no selected app and no visible new sidebar item until a direct route transition was forced

### 2. `app-details` route itself did not synchronize selected app state

Confirmed product/runtime bug:

- navigating directly to `/app-details?appId=...` rendered the page and the `Open in Chat` button
- but the title bar still showed `(no app selected)`
- root cause: `src/pages/app-details.tsx` depended on prior sidebar selection state instead of synchronizing `selectedAppIdAtom` from the route parameter on mount/search change

Fix applied:

- `src/pages/app-details.tsx`
  - now syncs `selectedAppIdAtom` from `search.appId` via `useEffect`

Impact:

- direct route entry into `app-details` now behaves as a proper first-class state source
- title bar and chat/open flows can rely on route state instead of previous shell interaction ordering

### 3. The `chat-from-app-details` runtime spec is now valid and passing

Spec update:

- `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
  - no longer relies on `browser.refresh()` plus sidebar re-selection after hidden `create-app`
  - now opens the created route directly with `/app-details?appId=...`
  - then verifies that the title bar selection synchronizes correctly before continuing to `Open in Chat`

Validation result:

- `npx wdio run wdio.conf.mjs --spec ./specs/chat-from-app-details.e2e.mjs`
  - now `passes`

What this now proves live:

- `app-details` route can be entered directly in the Tauri desktop shell
- route-derived selected app state is restored correctly
- `Open in Chat` transitions into the real chat workspace
- the chat worker lane streams correctly on this path too

### 4. Runtime apps-dir override mismatch was real

Confirmed mismatch:

- runtime code in `src/paths/paths.ts` expects `CHAEMERA_TAURI_CHAEMERA_APPS_DIR`
- the Tauri WebDriver harness had only been exporting `CHAEMERA_TAURI_APPS_DIR`
- as a result, some worker/app file activity still fell back to the real home directory app root instead of the isolated runtime profile root

Visible symptom before the fix:

- worker writes landed under paths like:
  - `C:/Users/zand/chaemera-apps/...`

Fix applied:

- `testing/tauri-webdriver/wdio.conf.mjs`
  - now exports both `CHAEMERA_TAURI_APPS_DIR` and `CHAEMERA_TAURI_CHAEMERA_APPS_DIR`
- `testing/tauri-webdriver/runtime_profile.mjs`
  - now resolves the apps dir from the canonical env var first, with fallback for compatibility

Validation result:

- rerunning `chat-from-app-details.e2e.mjs` now shows worker file writes under the isolated runtime profile:
  - `...\chaemera-tauri-webdriver-...\app-roots\...`

## Updated Capability Interpretation

These routes are now positively live-proven in the Tauri runtime lane:

- home composer -> create app -> chat stream
- direct app-details route -> Open in Chat -> chat stream

This significantly reduces uncertainty around the chat/AI migration scope.

The remaining unknowns are now more concentrated in adjacent flows such as import/setup-specific UX rather than in the core chat runtime itself.

## New Remaining Failure Boundary

After the above fixes, the next failing runtime spec encountered was:

- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`

Current failure point:

- after `Import App` and `Select Folder`
- the expected rename/import dialog input never appears:
  - `//input[@placeholder="Enter new app name"]`

Current interpretation:

- this is now a separate import-flow/runtime-picker problem
- it is not evidence that the core chat runtime path is still broken

## Validation Commands Run In This Slice

- `npm run pre:e2e:tauri-runtime`
- `npx vitest run src/__tests__/db_path.test.ts src/ipc/chat_runtime/__tests__/chat_worker_runner.test.ts`
- `npx wdio run wdio.conf.mjs --spec ./specs/chat-from-app-details.e2e.mjs`
- `npx wdio run wdio.conf.mjs --spec ./specs/import-with-ai-rules.e2e.mjs`

## Recommended Next Audit Move

1. Record core chat/runtime rows as live-proven on both home and app-details entry paths.
2. Move the next investigation to the import runtime lane.
3. Classify import-related failures separately from chat-runtime migration scope so the final audit does not overstate chat breakage.
