# 2026-03-30 Phase 4 MCP Architecture Notes

## Context

- The core legacy release lane is green again on:
  - packaging,
  - key Tauri runtime specs,
  - Rust terminal-state authority,
  - and initial host-authored env wiring.
- The next roadmap phase that still matters for MVP is `MCP`.

## Architecture review

- `run_chat_stream_session.ts` already has the build-mode MCP branch.
- That branch is gated by:
  - `settings.enableMcpServersForBuildMode`
  - `settings.selectedChatMode === "build"`
  - and `ctx.getMcpTools`
- Electron path already provides `ctx.getMcpTools` in `src/ipc/handlers/chat_stream_handlers.ts`.
- Worker/Tauri path currently provides consent transport, but not `ctx.getMcpTools`.

## Actual MCP gap

- The missing capability is not consent UI.
- The missing capability is the worker-side toolset adapter.
- In other words:
  - tool consent request/response already exists end to end,
  - but the worker runtime never exposes enabled MCP tools to `runChatStreamSession`,
  - so the MCP execution branch stays unreachable.

## Recommended implementation shape

- Do not create a separate MCP architecture just for Tauri.
- Extract one shared MCP toolset builder that can be used by both:
  - Electron adapter
  - worker/Tauri adapter
- The shared builder should take one consent callback rather than owning renderer transport directly.

## Release-line implementation rule

- Keep ownership split narrow:
  - shared builder owns enabled server enumeration and tool wrapping,
  - adapter owns how consent is requested.
- This avoids duplicating server discovery and tool wrapping logic while preserving the host-specific consent boundary.

## Resume point

- Extract shared MCP toolset construction.
- Wire Electron adapter to it.
- Wire worker session manager to it through `requestMcpToolConsent`.
- Add a narrow test proving the worker runtime context now exposes `getMcpTools`.

## Implemented result

- Added shared MCP toolset construction in `src/ipc/chat_runtime/mcp_tools.ts`.
- Rewired Electron adapter in `src/ipc/handlers/chat_stream_handlers.ts` to use the shared builder.
- Rewired worker/Tauri adapter in `src/ipc/chat_runtime/worker_session_manager.ts` so worker-backed sessions now expose `getMcpTools` instead of leaving the MCP branch unreachable.
- Kept consent ownership adapter-local:
  - Electron path still routes consent through renderer event bridge.
  - Worker path still routes consent through existing worker consent request messages.

## Validation

- Added `src/ipc/chat_runtime/__tests__/mcp_tools.test.ts` for the shared builder.
- Expanded `src/ipc/chat_runtime/__tests__/chat_worker.test.ts` to assert the worker runtime context exposes `getMcpTools` and carries host-authored runtime environment.
- Validation passes:
  - targeted Vitest runtime suite
  - `npm run ts`
  - `cargo check --manifest-path src-tauri/Cargo.toml`
  - `node scripts/run-tauri-cli.js build --no-bundle`

## Remaining MVP gap for MCP

- MCP is no longer adapter-blocked in code.
- What remains is runtime verification with a real enabled MCP server and consent flow on the Tauri release line.
- The next high-value step is to add one focused verification scenario for worker-backed MCP execution rather than broad new MCP surface work.
