# 2026-03-30 Legacy Chat Runtime Audit Handoff to GPT-5.4

Status: temporary working note, non-canonical.

## Purpose

This note hands off the remaining legacy chat-runtime audit to another GPT-5.4 agent in a separate editor session.

The goal is not to re-prove already confirmed host-shell behavior. The goal is to finish the audit table so we can define the exact Codex integration scope.

## Current Checkpoint

What is already confirmed on the current branch:

- Tauri desktop shell boots successfully.
- Targeted chat-runtime unit/protocol coverage is green.
- The legacy extracted runtime code and worker host wiring are real, not stubs.
- Import landing behavior has changed to `/app-details`, so old runtime specs that wait for `/chat` are stale.
- A first audit snapshot already exists in:
  - `notes/2026-03-30-legacy-chat-runtime-audit-snapshot-1.md`

## What NOT to Re-Test

Do not spend time re-proving already confirmed host-side surfaces unless they are required only as a transit path to reach the runtime core.

Skip re-testing these as standalone goals:

- booting the desktop shell
- preview shell
- app lifecycle chrome
- app management chrome
- import dialog shell behavior

Those are baseline/host checks and are already outside the remaining audit focus.

## Remaining Audit Focus

The remaining audit is to confirm or classify the following runtime mechanics:

- `User and assistant persistence`
- `Redo semantics`
- `Prompt, settings, and model resolve`
- `Codebase extraction`
- `Attachments and selected context`
- `Provider invocation and streaming`
- `End and error semantics`
- `XML cleanup`
- `Repair, continuation, and auto-fix`
- `Completion metadata`
- `Cancellation-aware behavior`
- `MCP consent and tool hooks`
- `Local-agent hook points`

## Known Context

Current code evidence already shows:

- `src/ipc/chat_runtime/run_chat_stream_session.ts` contains the extracted runtime brain.
- `src-tauri/src/chat_worker_host.rs` is the real Tauri-side worker bridge.
- The worker path currently lacks some optional runtime context hooks such as `getMcpTools` and `handleLocalAgentStream`.
- `notes/2026-03-30-legacy-chat-runtime-audit-snapshot-1.md` records that the first live desktop failures were stale route assumptions, not yet a proven `chat_stream` failure.

## Required Reading

Read these before continuing:

1. `docs-new/07-codex-logos-phase/README.md`
2. `docs-new/07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md`
3. `docs-new/07-codex-logos-phase/2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
4. `docs-new/07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md`
5. `docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
6. `docs-new/04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
7. `docs-new/05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
8. `notes/2026-03-29-chat-runtime-architecture-context.md`
9. `notes/2026-03-30-legacy-chat-runtime-audit-snapshot-1.md`

## Code / Test References

Use these as primary evidence sources:

- `src/ipc/chat_runtime/run_chat_stream_session.ts`
- `src-tauri/src/chat_worker_host.rs`
- `src/ipc/chat_runtime/worker_session_manager.ts`
- `src/ipc/chat_runtime/types.ts`
- `src/ipc/types/chat.ts`
- `src/ipc/types/agent.ts`
- `src/ipc/runtime/core_domain_channels.ts`
- `src/ipc/contracts/core.ts`
- `src/components/ImportAppDialog.tsx`
- `src/pages/home.tsx`
- `src/pages/app-details.tsx`
- `src/components/chat/HomeChatInput.tsx`
- `src/components/chat/ChatHeader.tsx`
- `src/lib/import_flow.ts`
- `testing/tauri-webdriver/specs/boot.e2e.mjs`
- `testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
- `testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
- `testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
- `testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`

## Rules For The Agent

- Treat OpenCode as topology inspiration only.
- Do not revive XML-first assumptions.
- Do not reclassify host-shell behavior as runtime-core behavior.
- Keep `legacy-repair` and `Codex-Logos` separated conceptually even if the code paths overlap in transit.
- Use only concrete evidence, never vague labels.
- If something cannot be proven, mark it `untested`, `unknown`, or `by-design-unavailable`.
- If a failure is due to stale route assumptions, record it as stale harness / stale proof, not as runtime corruption.

## Desired Proof Shape

The remaining audit should end with a filled table row for each runtime capability that contains:

- `Capability`
- `Acceptance`
- `Legacy Evidence`
- `Old EXE Baseline`
- `Current Branch`
- `Failure Location`
- `Proof Method`
- `Observed Symptom`
- `Codex Lane Disposition`
- `Next Action`

## Completion Criteria

The handoff is complete when the other agent produces:

1. A filled first-pass audit table with all remaining runtime rows classified.
2. A clear separation between:
   - confirmed host-side behavior,
   - confirmed runtime-core behavior,
   - stale test expectations,
   - and genuine runtime defects.
3. A final disposition map for each row:
   - `keep-chaemera-host`
   - `legacy-repair-only`
   - `replace-with-codex-core`
   - `drop`
4. A concise recommendation for the Codex daemon integration scope.
5. Any residual unknowns that still need either live baseline or code evidence.

## Suggested Start Point For The Other Agent

Start from the current checkpoint, then immediately verify the new live runtime route with the home composer flow instead of the stale `/chat` import assumptions.

If that still does not reach `chat_stream`, record the exact failure boundary and stop there.
