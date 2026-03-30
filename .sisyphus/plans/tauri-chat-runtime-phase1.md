# Phase 1: Extract Host-Neutral TypeScript Chat Runtime

## TODOs

- [x] T1: Create `src/ipc/chat_runtime/types.ts` — RuntimeContext interface + WorkerProtocol types
- [ ] T2: Create `src/ipc/chat_runtime/run_chat_stream_session.ts` — Extracted core stream orchestration
- [ ] T3: Create `src/ipc/chat_runtime/stream_processing.ts` — Extract stream chunk processing helpers
- [ ] T4: Refactor `chat_stream_handlers.ts` to use extracted runtime via Electron adapter
- [ ] T5: Add unit tests for extracted runtime boundary and worker protocol types
- [ ] T6: Verify Electron build-mode chat still works end-to-end (lsp + build + tests)

## Final Verification Wave

- [ ] F1: Runtime service has NO direct Electron imports (ipcMain, event.sender, safeSend)
- [ ] F2: Worker protocol types are fully typed and checked in
- [ ] F3: Electron handler is a thin adapter (delegates to runtime, only owns IPC plumbing)
- [ ] F4: No renderer contract changes — `chat.ts` and `useStreamChat.ts` untouched

## Scope Restrictions

- DO NOT touch: wave_c_domains.rs, useStreamChat.ts, chat.ts contracts
- DO NOT add: MCP parity, XML parity, auto-fix parity beyond what already exists
- DO NOT change: renderer contract
