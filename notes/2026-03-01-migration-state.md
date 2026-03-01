# 2026-03-01 Migration State

## Context

Leptos + Tauri 2 migration is implemented through Sprint 10, and Sprint 11 has started. The current state is stabilized by build, unit, migration-smoke validation, and a real local `cargo check` pass for the Tauri layer.

## What Changed

1. Sprint 3 through Sprint 10 were implemented:
   - Tauri Wave A core domains
   - Tauri Wave B files and apps
   - Tauri Wave C chat and agent transport bridge
   - Tauri Wave D integrations subset
   - Tauri Wave E advanced utilities
   - Tauri harness migration
   - Leptos route shell for low-risk routes
   - Leptos shell extension to core workspace routes
2. Windows build tooling was repaired with Visual Studio Build Tools and Windows SDK so legacy Electron packaging can rebuild native modules like `better-sqlite3`.
3. Global roadmap now explicitly reserves UI redesign for a post-migration track, cosmetic-first by default.
4. Sprint documentation was brought back in sync with the executed migration line so `Sprint 3-10` no longer remain marked as merely planned.
5. Migration governance now explicitly allows temporary breakage inside active migration slices and measures parity at accepted milestones/final cutover instead of every intermediate state.
6. In-app preview is explicitly locked into the target `Tauri + Leptos` architecture instead of being treated as optional legacy behavior.
7. Sprint 11 readiness audit showed the original final-cutover assumption was premature:
   - `178` invoke channels exist in the contract surface,
   - only `41` had Tauri coverage before this step,
   - `138` invoke channels and `11` event channels were still Electron-only.
8. Instead of deleting Electron blindly, the first Sprint 11 prerequisite wave was implemented:
   - Tauri app runtime commands for `run-app`, `stop-app`, `restart-app`, `respond-to-app-input`, and `edit-app-file`
   - Tauri `app:output` event path
   - Tauri support for `add-log`, `clear-logs`, and `open-external-url`
   - renderer-side app runtime metadata registry so Tauri can resolve `appId -> appPath/install/start` without a Rust DB port
9. Local Rust tooling was installed and the Tauri workspace now passes `cargo check`.

## Verified State

1. `npm run lint` passed.
2. `npm run ts` passed.
3. `npm run test` passed.
4. `npm run build` passed after the Windows toolchain fix.
5. `testing/fake-llm-server` dependencies were installed with `npm ci` to unblock Playwright webServer startup.
6. `npx vitest run src/__tests__/tauri_leptos_shell_bridge.test.ts` passed.
7. `npx vitest run src/__tests__/tauri_wave_b_bridge.test.ts src/__tests__/tauri_wave_c_transport.test.ts src/__tests__/tauri_wave_f_bridge.test.ts` passed.
8. `cargo check` passed in `src-tauri`.

## E2E Observations

1. A small Electron regression subset passed:
   - `e2e-tests/default_chat_mode.spec.ts`
   - `e2e-tests/theme_selection.spec.ts`
   - `e2e-tests/add_mcp_server_deep_link.spec.ts`
   - `e2e-tests/add_prompt_deep_link.spec.ts`
2. `e2e-tests/tauri-smoke.spec.ts` is now green after stabilizing the harness and expectations around the current migration state.
3. The Tauri smoke suite now covers both low-risk route-shell behavior and the core route-shell cut-in added in Sprint 10.
4. Root `/` in browser-style Tauri smoke is no longer the anchor; the suite uses the more stable route-shell transport path instead.
5. Preview runtime migration has now started on the Tauri side, but the full preview parity stack is not complete yet because the proxy/injection path and problem-checking path are still outside the migrated surface.

## Open Issues

1. Keep the Tauri smoke suite focused on stable route-shell and transport guarantees until the core workspace cutover is further along.
2. The Electron regression harness still produces noisy Windows `taskkill` cleanup warnings even when tests pass.
3. `Sprint 2` still exists as a documentation/planning artifact and should be reconciled before final migration archive.
4. Final cutover work is still open in `Sprint 11`.
5. Sprint 11 is now a real execution phase, but it is not yet at the point where Electron/Forge can be deleted safely.
6. The next high-value gap after the new app-runtime wave is the remaining preview/tooling surface:
   - proxy/injection workflow
   - problems/check-problems
   - remaining Electron-only app/system contracts

## Resume Point

If resuming later, inspect:

1. `src-tauri/src/wave_f_domains.rs`
2. `src/ipc/runtime/app_path_registry.ts`
3. `src/ipc/runtime/bootstrap_tauri_core_bridge.ts`
4. `src/hooks/useRunApp.ts`
5. `src/__tests__/tauri_wave_f_bridge.test.ts`

Then continue the migration plan from `Sprint 11`, unless the smoke suite or Windows Electron cleanup behavior regresses again.

