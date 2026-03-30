# 2026-03-30 Legacy Chat Runtime Audit Snapshot 1

Status: working note, non-canonical.

## What Was Verified

- The known-good packaged baseline executable exists:
  - `src-tauri/target/release/chaemera-tauri.exe`
- Targeted chat-runtime unit coverage on the current branch passed:
  - 6 files
  - 34 tests
- Real desktop Tauri harness booted successfully on the current branch:
  - `testing/tauri-webdriver/specs/boot.e2e.mjs`
- Real desktop import-flow desktop specs failed on the current branch, but the failure is now localized:
  - `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
  - `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`

## Current Interpretation

- The current branch desktop harness is alive.
- The failing `import-with-ai-rules` and `copy-chat` runtime specs are not yet proof that the chat-runtime execution core is broken.
- The immediate mismatch is that those specs still wait for `/chat` after import, while the current app landing route for imported apps is `/app-details`.
- That means the first live failure looks like a stale harness expectation, not a proven failure inside `chat_stream`.

## Evidence Trail

- `src/lib/import_flow.ts`
  - imported apps now land on `/app-details`
- `src/pages/home.tsx`
  - import flow navigates via the imported-app landing route helper
- `src/components/ImportAppDialog.tsx`
  - import completion also navigates via the imported-app landing route helper
- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
  - still waits for `/chat`
- `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
  - still waits for `/chat` and only then sends the chat prompt

## Practical Status Notes

- `Packaged Tauri entrypoint`
  - current branch: `works` for boot-level desktop proof
- `Import landing after app import`
  - current branch: `works` for the app-details route
  - runtime spec expectation: `stale`
- `Chat runtime execution core`
  - current branch: `untested_live`, but `code-audit` and unit tests indicate the extracted runtime shell is real and wired
- `Desktop Tauri harness`
  - current branch: `works`

## Next Audit Move

1. Update the runtime scenario set so it reflects the current imported-app landing route.
2. Re-run a real desktop chat prompt path from `/app-details` or from an existing chat entry point.
3. Keep `chat_stream` classification separate from import/navigation classification.
4. Only then mark any chat-runtime row as `broken` or `partial`.

## Provisional Matrix Notes

- `Packaged Tauri entrypoint` should stay `works`.
- `User and assistant persistence`, `Prompt/settings/model resolve`, `Provider invocation and streaming`, and related `chat_stream` mechanics are still `untested_live` on the current branch until a prompt reaches the actual runtime path.
- `Import/navigation` is currently the first confirmed mismatch between live desktop behavior and the existing runtime spec assumptions.
