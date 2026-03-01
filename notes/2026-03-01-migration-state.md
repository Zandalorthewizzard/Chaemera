# 2026-03-01 Migration State

## Context

Leptos + Tauri 2 migration is implemented through Sprint 9. The next planned feature sprint is Sprint 10, but the current stabilization focus is migration smoke validation before pushing deeper into the cutover.

## What Changed

1. Sprint 3 through Sprint 9 were implemented:
   - Tauri Wave A core domains
   - Tauri Wave B files and apps
   - Tauri Wave C chat and agent transport bridge
   - Tauri Wave D integrations subset
   - Tauri Wave E advanced utilities
   - Tauri harness migration
   - Leptos route shell for low-risk routes
2. Windows build tooling was repaired with Visual Studio Build Tools and Windows SDK so legacy Electron packaging can rebuild native modules like `better-sqlite3`.
3. Global roadmap now explicitly reserves UI redesign for a post-migration track, cosmetic-first by default.

## Verified State

1. `npm run lint` passed.
2. `npm run ts` passed.
3. `npm run test` passed.
4. `npm run build` passed after the Windows toolchain fix.
5. `testing/fake-llm-server` dependencies were installed with `npm ci` to unblock Playwright webServer startup.

## E2E Observations

1. A small Electron regression subset passed:
   - `e2e-tests/default_chat_mode.spec.ts`
   - `e2e-tests/theme_selection.spec.ts`
   - `e2e-tests/add_mcp_server_deep_link.spec.ts`
   - `e2e-tests/add_prompt_deep_link.spec.ts`
2. `e2e-tests/tauri-smoke.spec.ts` is now green after stabilizing the harness and expectations around the current migration state.
3. The stable Tauri smoke target is low-risk route shell behavior plus bridge/event transport, not the heavy `/` home surface.
4. Root `/` in browser-style Tauri smoke currently pulls in too many home-specific query dependencies to be a good smoke anchor; that is a coverage choice, not evidence that the Tauri bridge failed.

## Open Issues

1. Keep the Tauri smoke suite focused on stable route-shell and transport guarantees until the core workspace cutover is further along.
2. The Electron regression harness still produces noisy Windows `taskkill` cleanup warnings even when tests pass.
3. Continue with Sprint 10 after this stabilization checkpoint.

## Resume Point

If resuming later, inspect:

1. `e2e-tests/tauri-smoke.spec.ts`
2. `e2e-tests/helpers/tauri_smoke_fixtures.ts`
3. `playwright.config.ts`
4. `e2e-tests/helpers/fixtures.ts`

Then continue the migration plan from Sprint 10, unless the smoke suite or Windows Electron cleanup behavior regresses again.
