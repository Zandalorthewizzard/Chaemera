# Setup Node Mock Split Between Tauri And Electron

Date: 2026-03-26

## Outcome

The setup coverage is split:

- Node.js install / node-mock behavior now lives in the browser-backed Tauri regression lane.
- Provider navigation flows still live in the legacy Electron regression lane for now.

## What Changed

- Added `e2e-tests/tauri-setup.spec.ts`.
- Made `PageObject.setNodeMock()` prefer the Tauri core bridge and fall back to Electron only when needed.
- Added Tauri smoke harness support for `test:set-node-mock`.
- Persisted the browser-backed node mock state across reloads via `sessionStorage`.

## Verification

- `npm run ts`
- `npm run lint`
- `npm run build`
- `npx playwright test --project=tauri-regression e2e-tests/tauri-setup.spec.ts`

## Notes

- The browser-backed Tauri setup spec now validates the Node.js install banner and install/continue flow.
- The provider setup route still needs the Electron-backed harness because the Tauri browser harness currently resolves the Google/OpenRouter routes to `Provider Not Found`.
- This split is intentional for now: the node setup slice is safe to migrate, but the provider navigation slice is still coupled to broader legacy setup behavior.
