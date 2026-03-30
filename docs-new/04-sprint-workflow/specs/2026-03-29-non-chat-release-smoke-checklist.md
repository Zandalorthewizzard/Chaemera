---
id: chaemera-spec-non-chat-release-smoke-checklist-2026-03-29
title: Non-Chat Release Smoke Checklist
type: spec
status: historical
tags: [spec, release, smoke, tauri, mvp]
related:
  [
    [../spec-template.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
    [2026-03-29-dyad-brokered-neon-and-supabase-oauth-issue.md],
  ]
depends_on:
  [
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Non-Chat Release Smoke Checklist

## 1. Start Here

- Historical notice:
  - this document records the earlier non-chat release smoke stage before the legacy runtime audit re-centered the remaining release work around the chat/runtime lane;
  - keep it as a completed release-stage checklist, not as the active release control document.
- This document is the executable checklist for closing the current non-chat release stage.
- The checklist assumes the packaged Tauri executable already exists and is the artifact under test.
- The checklist intentionally excludes chat runtime migration work.
- The checklist is meant to be used as a pass/fail record with notes, not as a planning discussion.

## 2. Current Verified Baseline

- The packaged Windows executable was built successfully at `src-tauri/target/release/chaemera-tauri.exe`.
- Tauri bridge and cutover audits are currently clean for runtime mapping.
- Electron legacy entrypoints are removed from the shipped runtime.
- The remaining chat runtime gap is intentional and deferred.
- The remaining OAuth broker issue is intentionally deferred and tracked separately.

### Evidence

- path: `src-tauri/target/release/chaemera-tauri.exe`
  symbol: `Packaged Tauri executable`
  lines: `artifact path produced by the local release build`
- path: `src-tauri/src/lib.rs`
  symbol: `Tauri invoke handler registration`
  lines: `1-260`
- path: `src-tauri/src/wave_c_domains.rs`
  symbol: `chat_stream`
  lines: `199-285`
- path: `src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `registerChatStreamHandlers`
  lines: `1-260`

## 3. Current Smoke Findings

- `PASS`: App import from a local folder works.
- `PASS`: Imported apps are saved into the apps list.
- `PASS`: Preview starts and renders correctly.
- `PASS`: Code view renders correctly.
- `PASS`: Version history and revert do not crash on the tested app.
- `PASS`: Settings and provider settings render without the old Leptos banner and scroll correctly.
- `PASS`: Help and support-tools flows are usable for the current local support surface.
- `PASS`: Delete flow no longer shows the transient `[list-versions] ... payload is not ready` popup in the manual smoke run.
- `PASS`: Imported apps now use `chaemera-apps` for the managed-folder path.
- `DEFERRED`: Large installed repo import reliability remains a separate `Import v2` issue.
- `DEFERRED`: The future docs-linked help entry remains a separate issue from the local support-tools surface.

## 3. Roles

### What you do

1. Run the packaged executable.
2. Verify visible product flows.
3. Record any failures, layout regressions, or missing behaviors.
4. Mark each checklist item `PASS`, `FAIL`, or `DEFERRED`.

### What I do

1. Fix P0 release-blocking issues you find in the smoke pass.
2. Tighten the shell/runtime or visible UI only when the issue is clearly in-scope.
3. Keep the release validation commands green.

### What we automate

1. TypeScript checks.
2. Rust/Tauri checks.
3. Tauri cutover audits.
4. Electron legacy surface audits.
5. Any repeatable regression checks that do not require a human judgment call.

## 4. Scope Rules

1. Do not attempt chat migration work in this checklist.
2. Do not attempt Supabase or Neon auth migration in this checklist.
3. Do not try to fix every visual mismatch on the first pass.
4. Treat a layout issue as a release blocker only if it hides core actions or breaks a primary flow.
5. Record all non-blocking visual problems separately so they can be handled after this stage.
6. Use the checklist as a hard stop before moving to chat runtime work.

## 5. Preflight

Before opening the app:

1. Confirm you are using the current packaged executable, not a dev server.
2. Confirm the build came from the current repo state.
3. Confirm the expected artifact path is `src-tauri/target/release/chaemera-tauri.exe`.
4. Confirm you are ready to record pass/fail notes for each step.

## 6. Shell Launch

1. Launch `src-tauri/target/release/chaemera-tauri.exe`.
2. Confirm the app window opens.
3. Confirm the app title is `Chaemera`.
4. Confirm the app does not crash on startup.
5. Confirm the main shell loads within a reasonable time.
6. Confirm any splash/loading state resolves instead of freezing.
7. Confirm the app can be closed and reopened without a startup crash.

Pass criteria:

- App opens and remains responsive.
- No startup crash dialogs.
- No blank window that never resolves.

## 7. Home and Navigation

1. Open the home screen.
2. Confirm the main navigation is visible.
3. Confirm the app list or empty state renders.
4. Confirm the create/import actions are visible.
5. Confirm the settings entry point is visible.
6. Confirm the help/support entry point is visible.
7. Confirm there is no broken navigation loop.

Pass criteria:

- Home is usable.
- Navigation is clickable.
- No major layout break hides the primary CTA surfaces.

## 8. App Lifecycle

### Create

1. Open the create app flow.
2. Create a minimal test app.
3. Confirm the app appears in the list after creation.
4. Confirm the new app can be selected.

### Import

1. Open the import app flow.
2. Import an existing local app if available.
3. Confirm the imported app appears in the list.
4. Confirm the imported app can be opened.

### Rename / Copy / Delete

1. Rename a test app.
2. Copy a test app.
3. Delete a test app.
4. Confirm the list updates correctly after each operation.

Pass criteria:

- Create, import, rename, copy, and delete all work without UI or runtime failure.
- App list state stays consistent after the operation.

## 9. Runtime Controls

1. Open the preview panel.
2. Run the app.
3. Confirm the app starts.
4. Stop the app.
5. Restart the app.
6. Confirm the runtime status updates correctly after each action.
7. Confirm preview output or run state is visible when the app is running.
8. Confirm stop and restart do not require a full app relaunch.

Pass criteria:

- Run / stop / restart work on the packaged app.
- Runtime state is reflected in the UI.
- No silent no-op on the primary runtime buttons.

## 10. Preview and Console

1. Open the preview surface.
2. Confirm the preview panel renders.
3. Confirm the console is visible.
4. Confirm console output is readable.
5. Confirm console filters or controls do not crash the view.
6. Confirm the preview panel can be reopened after closing or switching away.
7. Confirm no obvious console state desync after runtime start/stop.

Pass criteria:

- Preview and console both render.
- Output is visible and stable.
- No dead controls or broken panel state.

## 11. File and Editor Basics

1. Open a file from the current app.
2. Confirm the editor renders file contents.
3. Confirm basic editing is possible.
4. Confirm a simple save or apply action works.
5. Confirm file tree navigation still works after editing.
6. Confirm no crash occurs when switching files.

Pass criteria:

- File tree and editor are usable.
- A simple edit does not break the shell.

## 12. Version History and Revert

1. Open version history.
2. Confirm versions are listed.
3. Select a version.
4. Confirm the selected version loads its preview.
5. Trigger a revert on a safe test app.
6. Confirm the revert flow completes or fails with a clear message.
7. Confirm the UI state updates after revert.

Pass criteria:

- Version history is visible.
- Version selection works.
- Revert is not silently broken.

## 13. Settings and Provider Configuration

1. Open settings.
2. Confirm provider settings are visible.
3. Confirm Google provider settings open correctly.
4. Confirm a Google API key can be entered and saved.
5. Confirm the saved key persists after reopening the app.
6. Confirm the selected model persists after reopening settings.
7. Confirm Node path settings are visible and editable.
8. Confirm general release settings render without layout breakage.

Pass criteria:

- Settings pages load.
- Provider settings persist.
- Model selection persists.
- Node path settings are usable.

## 14. Help and Diagnostics

1. Open the help dialog.
2. Confirm the help dialog renders fully.
3. Confirm the support/debug bundle action is visible.
4. Confirm the debug bundle can be opened or generated.
5. Confirm there is no crash when reading the support payload.
6. Confirm any help links or report flows open correctly.

Pass criteria:

- Help is usable.
- Diagnostics do not crash.
- Support bundle flow remains intact.

## 15. Visual Regression Check

Review these screens for broken layout or unreadable controls:

1. Home.
2. Settings.
3. Preview.
4. Console.
5. App details.
6. Help.
7. Provider settings.
8. Version history.

Record each issue as one of:

- `P0` if it blocks a primary action.
- `P1` if it is visible but not blocking.
- `P2` if it is cosmetic.

## 16. Deferred Items

These are intentionally excluded from this checklist:

1. Chat runtime migration.
2. Chat send-to-model validation.
3. Supabase OAuth cleanup.
4. Neon OAuth cleanup.
5. Installer packaging.
6. Post-release agent core work.

## 17. Signoff

The current stage is closed when:

1. All P0 items above are `PASS`.
2. All P1 items are either fixed or recorded as explicit deferred follow-up.
3. No new runtime crash is found in the packaged executable.
4. The remaining open work is limited to the deferred items section.

## 18. Checklist Log

Use this section to record the actual pass/fail result for each step.

1. Shell launch: `PASS`
2. Home and navigation: `PASS`
3. App lifecycle: `PASS`
4. Runtime controls: `PASS`
5. Preview and console: `PASS`
6. File and editor basics: `PASS`
7. Version history and revert: `PASS`
8. Settings and provider configuration: `PASS`
9. Help and diagnostics: `PASS`
10. Visual regression review: `PASS`
11. Deferred items acknowledged: `PASS`
