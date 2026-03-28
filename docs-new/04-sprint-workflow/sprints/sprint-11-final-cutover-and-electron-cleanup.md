---
id: chaemera-sprint-11-final-cutover-and-electron-cleanup
title: Sprint 11 - Final Cutover and Electron Cleanup
type: sprint
status: active
tags: [sprint, migration, cutover, cleanup]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-10-leptos-core-workspace-cutover.md],
  ]
depends_on: [[sprint-10-leptos-core-workspace-cutover.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 11 - Final Cutover and Electron Cleanup

## Sprint Goal

Complete the stack cutover by removing Electron-era artifacts, finalizing Tauri 2 plus Leptos delivery, and aligning CI and release paths.

## Deliverables

1. Electron and Forge artifact removal.
2. Final Leptos and Tauri runtime and packaging path.
3. Release, CI, and validation pipeline aligned to the new stack.

## Parallel 3-Agent Plan

1. Agent 1: runtime cutover and packaging cleanup.
2. Agent 2: frontend cutover and dead-code removal.
3. Agent 3: CI, release, and final validation pipeline alignment.

## Done Criteria

1. Electron-era runtime artifacts are removed.
2. Tauri 2 and Leptos are the primary delivery path.
3. CI, release, and validation pipeline is aligned with the new stack.

## Current State

1. Sprint 11 is in progress, but the original "single final cutover" assumption proved premature after contract audit.
2. The first readiness audit found a large remaining Electron dependency surface:
   - `178` invoke channels in the current contract layer
   - `41` with Tauri coverage at audit time
   - `138` invoke channels and `11` event channels still Electron-only
3. The current Sprint 11 strategy is therefore:
   - finish the remaining Tauri runtime gaps in focused waves,
   - only then remove Electron/Forge delivery artifacts.

## First Implemented Wave

1. Added a Tauri app-runtime wave for preview-critical surfaces:
   - `run-app`
   - `stop-app`
   - `restart-app`
   - `respond-to-app-input`
   - `edit-app-file`
   - `app:output`
   - `add-log`
   - `clear-logs`
   - `open-external-url`
2. Added renderer-side app runtime metadata tracking so Tauri can resolve `appId -> appPath/install/startCommand` without a Rust DB port.
3. Verified locally with:
   - `npm run lint`
   - `npm run ts`
   - targeted `vitest`
   - `cargo check`
   - `npm run build`

## Second Implemented Wave

1. Added Tauri-side preview proxy bootstrap by wrapping the existing Node proxy worker instead of replacing its injection behavior.
2. Added Tauri-side `check-problems` invoke coverage by wrapping the bundled TypeScript worker behind a Node runner.
3. Added explicit Tauri resource packaging entries for:
   - preview proxy worker assets
   - injected preview clients and service-worker files
   - bundled `tsc_worker.js`
   - third-party injected browser assets used by the proxy
4. Verified locally with:
   - `npx vitest run src/__tests__/tauri_wave_f_bridge.test.ts`
   - `npm run ts`
   - `npm run lint`
   - `cargo check`

## Remaining Cutover Gaps

1. Real Tauri runtime validation of the new preview proxy path is still pending; current proof is compile/build plus bridge coverage, not a native Tauri launch.
2. CI/release is still Electron/Forge-first.
3. Electron runtime artifacts cannot be removed safely yet.
4. A broad Electron-only contract tail still exists outside the migrated preview/problems/runtime waves.