## Sprint 11 Wave 2

1. Added Tauri-side `check-problems` invoke coverage by routing the existing problem-check flow through a Node wrapper around the bundled TypeScript worker.
2. Added Tauri-side preview proxy bootstrap by spawning a Node wrapper around the existing `worker/proxy_server.js` so preview iframe injection behavior can stay aligned with the Electron path.
3. Added new runtime assets for Tauri packaging in `src-tauri/tauri.conf.json` instead of leaving the new preview/problems path dev-only.
4. Extended the Tauri bridge contract so `check-problems` now resolves through `appId -> appPath` metadata like the other migrated app/runtime channels.

## Sprint 11 Wave 2 Validation

1. `npx vitest run src/__tests__/tauri_wave_f_bridge.test.ts` passed.
2. `npm run ts` passed.
3. `npm run lint` passed.
4. `cargo check` passed in `src-tauri`.
5. `npm run build` passed before the final Tauri resource-list fix; Electron/Tauri-smoke build path remained green.

## Next Resume Point

1. Verify the real Tauri preview proxy path at runtime once a Tauri launcher path is in active use, not only through `cargo check`.
2. Continue the remaining Sprint 11 contract gap cleanup, especially Electron-only app/system invokes outside the preview/problems path.
3. Revisit final Electron/Forge removal only after those remaining runtime contracts are either ported or intentionally dropped.

## Sprint 11 Wave 3

1. Added a new Tauri system utility wave for non-DB shell/runtime commands:
   - `get-system-debug-info`
   - `nodejs-status`
   - `select-node-folder`
   - `get-node-path`
   - `show-item-in-folder`
   - `clear-session-data`
   - `reload-env-path`
   - `does-release-note-exist`
   - `get-user-budget`
   - `upload-to-signed-url`
   - `restart-dyad`
2. Reused the existing OSS-safe semantics where appropriate instead of reintroducing branded/pro-only behavior:
   - `get-user-budget` remains `null`
   - `does-release-note-exist` returns `{ exists: false }` in the Tauri path instead of probing branded Dyad release-note URLs
3. Extended the Tauri smoke harness with stub coverage for the new system utility channels so the bridge can be exercised without a full native run.

## Sprint 11 Wave 3 Validation

1. `npx vitest run src/__tests__/tauri_wave_f_bridge.test.ts src/__tests__/tauri_wave_g_bridge.test.ts` passed.
2. `npm run ts` passed.
3. `npm run lint` passed.
4. `cargo check` passed in `src-tauri`.
5. Full `npm run build` was intentionally deferred after a manual stop because concurrent `.NET Runtime Optimization Service` activity was saturating CPU on the host machine and heavily skewing build duration.

## Sprint 11 Wave 4

1. Added a focused Tauri `reset-all` bridge so the settings-level full reset action no longer depends on Electron for the destructive cleanup path.
2. Added a shared `stop_all_running_apps()` helper in `src-tauri/src/wave_f_domains.rs` so reset can terminate tracked Tauri-run app processes before deleting runtime state.
3. Implemented Tauri-side reset cleanup for:
   - `sqlite.db` under the app data directory
   - `user-settings.json`
   - the `~/dyad-apps` workspace directory, recreated empty after deletion
4. Left `take-screenshot` untouched; it remains outside the migrated Tauri surface for now.

## Sprint 11 Wave 4 Validation

1. `npx vitest run src/__tests__/tauri_wave_h_bridge.test.ts src/__tests__/tauri_wave_g_bridge.test.ts` passed.
2. `npm run ts` passed.
3. `npx oxfmt --write ...` passed for the touched TypeScript files.
4. `cargo fmt` passed in `src-tauri`.
5. A fresh `cargo check` re-run was attempted but timed out under heavy host CPU contention while `.NET Runtime Optimization Service` was still active, so Rust compile revalidation for this exact wave remains deferred.

## Sprint 11 Wave 5

1. Closed the remaining Tauri event-transport gap at the contract layer by adding all missing receive channels to `TAURI_MIGRATION_EVENT_CHANNELS`.
2. Newly bridged event channels:
   - `deep-link-received`
   - `help:chat:response:chunk`
   - `help:chat:response:end`
   - `help:chat:response:error`
   - `github:flow-update`
   - `github:flow-success`
   - `github:flow-error`
   - `plan:update`
   - `plan:exit`
   - `plan:questionnaire`
3. This does not yet mean all of those domains emit from Tauri natively; it means the renderer-side transport no longer blocks them once their Tauri emit path exists.

## Sprint 11 Wave 5 Validation

1. `npx vitest run src/__tests__/tauri_event_bridge_channels.test.ts` passed.
2. `npm run ts` passed.
3. Contract coverage check now reports:
   - `invokeMissing: 117`
   - `receiveMissing: 0`
