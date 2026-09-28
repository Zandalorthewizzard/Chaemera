# 2026-04-03 UI Dev Browser Mode Plan

## Context

Current UI iteration on Chaemera is too slow when it depends on repeated Tauri runtime rebuilds or launching a rebuilt desktop executable just to inspect styling changes.

This note records a proposed implementation plan for a browser-first UI workflow that keeps the real Chaemera renderer and shell, but replaces the desktop runtime dependency with a dev-only mock desktop bridge.

This is a working plan, not canonical architecture.

## Research Summary

1. Chaemera already has the correct Tauri dev split:
   - `src-tauri/tauri.conf.json` uses `beforeDevCommand`, `devUrl`, and `frontendDist`.
   - `package.json` already separates renderer dev, Tauri dev, renderer build, and runtime build.
2. The renderer already routes desktop access through a unified IPC boundary:
   - `src/renderer.tsx`
   - `src/ipc/contracts/core.ts`
   - `src/ipc/runtime/desktop_runtime.ts`
3. The project already has a browser-backed Tauri harness for Playwright regression:
   - `e2e-tests/helpers/tauri_smoke_fixtures.ts`
4. The main problem is not lack of architecture, but lack of an official browser dev mode for the real renderer.

## Goal

Create a fast `ui:dev` workflow for the UI branch that:

1. runs the real Chaemera renderer in a browser via Vite
2. injects a dev-only mock desktop bridge
3. supports stable mock scenarios for theme and shell work
4. leaves production, Tauri dev, and runtime build flows unchanged

## Non-goals

1. Do not replace the real Tauri integration flow.
2. Do not rewrite the IPC contract system.
3. Do not make the browser mode a source of truth for native behavior.
4. Do not attempt full runtime parity in the first pass.

## Proposed Workflow Model

### Primary lane

`ui:dev`

- browser-first renderer development
- main use: theme, shell, layout, states, spacing, density, visual review

### Secondary lane

`storybook`

- isolated primitive and component review
- main use: buttons, dialogs, inputs, menus, shell subsections

### Integration lane

`start:tauri`

- real Tauri dev runtime
- main use: titlebar, window controls, native IPC seams, preview/runtime integration

### Runtime lane

`pre:e2e:tauri-runtime` + launched exe

- milestone validation only
- not a primary UI development surface

## Implementation Plan

### Step 1: Add a dev-only mock desktop bridge module

Create:

- `src/ipc/dev/mock_desktop_bridge.ts`
- `src/ipc/dev/mock_state.ts`
- optional `src/ipc/dev/scenarios/*.ts`

Purpose:

1. install `window.__CHAEMERA_TAURI_CORE__` when running in browser UI mode
2. support a minimal subset of channels needed by the renderer shell
3. keep fake state for settings, app list, chat list, selected app/chat, and preview mode

Initial scope should be intentionally narrow.

### Step 2: Reuse existing browser-backed harness knowledge

Use `e2e-tests/helpers/tauri_smoke_fixtures.ts` as the extraction source for:

1. channel mapping
2. fake settings defaults
3. minimal event emit/subscribe behavior
4. basic invoke-response mocks

Do not import the Playwright fixture file directly into renderer code.
Instead, copy or extract only the reusable bridge logic into `src/ipc/dev/`.

### Step 3: Gate the mock bridge behind an env flag

Update `src/renderer.tsx` so that:

1. if a real desktop bridge exists, use it normally
2. if `VITE_UI_DEV=true` and no real bridge exists, install the mock bridge before normal renderer bootstrap
3. otherwise, preserve current behavior

This keeps production and normal Tauri dev behavior unchanged.

### Step 4: Add dedicated scripts

Add scripts in `package.json`:

1. `ui:dev` -> Vite renderer dev with `VITE_UI_DEV=true`
2. `ui:build` -> optional browser build with the same flag
3. `ui:tauri` -> alias to current Tauri dev flow for integration checks

Recommended lane usage:

1. `npm run ui:dev` for most UI work
2. `npm run storybook` for component polish
3. `npm run start:tauri` for integration checks
4. `npm run pre:e2e:tauri-runtime` only for milestone desktop validation

### Step 5: Add stable UI scenarios

Create a small set of presets, for example:

1. `default-shell`
2. `active-chat`
3. `settings`
4. `empty-state`
5. `preview-loaded`
6. `error-state`

Expose them through one of:

1. query param like `?uiScenario=active-chat`
2. localStorage key
3. a tiny dev-only scenario switcher

The first version should prefer the simplest path.

### Step 6: Keep Storybook as support, not replacement

Storybook already exists, but current coverage is too thin for shell work.

Add stories for:

1. sidebar shell
2. right action rail
3. titlebar fragments
4. chat surface states
5. preview toolbar fragments

Storybook should help with primitives and subpanels, but the browser UI mode should remain the main UI branch workflow.

## Initial Channel Scope For Mocking

First implementation should mock only what is needed to render and inspect the shell safely.

Priority channels/functions:

1. settings load/save
2. system platform query
3. list/get app
4. list/get/create chat where needed for shell state
5. a minimal subset of preview-related reads
6. event subscriptions used during app startup

Explicitly defer in the first pass:

1. real chat streaming
2. filesystem-heavy flows
3. external auth
4. native dialogs
5. package/update/install behavior

## Guardrails

1. Browser UI mode is a visual and interaction development surface, not a native integration proof.
2. `start:tauri` remains required before shipping a non-trivial UI change.
3. Runtime exe checks remain milestone-only.
4. New UI work should avoid expanding direct native/runtime coupling when a hook or boundary layer can hold it.

## Suggested Validation Sequence

For routine UI branch work:

1. `npm run ui:dev`
2. manual visual review of key screens
3. `npm run storybook` when primitives or isolated states change
4. periodic `npm run start:tauri`

Before a checkpoint commit or PR:

1. `npm run ts`
2. `npm run build`
3. `npm run start:tauri` manual spot-check
4. if needed, `npm run pre:e2e:tauri-runtime` and open the built exe

## Safe Rollout Order

1. add mock bridge files
2. add `ui:dev` env-gated bootstrap path
3. support one or two stable scenarios
4. use the lane for the current UI theme branch
5. only then widen scenario coverage if the workflow proves useful

## Evidence

- path: `package.json`
  symbol: `scripts`
  lines: 14-68
- path: `src-tauri/tauri.conf.json`
  symbol: `build`
  lines: 6-10
- path: `src/renderer.tsx`
  symbol: `bootstrapTauriCoreBridge`
  lines: 1-32
- path: `src/ipc/contracts/core.ts`
  symbol: `createClient`
  lines: 159-177
- path: `src/ipc/contracts/core.ts`
  symbol: `createEventClient`
  lines: 208-220
- path: `src/ipc/runtime/desktop_runtime.ts`
  symbol: `getInvokeTransport and getEventTransport`
  lines: 49-116
- path: `e2e-tests/helpers/tauri_smoke_fixtures.ts`
  symbol: `tauriCommandToChannel`
  lines: 63-120

## Next Safe Step

If this plan is accepted, the next implementation artifact should be a strict task spec for the first `ui:dev` slice, covering:

1. exact files to add and edit
2. the initial mocked channels
3. the scenario mechanism
4. tests or smoke checks for the dev-only bridge path
