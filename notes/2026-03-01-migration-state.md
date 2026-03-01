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

## Sprint 11 Wave 6

1. Added a Tauri-native plan CRUD wave for the `.dyad/plans` filesystem layer:
   - `plan:create`
   - `plan:get`
   - `plan:get-for-chat`
   - `plan:update-plan`
   - `plan:delete`
2. Reused the existing `appId -> resolvedPath` registry pattern so plan operations can resolve the app workspace without porting app lookup/query logic to Rust first.
3. Mirrored the existing plan file semantics in Rust:
   - `.dyad/plans/*.md`
   - frontmatter with `title`, `summary`, `chatId`, `createdAt`, `updatedAt`
   - auto-ensuring `.dyad/` is present in the app-level `.gitignore`
4. Synced the Tauri smoke harness with new `plan_*` command mappings and an in-memory plan store so the harness stays coherent with the bridge surface.

## Sprint 11 Wave 6 Validation

1. `npx vitest run src/__tests__/tauri_wave_i_bridge.test.ts src/__tests__/tauri_event_bridge_channels.test.ts` passed.
2. `npm run ts` passed.
3. `cargo fmt` passed in `src-tauri`.
4. `cargo check` passed in `src-tauri`.
5. Invoke coverage moved from `117` missing channels to `112` missing channels.

## Sprint 11 Wave 7

1. Added a focused Tauri app-domain read/update wave backed by direct SQLite access from Rust using `rusqlite`.
2. Newly bridged invoke channels:
   - `get-app`
   - `list-apps`
   - `check-app-name`
   - `add-to-favorite`
   - `update-app-commands`
3. The Tauri app wave reuses the existing workspace assumptions instead of porting the entire DB stack:
   - in dev, SQLite reads `userData/sqlite.db` from the repo workspace
   - app paths still resolve through the existing `dyad-apps` workspace layout
   - `supabaseProjectName` and `vercelTeamSlug` are intentionally returned as `null` in this wave
4. The smoke harness now includes an in-memory app registry for the new app commands so bridge expectations stay coherent in Tauri smoke mode.

## Sprint 11 Wave 7 Validation

1. `npx vitest run src/__tests__/tauri_wave_j_bridge.test.ts src/__tests__/tauri_wave_i_bridge.test.ts` passed.
2. `npm run ts` passed.
3. `cargo fmt` passed in `src-tauri`.
4. `cargo check` passed in `src-tauri`.
5. Invoke coverage moved from `112` missing channels to `106` missing channels.

## Sprint 11 Wave 8

1. Added a shared Rust SQLite helper layer in `src-tauri/src/sqlite_support.rs` so later DB-adjacent migration waves can reuse:
   - dev/prod `sqlite.db` resolution
   - workspace path normalization
   - RFC3339 timestamp serialization
2. Added a new Tauri content/settings wave for app themes and prompts:
   - `set-app-theme`
   - `get-app-theme`
   - `get-custom-themes`
   - `create-custom-theme`
   - `update-custom-theme`
   - `delete-custom-theme`
   - `prompts:list`
   - `prompts:create`
   - `prompts:update`
   - `prompts:delete`
3. Extended the Tauri smoke harness with in-memory stores for:
   - app theme selection
   - custom themes
   - saved prompts
4. This wave deliberately stays in the SQLite/file-backed lane and avoids cloud/model/provider logic so it can shrink the remaining invoke gap without dragging in more runtime coupling.

## Sprint 11 Wave 8 Validation

1. `npm run ts` passed.
2. `npx vitest run src/__tests__/tauri_wave_j_bridge.test.ts src/__tests__/tauri_wave_k_bridge.test.ts` passed.
3. `cargo fmt` passed in `src-tauri`.
4. `cargo check` passed in `src-tauri`.
5. Invoke coverage moved from `106` missing channels to `96` missing channels.

## Sprint 11 Wave 9

1. Added a Tauri-native chat CRUD wave backed by direct SQLite access in Rust:
   - `get-chat`
   - `get-chats`
   - `create-chat`
   - `update-chat`
   - `delete-chat`
   - `delete-messages`
   - `search-chats`
2. Reused the shared SQLite/path helpers so chat reads and writes can stay aligned with the existing Electron data model without porting the whole Drizzle layer.
3. Preserved the important Electron-side semantics:
   - chat titles stay nullable in summaries/search results but normalize to `""` in `get-chat`
   - message order stays `created_at ASC, id ASC`
   - `create-chat` tolerates missing git state and only stores `initialCommitHash` when `git rev-parse HEAD` succeeds
4. Extended the Tauri smoke harness with an in-memory chat store so bridge-level chat flows can be exercised later without requiring a native runtime.

## Sprint 11 Wave 9 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_l_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `npm run lint` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_l_bridge.test.ts` passed.
5. `cargo fmt` passed in `src-tauri`.
6. `cargo check` passed in `src-tauri`.
7. Invoke coverage moved from `96` missing channels to `89` missing channels.

