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

## Sprint 11 Wave 15

1. Added a Tauri-native GitHub/git read-state wave for branch-manager introspection without taking on sync/mutation risk yet.
2. Newly bridged invoke channels:
   - `github:list-local-branches`
   - `github:list-remote-branches`
   - `github:get-conflicts`
   - `github:get-git-state`
   - `git:get-uncommitted-files`
3. Moved app-path lookup into shared Rust SQLite helpers so later GitHub/git waves can reuse `appId -> workspace path` resolution instead of duplicating it per module.
4. Kept semantics aligned with the Electron implementation:
   - local branches come from `git branch --format=%(refname:short)`
   - remote branches are filtered by remote name and strip the `origin/`-style prefix
   - git state only reports `mergeInProgress` and `rebaseInProgress`
   - conflicts still come from `git diff --name-only --diff-filter=U`
   - uncommitted files keep the existing `added | modified | deleted | renamed` status mapping
5. Synced the Tauri smoke harness so these branch-manager read channels can be exercised in migration smoke mode before the later fetch/pull/push/rebase waves land.

## Sprint 11 Wave 15 Validation

1. `npm run fmt` completed, but it triggered a repository-wide CRLF rewrite on this Windows host; the worktree was cleaned back down to the intended files before continuing.
2. `npm run lint` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_r_bridge.test.ts` passed.
5. `cargo fmt` passed via the explicit cargo path (`C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe`) because `cargo` was not in `PATH` for this shell session.
6. `cargo check` passed in `src-tauri`.
7. Invoke coverage moved down to `68` missing channels while `receiveMissing` remains `0`.

## Sprint 11 Wave 16

1. Added a dedicated Tauri GitHub sync/rebase wave covering the existing Electron sync commands:
   - `github:fetch`
   - `github:pull`
   - `github:push`
   - `github:rebase`
   - `github:rebase-abort`
   - `github:rebase-continue`
   - `github:merge-abort`
2. The new Rust module keeps parity with the current Electron semantics instead of inventing a new sync model:
   - auth still comes from `githubAccessToken` in user settings
   - linked repo validation still requires `githubOrg` and `githubRepo` on the app row
   - remote URL is refreshed before network sync operations
   - `pull` still tolerates a missing remote branch
   - `push` still performs a pre-push pull unless `force` or `forceWithLease` is used
   - `rebase` still requires a clean workspace and rebases onto `origin/<branch>`
3. `merge-abort` and `rebase-abort` now resolve by app path only, matching the original Electron behavior more closely than requiring a still-linked GitHub repo.
4. Smoke harness coverage was extended so the sync channels exist in Tauri smoke mode even before full GitHub integration E2E coverage is added.

## Sprint 11 Wave 16 Validation

1. `npx oxfmt --write ...` was run only on the touched TypeScript files to avoid the repo-wide CRLF churn seen with `npm run fmt` on this Windows/autocrlf host.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_r_bridge.test.ts src/__tests__/tauri_wave_s_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `cargo check` passed in `src-tauri`.

## Sprint 11 Wave 17

1. Added a dedicated Tauri branch-mutation wave for the remaining GitHub branch manager operations:
   - `github:create-branch`
   - `github:switch-branch`
   - `github:delete-branch`
   - `github:rename-branch`
   - `github:merge-branch`
   - `git:commit-changes`
2. Preserved the important existing behavior:
   - branch name validation matches the Electron handler constraints
   - branch switching still blocks on merge/rebase state and dirty workspaces
   - renaming the active branch still updates the app's stored `githubBranch`
   - merge still prefers `origin/<branch>` when the branch is only available remotely
   - commit still stages all changes and blocks while merge/rebase is active
3. `merge` and `commit` now inject an explicit author identity in the Rust path so this wave does not depend on the machine's global git config.
4. Smoke harness coverage was expanded for the new mutation channels so branch-manager commands exist coherently in Tauri smoke mode.

## Sprint 11 Wave 17 Validation

1. `npx oxfmt --write ...` was run only on the touched TypeScript files.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_t_bridge.test.ts src/__tests__/tauri_wave_s_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `cargo check` passed in `src-tauri`.

## Sprint 11 Wave 18

1. Added a focused Tauri collaborator-management wave for the remaining GitHub team commands:
   - `github:invite-collaborator`
   - `github:remove-collaborator`
2. Preserved the Electron-side semantics:
   - invite still validates GitHub username format before calling the API
   - both commands still require a stored GitHub access token
   - both commands still require the app to be linked to a GitHub repo
   - invite still defaults to `push` permission
3. The Tauri smoke harness now tracks collaborator lists in-memory per app so invite/remove behavior stays coherent in migration smoke mode.

## Sprint 11 Wave 18 Validation

1. `npx oxfmt --write ...` was run only on the touched TypeScript files.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_u_bridge.test.ts src/__tests__/tauri_wave_t_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `cargo check` passed in `src-tauri`.

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

## Sprint 11 Wave 19

1. Added the last GitHub onboarding/import wave to the Tauri path:
   - `github:clone-repo-from-url`
2. The new Rust implementation preserves the existing import contract shape:
   - validates GitHub URL format
   - verifies repo access when a GitHub token is present
   - clones into the standard `~/dyad-apps/<appName>` workspace
   - inserts the cloned app into `sqlite.db`
   - returns `{ app, hasAiRules }` or `{ error }` rather than throwing for normal clone failures
3. The Tauri path improves one important behavior versus the old Electron implementation:
   - after clone it resolves the actual checked-out branch with `git branch --show-current` and only falls back to `"main"` if detection fails
4. The Tauri smoke harness now understands clone-from-URL so GitHub import flows remain coherent in smoke mode.

## Sprint 11 Wave 19 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_v_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `cargo fmt` passed in `src-tauri`.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_v_bridge.test.ts src/__tests__/tauri_wave_u_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `cargo check` passed in `src-tauri`.
7. A direct contract audit confirmed the GitHub/git contract surface is now fully mapped in the Tauri bridge:
   - `github_git_channels: 32`
   - `github_git_missing: 0`

## Sprint 11 Wave 20

1. Added a dedicated Tauri `chat:count-tokens` wave instead of folding token estimation into the existing chat CRUD or preview runtime waves.
2. Newly bridged invoke channel:
   - `chat:count-tokens`
3. The Rust implementation now mirrors the important Electron-side inputs that drive token bar percentages:
   - message history
   - current input
   - system prompt construction for `build`, `ask`, and `plan`
   - theme prompt injection
   - Supabase prompt/context handling, including the large `test-branch-project-id` test-build case
   - codebase extraction from the current app
   - mentioned-app codebase extraction
   - model context-window lookup with a `128_000` fallback
4. Codebase extraction in the Tauri path now preserves two parity-critical behaviors from `src/utils/codebase.ts`:
   - `.gitignore` rules are respected through an ignore-aware filesystem walk
   - unsupported or intentionally omitted files still contribute placeholder content instead of being dropped from the token estimate entirely
5. To keep the Rust path self-contained, prompt-template assets were materialized under `src-tauri/prompt_assets/` and wired into the new token-count module.
6. This wave still uses the project's existing rough token heuristic (`ceil(chars / 4)`) for parity with the current Electron implementation; it does not yet introduce provider-accurate tokenizers.

## Sprint 11 Wave 20 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_w_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_w_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.

## Sprint 11 Wave 21

1. Closed the remaining Vercel IPC surface in the Tauri path:
   - `vercel:create-project`
   - `vercel:connect-existing-project`
   - `vercel:get-deployments`
   - `vercel:disconnect`
2. The new Rust implementation keeps the current Electron-side flow shape instead of inventing a new deployment model:
   - Vercel token still comes from user settings
   - project creation still requires an app-linked GitHub repo
   - framework detection still happens from config files / `package.json`
   - app linkage still writes `vercelProjectId`, `vercelProjectName`, `vercelTeamId`, and `vercelDeploymentUrl` into `sqlite.db`
   - disconnect still clears those stored Vercel fields from the app row
3. Added a best-effort first-deployment trigger after project creation so the Tauri path does not regress behind the current Electron behavior.
4. The Tauri smoke harness now knows the full Vercel contract surface instead of only carrying the app-shape fields with no command support.
5. This wave intentionally did not yet solve the separate `vercelTeamSlug` read-side gap in `get-app`; the bridge surface is now complete, but that UI-facing enrichment remains a follow-up read-model concern.

## Sprint 11 Wave 21 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_x_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npx vitest run src/__tests__/tauri_wave_x_bridge.test.ts` passed.
5. `npm run lint` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.

