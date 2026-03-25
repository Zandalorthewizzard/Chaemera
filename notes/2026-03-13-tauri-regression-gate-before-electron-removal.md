# Task: Tauri Regression Gate Before Electron Removal

Date: 2026-03-13
Status: in progress
Branch: `refactor/leptos-tauri2`

## Intent

Do not remove Electron entrypoints, packaging, or fallback infrastructure until Tauri-specific regression coverage is strong enough to catch the most likely hidden cutover failures.

## Why This Task Exists

Current testing is good enough to continue the migration safely, but not good enough to treat full Electron removal as low-risk.

### What Is Already Covered Well

1. IPC contract and bridge parity is strongly covered by:
   - `scripts/audit-tauri-cutover.js`
   - `src/__tests__/tauri_wave_*_bridge.test.ts`
   - `src/__tests__/desktop_runtime.test.ts`
   - `src/__tests__/tauri_event_bridge_channels.test.ts`
2. Tauri smoke coverage exists in:
   - `e2e-tests/tauri-smoke.spec.ts`
   - `e2e-tests/helpers/tauri_smoke_fixtures.ts`
3. A broader browser-backed Tauri regression lane now exists in:
   - `e2e-tests/tauri-regression.spec.ts`
   - `playwright.config.ts` project `tauri-regression`
   - `package.json` scripts `pre:e2e:tauri-regression` and `e2e:tauri-regression`
4. CI now runs the contract/parity audit explicitly:
   - `npm run audit:tauri-cutover`
   - `.github/workflows/ci.yml`
5. Recent renderer boundary cleanup is covered by:
   - `src/__tests__/app_zoom.test.ts`

### Why That Is Still Not Enough

1. `tauri-regression` is still a browser harness with a mocked Tauri bridge, not a real packaged or desktop-running Tauri app.
2. Current CI still depends on a broader Electron-plus-Tauri full lane:
   - local `build` and `e2e` defaults are now Tauri-first
   - `playwright.config.ts` still contains `electron-regression` for the broader desktop lane
   - `.github/workflows/ci.yml` still builds and runs the explicit `ci/full` lane
3. The highest-risk breakages from full Electron removal are runtime and platform integration failures, not contract-shape failures.
4. These failures are exactly the kind that line coverage or bridge unit tests can miss.

## Current Conclusion

The repository has enough coverage to keep migrating toward Tauri-first.

The repository does **not** yet have enough risk coverage to safely:

1. delete `src/main.ts`
2. delete `src/preload.ts`
3. delete `forge.config.ts`
4. delete Electron packaging scripts
5. delete Electron regression lanes from CI

## Progress Made In This Pass

1. The old narrow `tauri-smoke` lane has been promoted into a broader named `tauri-regression` lane while keeping backward-compatible aliases.
2. The widened regression harness now covers:
   - app create/get/search flows,
   - chat create/get/list flows,
   - GitHub auth, repository, and collaborator lifecycle flows,
   - Vercel, Supabase, and Neon integration flows,
   - settings mutation persistence,
   - deep-link callback delivery through a native-style integration path,
   - external URL and window-control side-effect channels.
3. Local default scripts now route through the Tauri lane:
   - `npm run build` -> `pre:e2e:tauri-regression`
   - `npm run e2e` -> `playwright test --project=tauri-regression`
4. CI now treats `audit:tauri-cutover` as a first-class Tauri parity check while keeping the wider Electron-plus-Tauri lane explicit via `pre:e2e:ci` and `e2e:ci`.
5. This reduces cutover risk meaningfully, but does not close the "real desktop runtime" requirement.

## Required Gate Before Final Electron Removal

The following should exist and pass before Electron entrypoints are removed.

### 1. Real Tauri Runtime Gate

At least one regression lane must run against a real Tauri desktop runtime, not only the mocked browser smoke harness.

Minimum goal:

1. launch the app through Tauri runtime
2. exercise invoke bridge
3. exercise event bridge
4. confirm renderer boot and critical route transitions

### 2. Tauri-First User Flow Regression

A compact but high-signal suite should cover the flows most likely to break differently in Tauri versus Electron.

Priority flows:

1. app creation/opening and app switching
2. chat send/stream/cancel path
3. preview run/restart/output path
4. problems / diagnostics path
5. GitHub connect/import/sync branch flow
6. deep-link handling for MCP / prompt / integration callbacks
7. help/report flows that remain supported
8. external URL open behavior
9. window control behavior where applicable

### 3. Build and Packaging Gates

Before final removal, the following should be runnable in a Tauri-first path:

1. `npm run ts`
2. `npm run test`
3. `cargo check --manifest-path src-tauri/Cargo.toml`
4. Tauri build/package sanity

### 4. CI Ownership Shift

CI must stop depending on Electron harness as the primary proof of desktop correctness.

Minimum direction:

1. Tauri-first build path becomes the default desktop gate
2. Electron regression, if still temporarily kept, becomes explicit legacy coverage rather than the hidden default
3. final deletion of Electron paths happens only after Tauri CI is stable

## Explicit Non-Goal

Do not chase generic coverage percentage.

The goal is risk coverage for the platform-cutover failure modes, not abstract line coverage.

## Resume Checklist

When resuming this task:

1. read `notes/2026-03-13-tauri-first-release-checklist.md`
2. run `npm run audit:tauri-cutover`
3. inspect `playwright.config.ts`
4. inspect `.github/workflows/ci.yml`
5. identify which current E2E flows can be promoted into a real Tauri lane first
6. only after that plan the deletion of Electron entrypoints
7. do not confuse the current browser-backed `tauri-regression` lane with the final real-runtime gate

## Evidence Pointers

1. `scripts/audit-tauri-cutover.js`
2. `src/__tests__/desktop_runtime.test.ts`
3. `src/__tests__/app_zoom.test.ts`
4. `e2e-tests/tauri-smoke.spec.ts`
5. `e2e-tests/tauri-regression.spec.ts`
6. `e2e-tests/helpers/tauri_smoke_fixtures.ts`
7. `playwright.config.ts`
8. `.github/workflows/ci.yml`