## Next Resume Point After Wave 9

1. Highest-value remaining CRUD gap is app management:
   - `create-app`
   - `delete-app`
   - `copy-app`
   - `rename-app`
   - `change-app-location`
   - `rename-branch`
2. The next workspace-adjacent runtime gap after that is still chat/tooling behavior beyond CRUD, especially `chat:count-tokens`.
3. Integration-heavy domains remain the largest untouched Electron-only block:
   - GitHub flow/repo/git operations
   - Supabase/Neon/Vercel mutation flows

## Sprint 11 Wave 10

1. Added a Tauri-native app CRUD wave covering the remaining core app-management operations:
   - `create-app`
   - `delete-app`
   - `copy-app`
   - `rename-app`
   - `change-app-location`
   - `rename-branch`
2. `create-app` now works in the Tauri path with the existing template-selection logic:
   - local `react` scaffold is copied from `scaffold/`
   - non-local templates resolve through the existing template catalog and clone from the configured GitHub repository
   - a first git commit is created with Chaemera-branded metadata instead of the original Dyad commit identity
3. `copy-app`, `rename-app`, and `change-app-location` reuse a shared Rust directory-copy helper and preserve the important Electron semantics:
   - `node_modules` is never copied during app moves/copies
   - `copy-app` can preserve or reset git history depending on `withHistory`
   - `rename-app` still rejects absolute new folder paths and keeps absolute-path apps inside their current parent directory
   - `change-app-location` still rewrites the stored path to an absolute location
4. `delete-app` now stops tracked Tauri runtime processes, clears log-store state, deletes the DB row, and then deletes the workspace directory.
5. Extended the Tauri smoke harness with app CRUD command mappings and an in-memory app/chat store so this new surface stays coherent with the bridge.
6. Updated the renderer-side app path registry so successful `rename-app` calls refresh cached `resolvedPath` metadata for downstream path-dependent channels.

## Sprint 11 Wave 10 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/ipc/runtime/app_path_registry.ts src/__tests__/tauri_wave_m_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `npm run lint` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_m_bridge.test.ts src/__tests__/tauri_wave_b_bridge.test.ts src/__tests__/tauri_wave_f_bridge.test.ts` passed.
5. `cargo fmt` passed in `src-tauri`.
6. `cargo check` passed in `src-tauri`.
7. Invoke coverage moved from `89` missing channels to `83` missing channels.

## Next Resume Point After Wave 10

1. Remaining workspace-adjacent runtime gap is no longer CRUD-heavy; the next high-value local cutover is:
   - `search-app`
   - `chat:count-tokens`
   - `help:chat:start`
2. The largest remaining Electron-only block is now GitHub/git orchestration:
   - branch listing/switch/create/delete
   - fetch/pull/push/rebase/merge controls
   - repo creation/connection flows
3. Cloud mutation surfaces remain intentionally outside the migrated core path:
   - Supabase
   - Neon
   - Vercel

## Sprint 11 Wave 11

1. Added a focused Tauri-native `search-app` wave instead of dragging in the much heavier `chat:count-tokens` surface.
2. `search-app` now resolves in Rust with the same three search lanes as the Electron handler:
   - app name matches
   - chat title matches
   - chat message content matches
3. The Tauri implementation preserves the effective dedupe semantics of the Electron path:
   - results are deduped by `app.id`
   - later match classes override earlier ones, so message matches win over title-only matches and title-only matches win over name-only matches
   - final results are sorted newest-first by app `createdAt`
4. Extended the Tauri smoke harness with a coherent in-memory `search-app` implementation so future Tauri smoke coverage can exercise the new bridge without a native runtime.

