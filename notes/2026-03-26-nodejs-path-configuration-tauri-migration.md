# Node.js Path Configuration Migrated To Tauri

Date: 2026-03-26

## Outcome

The Node.js path configuration flow now runs in the browser-backed Tauri regression lane.

## What Changed

- Added `e2e-tests/tauri-nodejs-path-configuration.spec.ts`.
- Removed the legacy Electron spec `e2e-tests/nodejs_path_configuration.spec.ts`.
- Used the existing Tauri smoke harness `select-node-folder`, `reload-env-path`, and `get-node-path` support.

## Verification

- `npx playwright test --project=tauri-regression e2e-tests/tauri-nodejs-path-configuration.spec.ts`

## Notes

- The first test validates the stable end-state after folder selection rather than a transient "Selecting..." label, because the browser-backed harness resolves the selection immediately.
- The flow is now covered without Electron-specific dialog stubbing.