## Sprint 11 Wave 22

1. Added a dedicated Tauri `language-model` wave covering the remaining provider/model contract surface:
   - `get-language-model-providers`
   - `get-language-models`
   - `get-language-models-by-providers`
   - `create-custom-language-model-provider`
   - `edit-custom-language-model-provider`
   - `delete-custom-language-model-provider`
   - `create-custom-language-model`
   - `delete-custom-language-model`
   - `delete-custom-model`
2. The Tauri implementation keeps hardcoded provider/model catalog data in a compile-time JSON asset:
   - `src-tauri/catalog_assets/language_models.json`
   - generated from the current TypeScript source catalog to avoid hand-copying the model matrix into Rust
3. The Rust path now mirrors the current Electron-side data split:
   - hardcoded cloud/local providers from the catalog asset
   - custom providers and custom models from `sqlite.db`
   - cloud providers can still have DB-backed custom models appended after builtin models
4. Renderer/Tauri bridge coverage and smoke harness coverage were extended so the full language-model contract surface exists coherently in Tauri smoke mode.
5. This wave intentionally keeps the current branded `auto` provider in the migrated catalog for parity; removing or replacing that provider is still a separate OSS/product cleanup decision.
6. One deliberate behavior change versus the old Electron handler:
   - Tauri now rejects creating custom models for local providers with `Local models cannot be customized`
   - the old Electron path could silently create unusable orphan rows for that case

