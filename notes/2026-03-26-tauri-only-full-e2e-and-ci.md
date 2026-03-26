# Tauri-Only Full E2E and CI

Date: 2026-03-26

## Outcome

The supported full desktop e2e and CI path now runs through Tauri only.

## What changed

- `scripts/prep-full-desktop-e2e.js` now always prepares the Tauri regression assets.
- `scripts/run-full-desktop-e2e.js` now always runs the `tauri-regression` Playwright project.
- `package.json` no longer exposes `build:test-electron-harness`, `pre:e2e:electron-regression`, or `e2e:electron`.
- `ci.yml` now references `pre:e2e:full` instead of the old Electron regression prep step.

## Verification

- `npm run ts`
- `npm run lint`
- `npm run pre:e2e:full`
- `npm run e2e:full -- --list`
- `npx vitest run src/__tests__/tauri_build_config.test.ts`
- `npm run audit:tauri-cutover`
- `npm run audit:electron-legacy`

## Follow-up

- Keep the legacy Electron Playwright project only as a local holdout until the remaining specs are migrated or retired.
- Continue removing direct Electron runtime dependencies once their last test and config consumers are gone.
