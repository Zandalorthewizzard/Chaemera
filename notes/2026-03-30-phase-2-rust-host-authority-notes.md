# 2026-03-30 Phase 2 Rust Host Authority Notes

## Context

- Packaging root-resolution blocker is fixed via `scripts/run-tauri-cli.js`.
- Next roadmap phase is `Rust host authority hardening`.

## Architecture review

- Current Tauri host authority lives primarily in `src-tauri/src/chat_worker_host.rs`.
- The worker runtime session owner lives in `src/ipc/chat_runtime/worker_session_manager.ts`.
- The legacy runtime brain remains in `src/ipc/chat_runtime/run_chat_stream_session.ts`.
- Renderer completion/error state handling lives in `src/hooks/useStreamChat.ts`.

## Current ownership split

- Rust already owns:
  - worker process spawn,
  - stdout/stderr readers,
  - exit monitoring,
  - consent-response routing,
  - renderer event emission.
- TypeScript worker currently still decides:
  - when to emit `end`,
  - when to emit `error`,
  - and whether aborted sessions produce `wasCancelled` end events.

## Immediate defect priority

- The highest-leverage first fix is still terminal-state authority.
- Today one failing worker path can emit both:
  - `chat:response:error`
  - and `chat:response:end`
- This happens in Rust host paths such as:
  - stdout parse failure,
  - worker `Error` outbound message,
  - non-zero worker exit.

## Recommended implementation order inside Phase 2

1. Add a Rust terminal-state guard in `chat_worker_host.rs` so only one terminal path wins.
2. Normalize Rust terminal helpers so:
   - success/cancel emits `chat:response:end` plus `chat:stream:end`
   - hard failure emits `chat:response:error` plus `chat:stream:end`
   - no path emits both `error` and `end` for one session.
3. Validate that renderer cleanup still works because `useStreamChat.ts` already treats `onError` as terminal.
4. After terminal truth is stable, move to the next Rust-owned slice:
   - cancel outcome normalization,
   - then env/settings/app-path authority.

## Why not start with env injection first

- `appPath` and `settingsSnapshot` authority matters, but it touches more runtime code paths in `run_chat_stream_session.ts`.
- Terminal-state authority is more localized in Rust and reduces semantic ambiguity before broader runtime-environment work.
- This keeps the first hardening slice small enough to validate cleanly.

## Resume point

- Refactor `src-tauri/src/chat_worker_host.rs` around one terminal guard.
- Add tests if a clean pure helper extraction is practical; otherwise validate with Rust check plus existing JS-side tests.
- Re-run package/build validation after the Rust change.

## Implemented so far

- Added a Rust terminal-state guard in `src-tauri/src/chat_worker_host.rs`.
- Normalized terminal emission so the host now treats terminal paths as:
  - success or cancel -> `chat:response:end` plus `chat:stream:end`
  - hard failure -> `chat:response:error` plus `chat:stream:end`
- Removed the old Rust behavior where one failing session could emit both `error` and `end`.
- Updated start failure handling so `chat_stream` start errors also terminate through `error` plus `stream:end` instead of `error` plus fake success-style `end`.

## Environment authority progress

- Rust host now resolves and injects real worker environment inputs before starting the chat worker:
  - `appPath` in the worker start message now points at the chat's real resolved app path,
  - `settingsSnapshot` now carries real Rust-read settings,
  - worker process env now gets:
    - `CHAEMERA_TAURI_USER_DATA_DIR`
    - `CHAEMERA_TAURI_APP_DATA_DIR`
    - `CHAEMERA_TAURI_CHAEMERA_APPS_DIR`
- This does not yet remove all TS-side fallback reads, but it does make the worker environment materially host-authored instead of empty.

## Cancellation normalization progress

- Added a worker-side suppression for stream errors that arrive after explicit cancellation.
- Added a top-level runtime catch-path suppression for terminal errors when the abort signal is already set.
- This should reduce `cancelled but also errored` outcomes before the next deeper cancellation pass.

## Validation run

- `cargo check --manifest-path src-tauri/Cargo.toml` passed after the Rust changes.
- `node scripts/run-tauri-cli.js build --no-bundle` passed after the Rust and TS changes.
- Targeted tests passed:
  - `src/ipc/chat_runtime/__tests__/worker_stdio.test.ts`
  - `src/ipc/chat_runtime/__tests__/chat_worker_runner.test.ts`
  - `src/__tests__/chat_stream_runtime_adapter.test.ts`

## Verification expansion

- `npm run ts` passed after wiring host-authored runtime environment into the worker context.
- `npm run pre:e2e:tauri-runtime` passed and rebuilt the real desktop runtime harness.
- Key Tauri runtime specs passed after the hardening work:
  - `testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`
  - `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
  - `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
  - `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
- This gives fresh proof that:
  - packaging root resolution is fixed,
  - host terminal-state normalization did not regress the proven legacy runtime lane,
  - and host-authored app/settings environment injection did not break the worker-backed flows.

## Next likely Phase 2 slice

- Remaining packaged-manual-only proof is still deferred for the real release exe scenarios listed in the audit bucket.
- The next high-value implementation slice is now likely `MCP` architecture and adapter review, because the current release lane is once again green on its core verified paths.