## Sprint 11 Wave 22 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_y_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_y_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `59`.

## Sprint 11 Wave 23

1. Added a dedicated Tauri `supabase` wave covering the remaining Supabase IPC contract surface:
   - `supabase:list-organizations`
   - `supabase:delete-organization`
   - `supabase:list-all-projects`
   - `supabase:list-branches`
   - `supabase:get-edge-logs`
   - `supabase:set-app-project`
   - `supabase:unset-app-project`
   - `supabase:fake-connect-and-set-project`
2. The new Rust module handles both local app-link state and the Supabase management API read-path:
   - app/project association updates go straight to `sqlite.db`
   - organization/project/branch/log queries use blocking HTTP requests from the Tauri side
   - test builds keep the existing fake organization / fake project / fake branches behavior
3. Added an exact settings-write helper inside the wave because the current Tauri `merge_json` settings path cannot delete nested keys cleanly; this matters for `supabase:delete-organization`.
4. Smoke harness support was extended so future Tauri Supabase smoke flows can keep settings, organizations, projects, branches, app linkage, and fake deep-link events coherent.
5. Important known limitation:
   - if Supabase credentials were previously stored using Electron `safeStorage` (`encryptionType: electron-safe-storage`), the Tauri path still cannot decrypt them
   - this means the migrated Supabase commands work cleanly for Tauri-written plaintext secrets and test-mode fake auth, but encrypted legacy Electron secrets remain a follow-up debt

## Sprint 11 Wave 23 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_z_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_z_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `51`.

## Sprint 11 Wave 24

1. Added a dedicated Tauri `neon` wave covering the remaining Neon IPC contract surface:
   - `neon:create-project`
   - `neon:get-project`
   - `neon:fake-connect`
