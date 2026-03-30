# Phase 2 — Node Worker Runtime for Chat

## Objective

Build a Node worker that uses the extracted `runChatStreamSession()` and communicates via typed stdio protocol.

## Architecture

Follows existing TSC worker pattern:

- `chat_worker_runner.js` (stdio bridge, long-lived, interactive session)
- `chat_worker.ts` (worker_threads entry, builds ChatRuntimeContext, calls runChatStreamSession)

## New Files

1. `src/ipc/chat_runtime/worker_stdio.ts` — JSON-lines framing over stdio
2. `workers/chat/chat_worker.ts` — worker entrypoint
3. `worker/chat_worker_runner.js` — stdio bridge runner
4. `workers/chat/tsconfig.json` — worker TS config
5. `src/ipc/chat_runtime/__tests__/worker_stdio.test.ts` — tests

## Key Design Decisions

- Use JSON-lines (newline-delimited JSON) for framing — same as recommended in migration plan
- Worker manages session state via Map of chatId -> AbortController
- Consent requests block (via Promise) until host sends response
- Worker reads from stdin line-by-line (not one-shot like TSC worker)
- No changes to chat_stream_handlers.ts

## What This Phase Does NOT Do

- No wave_c_domains.rs rewrite
- No MCP parity / full XML parity
- No renderer contract changes
- No local-agent reopening
