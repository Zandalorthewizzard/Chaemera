# Temporary Status After First OSS Commit

This is a temporary note until the new documentation system is introduced.

## Baseline

- Branch: `refactor/leptos-tauri2`
- Commit: `959b023`
- Date: 2026-02-23
- Scope of that commit: remove `src/pro` and keep Apache-2.0-only code.

## Currently Not Functional (Known Gaps)

1. Local Agent runtime modes are temporarily disabled in OSS build:
   - Ask mode (read-only local agent)
   - Plan mode
   - Local-agent mode
   - Current behavior: explicit error message and early stop.
   - Reference: `src/ipc/handlers/local_agent/local_agent_handler.ts`

2. Visual editing backend handlers are temporary stubs:
   - `apply-visual-editing-changes` no-op
   - `analyze-component` returns fallback values
   - Reference: `src/ipc/handlers/visual_editing_handlers.ts`

3. Search/replace processor and parser were replaced with OSS-compatible baseline implementations:
   - Behavior can differ from previous pro implementation.
   - References:
     - `src/ipc/processors/search_replace_processor.ts`
     - `src/shared/search_replace_parser.ts`

4. Turbo edits prompt was replaced with a minimal OSS prompt:
   - Reference: `src/prompts/turbo_edits_v2_prompt.ts`

## Temporary Goal

Keep repository legally clean (Apache-2.0-only) and compilable while we migrate functionality into open modules.

## Next Documentation Step

This file is temporary and should be replaced once the new documentation strategy is approved.