2. The new Rust module keeps the existing Neon product flow intact instead of replacing it with an MCP-style abstraction:
   - obtains the first available Neon organization for project creation
   - creates the Neon project
   - creates a `preview` branch with a `read_only` endpoint
   - persists `neon_project_id`, `neon_development_branch_id`, and `neon_preview_branch_id` in `sqlite.db`
   - loads project + branch state back into the same `GetNeonProjectResponse` shape used by the renderer
3. The Tauri smoke harness now has deterministic Neon coverage:
   - fake OAuth return event for `neon:fake-connect`
   - in-memory app linkage for Neon project/branch IDs
   - deterministic `neon:get-project` branch payloads for future smoke coverage
4. The Tauri settings path now writes the full `neon` settings object exactly when refreshing or faking tokens, instead of merge-patching nested token objects. This avoids carrying stale `encryptionType` metadata forward accidentally.
5. Important known limitation:
   - if Neon credentials were previously written through Electron `safeStorage` (`encryptionType: electron-safe-storage`), the Tauri path now fails explicitly instead of silently using undecipherable token data
   - this mirrors the existing Tauri limitation already documented for encrypted Supabase secrets and keeps the failure mode honest

## Sprint 11 Wave 24 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_aa_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_aa_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `48`.

## Sprint 11 Wave 25

1. Added a focused Tauri workspace-config wave covering the remaining env/context IPC surface:
   - `get-env-vars`
   - `get-app-env-vars`
   - `set-app-env-vars`
   - `get-context-paths`
   - `set-context-paths`
2. The Rust implementation keeps the existing filesystem model instead of inventing new storage:
   - global provider env vars are read from the current process environment
   - app env vars still live in `.env.local`
   - app chat context still lives in the `apps.chat_context` JSON column in `sqlite.db`
3. `get-app-env-vars` and `set-app-env-vars` now have a Tauri path with a Rust parser/serializer that preserves the existing Electron semantics:
   - skip blank/comment lines
   - split on the first `=`
   - preserve unquoted values
   - support quoted values
   - quote serialized values when they contain whitespace or special characters
4. `get-context-paths` now has a Tauri path that mirrors the current Electron-side summary behavior closely enough for migration parity:
   - resolves the stored app workspace path
   - loads and validates `chat_context` JSON
   - expands each saved glob path
   - estimates file counts and token counts using the same rough `chars / 4` heuristic and omitted-file placeholder policy used elsewhere in the Tauri migration
5. Smoke harness coverage now includes deterministic in-memory stores for:
   - per-app `.env.local` values
   - per-app chat context glob configuration
6. Important known limitation:
   - `get-env-vars` in the Tauri path currently reads the process environment directly instead of using Electron's `shell-env` behavior
   - that is acceptable for the migration wave, but it remains a parity debt for GUI-launched shells on platforms where process env differs from login-shell env

## Sprint 11 Wave 25 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_ab_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_ab_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `43`.

## Sprint 11 Wave 26

1. Added a focused Tauri `capacitor/mobile` wave covering:
   - `is-capacitor`
   - `sync-capacitor`
   - `open-ios`
   - `open-android`
2. The new Rust module preserves the existing product behavior instead of inventing a new mobile workflow:
   - detects Capacitor by checking for `capacitor.config.js|ts|json`
   - keeps the Node.js v20+ guard on `is-capacitor`
   - `sync-capacitor` still runs the app build first and then `cap sync`
   - `open-ios` / `open-android` still no-op in test builds
3. Reused the existing Tauri PATH helper from `wave_g_domains` so the new mobile commands inherit the same custom-node/system-path behavior as the rest of the desktop utility layer.
4. Smoke harness coverage now includes deterministic Capacitor command handling keyed off the app's file list, so the bridge surface stays coherent in Tauri smoke mode even before native mobile E2E exists.

## Sprint 11 Wave 26 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_ac_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_ac_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `39`.

## Sprint 11 Wave 27

1. Added a focused Tauri onboarding/import wave for:
   - `import-app`
