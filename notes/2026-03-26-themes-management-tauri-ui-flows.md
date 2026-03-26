# Themes Management UI Flows Migrated To Tauri Regression

Date: 2026-03-26

## Outcome

The basic themes CRUD flow and the chat-input theme creation flow now live in the browser-backed Tauri regression lane.

## What Changed

- Added `e2e-tests/tauri-themes-management.spec.ts`.
- Removed the migrated cases from `e2e-tests/themes_management.spec.ts`.
- Kept the remaining AI-generator cases in the legacy Electron-backed file for now.

## Validation

- `npx playwright test --project=tauri-regression e2e-tests/tauri-themes-management.spec.ts`
- `npm run ts`
- `npm run lint`

## Notes

- The Tauri harness needs a body-scoped assertion for the themes page because the shell and body both render a `Themes` heading.
- The stable route signal is the body text `Leptos shell smoke route for themes.`
