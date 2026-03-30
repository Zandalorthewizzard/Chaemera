# Decisions — Tauri Chat Runtime Phase 1

## 2026-03-29 Session Start

### Phase 1 Scope (from spec)

- Extract host-neutral TypeScript chat runtime from `chat_stream_handlers.ts`
- Define runtime callback/context interface
- Make Electron handler a thin adapter over extracted runtime
- Define typed worker protocol
- Preserve existing Electron behavior
- NO changes to: wave_c_domains.rs, renderer hooks, chat.ts contracts

### Architecture approach

- `src/ipc/chat_runtime/` — new directory for extracted runtime
- Runtime receives host-dependent behavior through explicit interface (callbacks)
- Electron adapter implements those callbacks using `event.sender` / `safeSend`
