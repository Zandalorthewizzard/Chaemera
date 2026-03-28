---
id: chaemera-spec-final-tauri-host-capability-cutover-2026-03-28
title: Final Tauri Host-Capability Cutover
type: spec
status: active
tags: [spec, tauri2, sprint-11, electron-cleanup, host-capability, release]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [2026-02-23-tauri2-leptos-migration-master-plan.md],
    [../sprints/sprint-11-final-cutover-and-electron-cleanup.md],
    [
      ../../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md,
    ],
  ]
depends_on:
  [
    [2026-02-23-tauri2-leptos-migration-master-plan.md],
    [
      ../../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Final Tauri Host-Capability Cutover

1. Start Here

- This document is the canonical source of truth for the final release-critical Tauri migration slice after the low-risk Electron cleanup already landed.
- The key decision is locked here:
  - the remaining Electron runtime surface must be treated as a `host-capability boundary`,
  - not as generic dead code to remove by chasing the audit counter file by file.
- This is still current-release scope.
- This is not a post-release agent or terminal expansion spec.
- This document exists because the migration has already crossed the point where a naive `audit-to-zero` strategy would create avoidable churn and regressions.

2. Intent + Non-goals

- Intent:
  - finish the current release-line Tauri cutover by replacing or deleting the remaining Electron runtime capabilities in a controlled order;
  - convert the last Electron dependency cluster into explicit host-capability work units with measurable gates;
  - preserve current renderer contracts and user-visible behavior where the Tauri runtime already has equivalent support;
  - keep the remaining work small-slice, reversible, and commit-friendly.
- Non-goals:
  - no broad redesign of application UX, routing, or feature behavior;
  - no post-release agent-runtime work;
  - no blanket rewrite of TypeScript business logic into Rust where no native capability is involved;
  - no automatic requirement to replace `electron-log` in this slice;
  - no mechanical deletion of `base.ts`, `safe_handle.ts`, or `chat_stream_handlers.ts` until leaf host capabilities are resolved and validated.

3. Target Outcome

- The remaining runtime Electron API imports are removed from the release-critical path.
- The final cutover is organized by capability families rather than by incidental file grouping.
- Tauri-native or Tauri-first ownership is explicit for:
  - file and folder dialogs,
  - shell and reveal-in-folder behavior,
  - session-data clearing,
  - screenshot and debug-window behavior,
  - GitHub auth flow affinity,
  - final invoke and stream registration boundaries.
- Final acceptance target for this slice:
  - `scripts/audit-electron-legacy-surface.js` reports `electronImportFileCount: 0`.
- If any compatibility adapter survives temporarily, it must be:
  - explicitly named as temporary,
  - isolated to one boundary file,
  - and scheduled for deletion before the release cutover is marked complete.

4. Current Baseline

- The low-risk cleanup is already done:
  - Electron host entrypoints are deleted.
  - Forge packaging files are deleted.
  - startup/update hooks are deleted.
  - type-only Electron imports and test-only Electron usage were already pruned where safe.
- As of this spec, the remaining runtime Electron import surface is `11` files.
- The remaining files are not equivalent in risk and must not be treated as one undifferentiated cleanup bucket.

  4.1. Remaining Capability Buckets

- `Dialog and app-host capability`
  - `src/ipc/handlers/app_handlers.ts`
  - `src/ipc/handlers/import_handlers.ts`
  - `src/ipc/handlers/node_handlers.ts`
- `Shell and session capability`
  - `src/ipc/handlers/shell_handler.ts`
  - `src/ipc/handlers/session_handlers.ts`
- `Window, screenshot, and clipboard capability`
  - `src/ipc/handlers/debug_handlers.ts`
- `GitHub flow affinity and sender ownership`
  - `src/ipc/handlers/github_handlers.ts`
- `Legacy invoke and stream registration`
  - `src/ipc/handlers/base.ts`
  - `src/ipc/handlers/safe_handle.ts`
  - `src/ipc/handlers/chat_stream_handlers.ts`
  - `src/ipc/handlers/free_agent_quota_handlers.ts`

    4.2. Important Interpretation

- Several of these capabilities already have Tauri command mappings and Rust-side registrations.
- That means the remaining TypeScript Electron handlers are often legacy fallback or compatibility residue, not proof that the capability is still fundamentally Electron-owned.
- Therefore the correct order is:
  - confirm Tauri ownership,
  - delete or reduce the Electron fallback,
  - then collapse the core registration tail last.

5. Locked Decisions

- `Boundary-first` migration is mandatory.
- `Audit-to-zero` is a gate, not an implementation strategy.
- Leaf host capabilities must be resolved before transport-core files.
- Renderer contract names stay stable unless a separate explicit spec reopens contract design.
- Where `src/ipc/runtime/core_domain_channels.ts` already maps a channel to Tauri and Rust already registers the command, prefer deleting the Electron-side fallback instead of re-implementing the same behavior again.
- `base.ts`, `safe_handle.ts`, and `chat_stream_handlers.ts` are final-phase files, not first-phase files.
- `free_agent_quota_handlers.ts` is low priority because its remaining Electron use is a test-only registration seam.
- `electron-log` neutralization is not required to close this spec.

6. Architecture Fit

- Current renderer transport still supports dual routing through `src/ipc/runtime/desktop_runtime.ts`.
- Tauri command ownership is already declared centrally in `src/ipc/runtime/core_domain_channels.ts`.
- Rust command registration already exists in `src-tauri/src/lib.rs` and the corresponding `wave_*_domains.rs` files for a meaningful subset of the remaining host capabilities.
- The problem is not that the product has no Tauri shape.
- The problem is that the final TypeScript-side Electron tail is still spread across:
  - leaf host capabilities,
  - mid-level fallback handlers,
  - and the old invoke/stream registration layer.

    6.1. Target Fit

- Rust and Tauri own native host capabilities.
- TypeScript feature logic remains where it is still the pragmatic place for non-native orchestration.
- Any remaining TypeScript handler that exists only to call Electron directly should either:
  - disappear,
  - or become a transport-neutral wrapper with no direct Electron import.
- The old Electron registration spine is cleaned last, once the product no longer depends on scattered direct Electron calls.

7. Implementation Tasks (ordered)

1. Freeze the final host-capability boundary.

- Re-run the Electron audit before each slice.
- Keep the remaining-file list explicit in working notes and commit messages.
- Do not start by editing `base.ts` or `chat_stream_handlers.ts`.

2. Close the `dialog` capability family.

- Resolve `import_handlers.ts`, `node_handlers.ts`, and the `dialog.showOpenDialog(...)` usage inside `app_handlers.ts`.
- Prefer the existing Tauri command mappings:
  - `select-app-folder`
  - `select-app-location`
- If `app_handlers.ts` mixes dialog behavior with unrelated app orchestration, split the leaf dialog behavior out first.

3. Close the `shell and reveal` capability family.

- Replace remaining Electron usage in `shell_handler.ts`.
- Keep behavior parity for:
  - external URL open,
  - reveal/show item in folder.
- Prefer the existing Tauri command mappings:
  - `open-external-url`
  - `show-item-in-folder`

4. Close the `session` capability family.

- Replace the direct Electron session clearing in `session_handlers.ts`.
- Prefer the existing Tauri command mapping:
  - `clear-session-data`
- Verify that data-clearing semantics match the current UX expectation.

5. Close the `window, screenshot, clipboard` capability family.

- Remove Electron-specific screenshot capture logic from `debug_handlers.ts`.
- Prefer the existing Tauri command path for `take-screenshot`.
- Keep the debug-bundle behavior intact and migrate only the window/clipboard-dependent leaf.

6. Close the `GitHub flow affinity` capability family.

- Remove `BrowserWindow` ownership from `github_handlers.ts`.
- Replace it with sender-owned or app-owned flow state that works on the Tauri event bridge.
- Preserve flow events:
  - `github:flow-update`
  - `github:flow-success`
  - `github:flow-error`

7. Close the `app host lifecycle` tail inside `app_handlers.ts`.

- Remove direct Electron `app` ownership for relaunch or quit behavior only after the dialog leaf is already separated or migrated.
- Any remaining restart or relaunch semantics must be implemented through an explicit Tauri-hosted equivalent or consciously deferred behind a documented release decision.

8. Collapse the remaining registration spine.

- Revisit:
  - `base.ts`
  - `safe_handle.ts`
  - `chat_stream_handlers.ts`
  - `free_agent_quota_handlers.ts`
- Only after all leaf capabilities above are resolved.
- The goal of this phase is to remove or isolate direct `ipcMain.handle(...)` reliance from the release path.

9. Run final release-line validation and delete the tail.

- Re-run the Electron legacy audit.
- Re-run the Tauri validation gates.
- Delete any now-dead compatibility code that survived only to support removed Electron leaf behavior.

8. Requirement -> Task -> Test -> Gate

1. Requirement: treat the remaining Electron surface as capability work, not random cleanup.

- Task: classify remaining imports by host-capability family.
- Test: audit output and working notes stay aligned with the spec buckets.
- Gate: no implementation slice may start with transport-core files before leaf families are resolved.

2. Requirement: dialog, shell, session, screenshot, and GitHub flow capabilities work through Tauri ownership.

- Task: migrate or delete direct Electron usage in the corresponding handlers.
- Test: targeted unit and integration coverage for the affected channels.
- Gate: direct Electron imports disappear from the leaf handlers.

3. Requirement: renderer contracts remain stable during the final cutover.

- Task: keep channel names and frontend callsites unchanged unless a separate contract spec authorizes change.
- Test: targeted bridge tests and route-level smoke pass.
- Gate: no unplanned renderer contract churn.

4. Requirement: transport-core cleanup happens only after leaf host capabilities are safe.

- Task: collapse `ipcMain` registration leftovers only after leaf migration.
- Test: `chat` start/cancel, quota test hooks, and typed handler paths still validate.
- Gate: no core registration rewrite lands while a leaf handler still owns Electron directly.

5. Requirement: final release-line Electron runtime surface is gone.

- Task: remove the remaining runtime Electron imports and dead compatibility code.
- Test: audit reports `electronImportFileCount: 0`.
- Gate: this spec is not accepted until that gate passes.

9. Acceptance and Tests

- Required validation for each accepted slice:
  - `npm run ts`
  - targeted `vitest` for touched handlers or utilities
  - `node scripts/audit-electron-legacy-surface.js`
- Required validation before final acceptance of this spec:
  - `npm run ts`
  - `npm run build`
  - `npm run check:tauri`
  - targeted `vitest`
  - milestone-level Tauri regression lane
  - `node scripts/audit-electron-legacy-surface.js`
- Final acceptance gates:
  - `entrypointCount: 0`
  - `electronImportFileCount: 0`
  - no release-critical user flow depends on an Electron-only path

10. Promotion Artifacts

- Required promotion artifacts for this spec:
  - updated working note or checkpoint note after each accepted capability family;
  - commit checkpoints that name the capability family being removed;
  - synced `INDEX`, `inventory`, `progress`, and `validation`;
  - final note in `notes/2026-03-13-tauri-cutover-checkpoint.md` or a newer checkpoint note when the spec is closed.

11. Risks and Rollback

- Risks:
  - deleting a fallback path before Tauri behavior is actually equivalent;
  - mixing leaf-capability migration with registration-core cleanup in the same commit;
  - assuming a Tauri mapping is functionally complete because the command name already exists;
  - expanding this slice into logger migration, UI redesign, or post-release agent work.
- Rollback:
  - keep one capability family per commit checkpoint;
  - revert the last capability-family commit if parity fails;
  - do not combine transport-core cleanup with unrelated leaf behavior in one rollback unit.

12. Agent Guardrails

- Always migrate one host-capability family at a time.
- Do not use the Electron audit count as the only source of truth.
- Treat `base.ts`, `safe_handle.ts`, and `chat_stream_handlers.ts` as last-phase files.
- If a handler mixes native host work with ordinary business logic, split the host-specific leaf first.
- Do not widen this slice into:
  - `electron-log` removal,
  - post-release agent runtime work,
  - broader React or Leptos redesign,
  - unrelated product hardening.

## Evidence

- path: `scripts/audit-electron-legacy-surface.js`
  symbol: `audit summary`
  lines: 159-175
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Remaining Electron legacy surface`
  lines: 73-86
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Electron Host Removal`
  lines: 116-141
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Recommended Resume Order`
  lines: 142-147
- path: `src/ipc/handlers/app_handlers.ts`
  symbol: `Electron app and dialog usage`
  lines: 1-1
- path: `src/ipc/handlers/app_handlers.ts`
  symbol: `legacy get-env-vars registration`
  lines: 993-993
- path: `src/ipc/handlers/app_handlers.ts`
  symbol: `dialog-based location selection`
  lines: 1823-1823
- path: `src/ipc/handlers/import_handlers.ts`
  symbol: `dialog-based app import`
  lines: 1-22
- path: `src/ipc/handlers/node_handlers.ts`
  symbol: `dialog and ipcMain-based node selection`
  lines: 1-115
- path: `src/ipc/handlers/shell_handler.ts`
  symbol: `shell open and reveal`
  lines: 1-32
- path: `src/ipc/handlers/session_handlers.ts`
  symbol: `Electron session clearing`
  lines: 1-9
- path: `src/ipc/handlers/debug_handlers.ts`
  symbol: `BrowserWindow screenshot and clipboard path`
  lines: 451-461
- path: `src/ipc/handlers/github_handlers.ts`
  symbol: `BrowserWindow affinity in GitHub flow`
  lines: 1-1
- path: `src/ipc/handlers/github_handlers.ts`
  symbol: `BrowserWindow-from-sender flow binding`
  lines: 463-474
- path: `src/ipc/handlers/base.ts`
  symbol: `typed ipcMain registration`
  lines: 1-85
- path: `src/ipc/handlers/safe_handle.ts`
  symbol: `logged ipcMain registration`
  lines: 1-12
- path: `src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `chat stream ipcMain registration`
  lines: 2-232
- path: `src/ipc/handlers/free_agent_quota_handlers.ts`
  symbol: `test-only ipcMain quota hook`
  lines: 7-84
- path: `src/ipc/runtime/desktop_runtime.ts`
  symbol: `dual Electron and Tauri transport`
  lines: 1-99
- path: `src/ipc/runtime/core_domain_channels.ts`
  symbol: `existing Tauri mappings for remaining host capabilities`
  lines: 47-48
- path: `src/ipc/runtime/core_domain_channels.ts`
  symbol: `existing Tauri mappings for shell and session`
  lines: 129-145
- path: `src/ipc/runtime/core_domain_channels.ts`
  symbol: `existing Tauri mappings for shell open and quota test hook`
  lines: 176-178
- path: `src-tauri/src/lib.rs`
  symbol: `registered Tauri commands for host capabilities`
  lines: 88-144
- path: `src-tauri/src/wave_b_domains.rs`
  symbol: `select_app_folder and select_app_location`
  lines: 173-189
- path: `src-tauri/src/wave_f_domains.rs`
  symbol: `open_external_url`
  lines: 755-755
- path: `src-tauri/src/wave_g_domains.rs`
  symbol: `show_item_in_folder and clear_session_data`
  lines: 317-346
- path: `src-tauri/src/wave_p_domains.rs`
  symbol: `github_start_flow`
  lines: 287-287
- path: `src-tauri/src/wave_ah_domains.rs`
  symbol: `test_simulate_quota_time_elapsed`
  lines: 127-127
- path: `src-tauri/src/wave_al_domains.rs`
  symbol: `take_screenshot clipboard path`
  lines: 33-63
- path: `docs-new/04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Phase 6 cutover and cleanup`
  lines: 149-168
- path: `docs-new/04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md`
  symbol: `Remaining Cutover Gaps`
  lines: 57-63
- path: `docs-new/05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md`
  symbol: `release cutover versus regression framing`
  lines: 1-220

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../sprints/sprint-11-final-cutover-and-electron-cleanup.md]]
- [[../../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md]]
