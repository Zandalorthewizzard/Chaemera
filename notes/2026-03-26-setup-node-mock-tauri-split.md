# Setup Node Mock Split Between Tauri And Electron

Date: 2026-03-26

## Outcome

The setup coverage is split:

- Node.js install / node-mock behavior now lives in the browser-backed Tauri regression lane.
- Provider navigation flows are now also available in the browser-backed Tauri regression lane after adding `google` and `openrouter` to the harness provider catalog.

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
- The provider setup route now resolves correctly in the browser-backed harness too.
- This setup slice is now fully Tauri-backed in practice, but the note keeps the original split context because the migration was done in two steps.
