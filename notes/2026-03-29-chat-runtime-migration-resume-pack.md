# Context

This note is the practical resume pack for the next session that touches Tauri chat runtime migration.

It exists so a fresh session does not restart from the wrong assumption that:

1. Wave C already migrated real packaged chat
2. the next step is a Rust rewrite of the current AI runtime
3. the current task includes the post-release structured-agent architecture

# Mandatory Reading Order

1. [AGENTS.md](/C:/Work/proj/Chaemera/AGENTS.md)
2. [CONTRIBUTING.md](/C:/Work/proj/Chaemera/CONTRIBUTING.md)
3. [rules/electron-ipc.md](/C:/Work/proj/Chaemera/rules/electron-ipc.md)
4. [rules/product-principles.md](/C:/Work/proj/Chaemera/rules/product-principles.md)
5. [docs-new/00-navigation/INDEX.md](/C:/Work/proj/Chaemera/docs-new/00-navigation/INDEX.md)
6. [docs-new/01-concepts/ai-driven-development.md](/C:/Work/proj/Chaemera/docs-new/01-concepts/ai-driven-development.md)
7. [docs-new/01-concepts/strict-specs.md](/C:/Work/proj/Chaemera/docs-new/01-concepts/strict-specs.md)
8. [docs-new/01-concepts/discussion-first.md](/C:/Work/proj/Chaemera/docs-new/01-concepts/discussion-first.md)
9. [docs-new/02-guides/agent-navigation.md](/C:/Work/proj/Chaemera/docs-new/02-guides/agent-navigation.md)
10. [docs-new/02-guides/working-notes.md](/C:/Work/proj/Chaemera/docs-new/02-guides/working-notes.md)
11. [docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md)
12. [docs-new/04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md)
13. [docs-new/05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md](/C:/Work/proj/Chaemera/docs-new/05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md)
14. [docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md)
15. [docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md)

# Code Files To Read Before Editing

1. [src/ipc/types/chat.ts](/C:/Work/proj/Chaemera/src/ipc/types/chat.ts)
2. [src/hooks/useStreamChat.ts](/C:/Work/proj/Chaemera/src/hooks/useStreamChat.ts)
3. [src/ipc/handlers/chat_stream_handlers.ts](/C:/Work/proj/Chaemera/src/ipc/handlers/chat_stream_handlers.ts)
4. [src/ipc/handlers/testing_chat_handlers.ts](/C:/Work/proj/Chaemera/src/ipc/handlers/testing_chat_handlers.ts)
5. [src/ipc/runtime/core_domain_channels.ts](/C:/Work/proj/Chaemera/src/ipc/runtime/core_domain_channels.ts)
6. [src-tauri/src/wave_c_domains.rs](/C:/Work/proj/Chaemera/src-tauri/src/wave_c_domains.rs)
7. [src-tauri/src/wave_f_domains.rs](/C:/Work/proj/Chaemera/src-tauri/src/wave_f_domains.rs)
8. [src-tauri/src/wave_w_domains.rs](/C:/Work/proj/Chaemera/src-tauri/src/wave_w_domains.rs)
9. [src-tauri/src/wave_ai_domains.rs](/C:/Work/proj/Chaemera/src-tauri/src/wave_ai_domains.rs)
10. [src/**tests**/tauri_wave_c_transport.test.ts](/C:/Work/proj/Chaemera/src/__tests__/tauri_wave_c_transport.test.ts)

# What Is Already Settled

1. Non-chat packaged smoke is closed for the current in-scope MVP surface.
2. Real packaged chat is still missing because [wave_c_domains.rs](/C:/Work/proj/Chaemera/src-tauri/src/wave_c_domains.rs) returns the stub error for real prompts.
3. The current release-line fix is not a Rust rewrite of the current AI runtime.
4. The accepted shape is:
   - stable renderer contract
   - Rust host session manager
   - host-neutral TypeScript chat runtime extraction
   - Node worker over structured stdio
5. `chat_count_tokens` and `chat_add_dep` are already separately migrated and should not be re-solved inside the main `chat_stream` cutover.

# What The Next Session Should Actually Do

1. Start with `Phase 1` only.
2. Do not open by editing `wave_c_domains.rs` first.
3. First extract reusable build-mode runtime logic out of [chat_stream_handlers.ts](/C:/Work/proj/Chaemera/src/ipc/handlers/chat_stream_handlers.ts).
4. Keep Electron behavior working while extracting.
5. Define typed worker protocol alongside the extracted runtime boundary.

# What The Next Session Should Not Do

1. Do not try to complete all chat parity in one slice.
2. Do not mix this with local-agent or post-release Codex/Logos work.
3. Do not turn this into an XML architecture redesign.
4. Do not change the renderer contract unless a true blocker is proven.
5. Do not attempt a broad Rust port of the existing TypeScript chat pipeline.

# Resume Point

The next concrete implementation artifact should be a code slice matching:

- [Tauri Chat Runtime Phase 1 Foundation Spec](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md)

If a new session does not have time for implementation, the next best preparatory step is to author the exact `worker protocol types` and `runtime boundary interface` before touching the heavy handler file.