2. The new Rust implementation preserves the existing Electron behavior:
   - validates that the source folder exists
   - respects `skipCopy`
   - copies the app into the standard `~/dyad-apps/<appName>` workspace when `skipCopy` is false
   - initializes a git repo and initial commit when the imported app is not already a git repository
   - inserts the imported app into `sqlite.db`
   - creates the initial chat row
   - returns the same `{ appId, chatId }` result shape
3. The Tauri smoke harness now supports `import-app` coherently by creating an in-memory app + chat pair and carrying through the requested install/start commands.
4. One deliberate behavior change versus upstream/Dyad naming:
   - the initial import commit message is now `Init Chaemera app`, matching the fork branding policy instead of reusing the original product name

## Sprint 11 Wave 27 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts e2e-tests/helpers/tauri_smoke_fixtures.ts src/__tests__/tauri_wave_ad_bridge.test.ts` passed.
2. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
3. `npm run ts` passed.
4. `npm run lint` passed.
5. `npx vitest run src/__tests__/tauri_wave_ad_bridge.test.ts` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. A fresh contract audit reduced the remaining unmapped contract count to `38`.

## Sprint 11 Wave 28

1. Added a focused Tauri `upgrade + checkout-version` wave covering:
   - `get-app-upgrades`
   - `execute-app-upgrade`
   - `checkout-version`
2. The new Rust upgrade path preserves the current Electron-side product model:
   - component-tagger upgrade still inspects and edits `vite.config.{ts,js}`
   - component-tagger still installs `@dyad-sh/react-vite-component-tagger` with `pnpm` fallback to `npm`
   - Capacitor upgrade still installs dependencies, runs `cap init`, and adds both mobile platforms
3. The Tauri path now uses fork-neutral git commit messages for app-local upgrade commits:
   - `[chaemera] add component tagger`
   - `[chaemera] add Capacitor for mobile app support`
4. `checkout-version` now has a real Tauri path for the non-destructive version-switch workflow:
   - plain git checkout for normal app histories
   - Neon-aware branch/env switching for apps with stored Neon linkage
   - `.env.local` updates for `POSTGRES_URL` and `DYAD_DISABLE_DB_PUSH`
5. `revert-version` remains intentionally unmigrated for now because it still carries the heavier coupled side-effects:
   - chat-message pruning
   - DB timestamp mutation
   - Supabase edge-function redeploy after revert

## Sprint 11 Wave 28 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_ae_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `npm run ts` passed.
3. `npm run lint` passed.
4. `npx vitest run src/__tests__/tauri_wave_ae_bridge.test.ts` passed.
5. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. This wave closes 3 more invoke channels and leaves `revert-version` as the intentional remainder of the version-management surface.

## Sprint 11 Wave 29

1. Added a focused Tauri `security review` wave covering:
   - `get-latest-security-review`
2. The new Rust implementation preserves the existing Electron-side read semantics:
   - queries the latest assistant message in the app that contains `<dyad-security-finding>` tags
   - parses the finding tags into the same title / level / description structure
   - returns the originating `chatId` plus RFC3339 timestamp
3. This wave intentionally stays read-only and avoids mixing security-review retrieval with the much heavier proposal approval/apply pipeline.

## Sprint 11 Wave 29 Validation

1. `npx oxfmt --write src/ipc/runtime/core_domain_channels.ts src/ipc/runtime/bootstrap_tauri_core_bridge.ts src/__tests__/tauri_wave_af_bridge.test.ts e2e-tests/helpers/tauri_smoke_fixtures.ts` passed.
2. `npm run ts` passed.
3. `npx vitest run src/__tests__/tauri_wave_af_bridge.test.ts` passed.
4. `npm run lint` passed.
5. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe fmt --manifest-path src-tauri/Cargo.toml` passed.
6. `C:\\Users\\ZandM\\.cargo\\bin\\cargo.exe check --manifest-path src-tauri/Cargo.toml` passed.
7. This wave closes 1 more invoke channel and keeps the remaining heavy tail concentrated in `proposal/help/misc/revert-version`.
