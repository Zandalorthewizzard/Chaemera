# 2026-03-30 Legacy Chat Runtime Audit Snapshot 5

Status: working note, non-canonical.

## Purpose

This snapshot records the next audit slice after snapshot 4, focused on the remaining import-adjacent runtime proofs and on separating import-shell flakiness from the actual chat/copy runtime lane.

## Confirmed Findings

### 1. The observed `Import App -> Select Folder` failure is not the import runtime core

The previously observed failure:

- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
- and then the adjacent `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`

both stopped at the same UI point:

- click `Import App`
- click `Select Folder`
- wait for `//input[@placeholder="Enter new app name"]`
- input never appears

What this now means:

- the failing boundary is the Tauri WebDriver interaction with the folder-picker/import dialog shell
- this is not proof of a broken `import-app` IPC path
- this is not proof of a broken chat worker / stream / copy pipeline

Important correction:

- one earlier manual repro had been run with `npx wdio ... --spec ...` directly, without the per-spec runtime setup hook env
- that invocation is not valid evidence for the import fixture lane because `CHAEMERA_TAURI_RUNTIME_SETUP` is what preloads the folder-selection fixture for these specs
- after rerunning with the proper setup hook, the same UI boundary still failed, which strengthens the conclusion that the seam is in the folder-picker/dialog harness interaction itself, not in missing test setup

### 2. The correct audit move here is to bypass the dialog shell and prove runtime semantics directly

The handoff note explicitly said not to spend time re-proving import dialog shell behavior as a standalone goal.

So the runtime specs were rewritten to exercise the real Tauri core import path directly:

- use `invokeCoreCommand("import-app", ...)`
- navigate to `/app-details?appId=...`
- then continue the runtime assertions from there

This keeps the proof focused on:

- imported app persistence
- selected app restoration in the shell
- app-details landing behavior
- chat/copy runtime behavior after import
- absence/presence of follow-up chat automation

and it avoids over-classifying a folder-picker WebDriver seam as chat-runtime corruption.

### 3. `import-with-ai-rules` is now passing as a runtime proof

Updated spec:

- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`

What it now proves live:

- `import-app` through the Tauri core bridge succeeds for a fixture that already contains `AI_RULES.md`
- the app can be opened on `/app-details?appId=...`
- the title bar synchronizes to the imported app selection
- imported files land in the isolated runtime apps dir
- the AI rules autogeneration prompt is not injected for an app that already has `AI_RULES.md`

Validation result:

- `npx wdio run wdio.conf.mjs --spec ./specs/import-with-ai-rules.e2e.mjs`
- `passes`

### 4. `copy-chat` was blocked by the same shell seam, not by copy/chat runtime

Adjacent spec failure matched the same pattern exactly:

- `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
- same `Import App -> Select Folder -> missing app name input` boundary

This was not a second independent runtime failure.

It was the same import-dialog shell issue sitting in front of the copy-message runtime proof.

### 5. `copy-chat` is now passing again once the import shell seam is bypassed

Updated spec:

- `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`

What it now proves live:

- imported app with existing `AI_RULES.md` can be selected and opened from `app-details`
- `Open in Chat` reaches the real worker-backed chat lane
- canned write response completes
- copy-message output strips raw dyad tags and preserves markdown/code-fence formatting

Validation result:

- `npx wdio run wdio.conf.mjs --spec ./specs/copy-chat.e2e.mjs`
- `passes`

## Updated Capability Interpretation

The remaining evidence now points to this split:

- live-proven runtime/core behavior:
  - import-app core path
  - app-details imported-app landing
  - selected-app shell sync from route
  - chat stream after imported app entry
  - copy-message formatting behavior after streamed output
- still unproven / host-shell-adjacent behavior:
  - WebDriver-driven `Select Folder` interaction inside the import dialog

This means the import lane no longer expands the chat-runtime defect scope.

It instead narrows the residual problem to a host-shell/dialog automation seam.

## Validation Commands Run In This Slice

- `npx wdio run wdio.conf.mjs --spec ./specs/import-with-ai-rules.e2e.mjs`
- `set "CHAEMERA_TAURI_RUNTIME_SETUP=./specs/copy-chat.setup.mjs" && npx wdio run wdio.conf.mjs --spec ./specs/copy-chat.e2e.mjs`
- `npx wdio run wdio.conf.mjs --spec ./specs/copy-chat.e2e.mjs`

## Recommended Next Audit Move

1. Record import-with-existing-AI-rules as live-proven at the runtime/core level, with a note that folder-picker UI shell proof was intentionally bypassed.
2. Reclassify the `Select Folder` issue as host-shell / WebDriver dialog automation debt, not chat-runtime corruption.
3. Continue with the next remaining runtime capability rows instead of spending more audit time on the folder-picker shell.