## Sprint 11 Wave 11 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_n_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts notes/2026-03-01-migration-state.md` passed.
2. `npm run lint` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_n_bridge.test.ts` passed.
5. `cargo fmt` passed in `src-tauri`.
6. `cargo check` passed in `src-tauri`.
7. Invoke coverage moved from `83` missing channels to `82` missing channels.

## Next Resume Point After Wave 11

1. The next workspace-adjacent local gap is now clearly separated from the simple CRUD/query waves:
   - `chat:count-tokens`
   - `help:chat:start`
2. `chat:count-tokens` is not a compact bridge wave; it drags in prompt construction, theme prompts, AI rules, mentioned-app context, codebase extraction, and model context-window logic.
3. The largest remaining Electron-only block is still GitHub/git orchestration:
   - branch listing/switch/create/delete
   - fetch/pull/push/rebase/merge controls
   - repo creation/connection flows
4. Cloud mutation surfaces remain intentionally deferred:
   - Supabase
   - Neon
   - Vercel

## Sprint 11 Wave 12

1. Started the GitHub section with an intentionally narrow API/read-only and local-disconnect wave instead of mixing OAuth device flow, remote git orchestration, and branch mutation in one step.
2. Newly bridged Tauri invoke channels:
   - `github:list-repos`
   - `github:get-repo-branches`
   - `github:is-repo-available`
   - `github:list-collaborators`
   - `github:disconnect`
3. The Rust implementation reuses existing Tauri-side sources of truth:
   - GitHub token comes from `user-settings.json`
   - linked repo metadata for collaborators/disconnect comes from `sqlite.db`
   - test-mode GitHub API base honors `E2E_TEST_BUILD` and `FAKE_LLM_PORT`
4. This wave deliberately does not port:
   - GitHub device flow
   - repo creation/connection flows
   - push/fetch/pull/rebase
   - local/remote branch mutation
   - clone/import flows
5. A local docs issue now tracks the unresolved help-bot OSS decision, and a dedicated planned sprint now exists for `chat:count-tokens` because that path is too dependency-heavy to hide inside a small bridge wave.

## Sprint 11 Wave 12 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_o_bridge.test.ts` passed.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run lint` passed.
4. `npm run ts` passed.
5. `npx vitest run src/__tests__/tauri_wave_o_bridge.test.ts` passed.
6. `cargo check` passed in `src-tauri`.

## Next Resume Point After Wave 12

1. The next GitHub layer should stay capability-grouped rather than chasing single channels:
   - `GitHub device flow + auth lifecycle`
   - `GitHub repo creation/connection`
   - `GitHub branch and sync orchestration`
2. The heaviest remaining non-GitHub workspace gap is still `chat:count-tokens`.
3. The help bot remains intentionally undecided and must not be ported blindly.

## Sprint 11 Wave 13

1. Added a dedicated GitHub auth/device-flow wave instead of bundling it into the read-only GitHub API wave.
2. Newly bridged Tauri invoke channel:
   - `github:start-flow`
3. The Tauri implementation preserves the Electron-side interaction model:
   - emits `github:flow-update` when requesting a device code,
   - emits `github:flow-update` with `userCode`, `verificationUri`, and guidance message,
   - polls for access token in the background,
   - emits `github:flow-success` on successful token acquisition,
   - emits `github:flow-error` for duplicate-start, denial, expiry, and polling/network failures.
4. Auth persistence now lands inside the Tauri-side settings path:
   - `githubAccessToken` is written to `user-settings.json`
   - primary GitHub email is also stored in `githubUser` when `/user/emails` succeeds
5. The implementation intentionally keeps auth lifecycle separate from:
   - repo creation/connection
   - push/pull/rebase
   - branch mutation/sync orchestration

## Sprint 11 Wave 13 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_p_bridge.test.ts` passed.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run lint` passed.
4. `npm run ts` passed.
5. `npx vitest run src/__tests__/tauri_wave_p_bridge.test.ts` passed.
6. `cargo check` passed in `src-tauri`.

## Next Resume Point After Wave 13

1. The next GitHub cut should probably be `repo creation/connection`, because auth is now available without needing Electron.
2. After that, the remaining GitHub/git block is mostly branch/sync orchestration:
   - fetch/pull/push
   - rebase/abort/continue
   - list/switch/create/delete/rename/merge branch
   - conflicts/git-state helpers
3. `chat:count-tokens` remains a separate large migration sprint and should still stay out of these GitHub waves.

## Sprint 11 Wave 14

1. Added the GitHub repo-setup wave on top of the new Tauri auth flow:
   - `github:create-repo`
   - `github:connect-existing-repo`
2. The new Tauri path now covers the full “authenticate -> attach remote repo -> update app linkage” arc without bouncing back to Electron.
3. The Rust implementation uses native `git` CLI orchestration for the local prep step:
   - add or update `origin`
   - auto-commit dirty local changes before repo attachment
   - fetch `origin` when available
   - create or checkout the target branch
   - update `apps.githubOrg/githubRepo/githubBranch` in `sqlite.db`
4. This wave intentionally stops short of the broader branch/sync control surface:
   - no `fetch/pull/push` command migration yet
   - no branch manager mutation handlers yet
   - no conflict/rebase control migration yet

## Sprint 11 Wave 14 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_q_bridge.test.ts` passed.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run lint` passed.
4. `npm run ts` passed.
5. `npx vitest run src/__tests__/tauri_wave_q_bridge.test.ts` passed.
6. `cargo check` passed in `src-tauri`.
7. During validation a `tsgo` failure surfaced in the smoke harness because `githubOrg/githubRepo/githubBranch` had been typed as `null` only; this was corrected to `string | null` so the harness remains coherent with migrated GitHub state.

## Next Resume Point After Wave 14

1. The remaining GitHub/git block is now mostly branch and sync orchestration:
   - `github:fetch`
   - `github:pull`
   - `github:push`
   - `github:rebase`
   - `github:rebase-abort`
   - `github:rebase-continue`
   - `github:merge-abort`
   - local/remote branch listing and mutation
   - conflicts/git-state helpers
2. `github:clone-repo-from-url` can stay separate from branch/sync orchestration because it behaves more like import/onboarding than day-to-day repo control.
3. `chat:count-tokens` remains intentionally separate from these GitHub waves.
