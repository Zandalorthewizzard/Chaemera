# Free Agent Quota Migrated To Tauri Runtime

Date: 2026-03-26

## Outcome

The last Electron-only quota regression has been retired from `e2e-tests/` and its coverage now lives in the real Tauri runtime suite.

## What Changed

- Removed the legacy Electron Playwright spec:
  - `e2e-tests/free_agent_quota.spec.ts`
- Kept the dormant quota foundation covered through the Tauri runtime harness:
  - `testing/tauri-webdriver/specs/free-agent-quota.e2e.mjs`
  - `testing/tauri-webdriver/specs/free-agent-quota.setup.mjs`
  - `testing/tauri-webdriver/run-suite.mjs`
- The runtime coverage still verifies the hidden foundation behavior:
  - freemium UI stays hidden in the active product surface
  - quota status can still be observed through the bridge
  - quota expiration resets the dormant state

## Why This Is Safe

- The product is now `BYOK-first` and the hosted/freemium UI is intentionally disabled.
- The old Electron spec was only validating a behavior that is now intentionally dormant.
- The Tauri runtime suite already carries the real replacement coverage for this path.

## Verification

- `npm run e2e:tauri-runtime`
- `npm run audit:electron-legacy`
- `npm run audit:tauri-cutover`

## Resume Point

- Continue shrinking the legacy Electron harness surface.
- Next candidates are the remaining Electron fixture consumers in the broad Playwright lane.
