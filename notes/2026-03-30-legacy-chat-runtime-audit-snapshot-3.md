# 2026-03-30 Legacy Chat Runtime Audit Snapshot 3

Status: working note, non-canonical.

## What Was Confirmed After Snapshot 2

The earlier live-audit stop point was not just an opaque environment failure.

It was a stack of concrete Tauri migration boundary defects in the chat runtime lane.

## Confirmed Migration Defects

### 1. Worker stdout protocol contamination

Confirmed defect:

- the Node chat worker runner allowed non-protocol stdout lines from the worker thread onto the same stdout channel as `WorkerOutboundMessage` JSON lines
- this produced the observed host parse failure:
  - `Failed to parse chat worker output: invalid type: integer '14'`

Concrete source:

- logger output from TypeScript runtime code imported by the worker was reaching stdout
- the host treated every stdout line as a serialized `WorkerOutboundMessage`

Fix applied:

- `worker/chat_worker_runner.js`
  - worker threads now run with captured `stdout` / `stderr`
  - worker stdout/stderr noise is redirected away from the JSON protocol stream

Validation:

- `src/ipc/chat_runtime/__tests__/chat_worker_runner.test.ts`
  - extended to prove that raw worker stdout noise no longer corrupts the protocol stream

### 2. Rust <-> worker field-name mismatch

Confirmed defect:

- Rust protocol enums used snake_case variant names but did not explicitly camel-case variant fields
- the worker was receiving malformed field names for the inbound start payload
- live symptom during audit:
  - worker log reported `Starting chat stream session for chat undefined`

Fix applied:

- `src-tauri/src/chat_worker_host.rs`
  - added `rename_all_fields = "camelCase"` to `WorkerInboundMessage`
  - added `rename_all_fields = "camelCase"` to `WorkerOutboundMessage`

### 3. Rust sqlite path vs TS worker sqlite path mismatch

Confirmed defect:

- Rust Tauri commands used `CHAEMERA_TAURI_USER_DATA_DIR` for `sqlite.db`
- the TypeScript worker database path still resolved from `CHAEMERA_TAURI_APP_DATA_DIR`
- result:
  - `create-app` inserted chats into one sqlite database
  - `runChatStreamSession` read from another sqlite database
  - live symptom:
    - `Chat not found: 1`

Fix applied:

- `src/db/index.ts`
  - `getDatabasePath()` now prefers `CHAEMERA_TAURI_USER_DATA_DIR`
  - database parent directory creation now follows the resolved sqlite path directly
- `src/__tests__/db_path.test.ts`
  - added coverage for the Tauri sqlite override behavior

### 4. Tauri end-event payload used `null` where renderer contract expected omitted optionals

Confirmed defect:

- the Rust host emitted `chat:response:end` with explicit `null` fields for optional values such as:
  - `extraFiles`
  - `extraFilesError`
  - `totalTokens`
  - `contextWindow`
  - `chatSummary`
  - `wasCancelled`
- the renderer stream contract uses optional fields, not nullable ones
- result:
  - the frontend could receive chunk events and render body text
  - but the `end` event failed schema validation and was effectively dropped
  - live symptom:
    - chat text appeared in body text checks
    - but the copy button never appeared because `isStreaming` never flipped back to false

Fix applied:

- `src-tauri/src/chat_worker_host.rs`
  - `emit_end()` now omits absent optional fields instead of sending them as `null`

## Live Revalidation After Fixes

### Home composer runtime path

Command:

- `npx wdio run wdio.conf.mjs --spec ./specs/home-chat-runtime.e2e.mjs`

Result now:

- `passes`

What this now proves live:

- app creation through Tauri host works on this path
- route transition to `/chat?id=...` works
- worker session starts successfully
- prompt persistence works
- chunk events reach the renderer
- end event reaches the renderer with valid payload shape
- assistant message copy affordance appears when streaming completes
- canned write content is copied and transformed as expected

### App-details runtime path

Command:

- `npx wdio run wdio.conf.mjs --spec ./specs/chat-from-app-details.e2e.mjs`

Current result:

- `still failing`

Current localized failure boundary:

- failure still occurs around the `browser.refresh()` / shell re-selection stage before the spec can prove the `/app-details -> Open in Chat` scenario end-to-end
- WebDriver still eventually reports `ECONNREFUSED`

## Updated Audit Interpretation

The home-composer chat runtime path is no longer merely `untested_live`.

It is now positively proven as working after resolving four concrete Tauri migration defects.

The remaining open live desktop problem is narrower:

- the `app-details` path still has a desktop harness or route-refresh instability
- that issue should now be classified separately from the already-proven home chat runtime core

## Current Scope Impact

Rows that can now move from provisional status:

- `Prompt, settings, and model resolve`
  - `works_live` on the home-composer path
- `User and assistant persistence`
  - `works_live` on the home-composer path
- `Provider invocation and streaming`
  - `works_live` on the home-composer test-response path through the Tauri worker lane
- `End and error semantics`
  - `works_live` for successful completion on the home-composer path
- `Completion UI handoff`
  - `works_live` on the home-composer path after end-event payload fix

Rows still open or partial:

- `App-details -> Open in Chat` path
  - `failing_live`
  - likely separate from the fixed home-composer runtime path
- `Imported-app navigation` and related reload assumptions
  - still require separate live confirmation
- `Apps-dir override alignment`
  - still suspicious because runtime logs show app file writes under `C:/Users/zand/chaemera-apps/...`
  - the runtime harness still exports `CHAEMERA_TAURI_APPS_DIR`, while app/runtime code expects `CHAEMERA_TAURI_CHAEMERA_APPS_DIR`

## Validation Commands Run In This Slice

- `npx vitest run src/ipc/chat_runtime/__tests__/chat_worker_runner.test.ts`
- `npx vitest run src/__tests__/db_path.test.ts src/ipc/chat_runtime/__tests__/chat_worker_runner.test.ts`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run pre:e2e:tauri-runtime`
- `npx wdio run wdio.conf.mjs --spec ./specs/home-chat-runtime.e2e.mjs`
- `npx wdio run wdio.conf.mjs --spec ./specs/chat-from-app-details.e2e.mjs`

## Next Best Audit Move

1. Keep the newly proven home-composer path as positive evidence in the capability matrix.
2. Investigate the `app-details` live failure independently.
3. Audit the apps-dir override name mismatch because it may affect import/app-details scenarios even though the home path now passes.
