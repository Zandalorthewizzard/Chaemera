---
id: chaemera-spec-legacy-xml-tag-namespace-compatibility-migration-2026-03-31
title: Legacy XML Tag Namespace Compatibility Migration Spec
type: spec
status: active
tags: [spec, legacy, xml, migration, branding, compatibility, tauri]
related:
  [
    [../spec-template.md],
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [
      ../../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md,
    ],
    [
      ../../07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-tauri-chat-runtime-migration-plan.md],
    [
      ../../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Legacy XML Tag Namespace Compatibility Migration Spec

## 1. Start Here

- This document defines a safe migration plan for replacing the legacy `dyad-*` XML tag namespace with a Chaemera-owned namespace while preserving release-line runtime behavior.
- This spec assumes the new canonical emitted namespace will be `chm-*`.
- If product leadership chooses a different Chaemera-owned prefix before implementation starts, the migration shape in this document should remain unchanged and only the centralized registry constants should change.
- This is a protocol-compatibility migration, not a runtime rewrite.
- The release-line `Legacy XML` mode remains allowed and supported during this work.

## 2. Intent + Non-goals

- Intent:
  - remove `Dyad` branding leakage from the live XML action language;
  - preserve packaged Tauri behavior for the current release-line legacy XML lane;
  - avoid breaking old transcripts, old stored messages, old fixtures, and old automated recovery loops;
  - centralize tag names so future namespace changes are not another cross-repo grep exercise.
- Non-goals:
  - no hard cut that makes old `dyad-*` transcripts unreadable or unexecutable;
  - no conversion of legacy XML mode into structured tool calling in this slice;
  - no broad rewrite of `runChatStreamSession(...)`, parser architecture, or renderer transcript model;
  - no requirement to migrate every historical stored message in sqlite before this lands;
  - no requirement to remove XML entirely from the release line.

## 3. Target Outcome

- All newly emitted build-mode XML tags use the new `chm-*` namespace.
- The runtime parser, executor, renderer, clipboard/export path, and recovery logic accept both:
  - legacy `dyad-*`
  - new `chm-*`
- Old stored chats and imported transcript history still render and behave correctly.
- Current packaged smoke behavior remains true:
  - initial versions visible after import;
  - external git commits become visible in Version History without restart when the versions UI is opened;
  - AI-created file writes still produce new versions.
- No user-visible runtime regression is introduced in:
  - build mode,
  - post-stream rendering,
  - copy chat,
  - import flows,
  - or XML recovery prompts.

## 4. Locked Decisions

1. The migration strategy is `dual-read / new-write`.
2. New generation emits `chm-*`.
3. Old `dyad-*` tags remain accepted by parser and renderer for release-line compatibility.
4. Runtime execution must normalize both namespaces into one internal action model before any business logic runs.
5. This migration must be implemented through a centralized tag registry, not duplicated string literals.
6. `Legacy XML` remains XML on the release line; this task does not authorize replacing it with a tool-only protocol.
7. Existing packaged and manual smoke behavior is the acceptance baseline, not a looser target.

## 5. Architecture Fit

- The current release-line build runtime still uses `dyad-*` as its action language.
- The current local-agent path is already separate and tool-based, so this task must not accidentally merge or blur the two control planes.
- The correct migration boundary is:
  - keep the XML runtime behavior;
  - change only the namespace contract;
  - preserve compatibility at parse, render, and execution time.
- This means the work belongs in prompt emission, XML parsing, transcript rendering, export/sanitization, and fixture/test surfaces, not in a broad host/runtime redesign.

## 6. Current Surface Map

### 6.1 Prompt emission surfaces

1. Build-mode XML instructions in `src/prompts/system_prompt.ts`
2. Upload and recovery XML instructions in `src/ipc/chat_runtime/run_chat_stream_session.ts`
3. Follow-up remediation prompt in `src/components/chat/ChatInput.tsx`

### 6.2 Parse and execution surfaces

1. XML regex parsing in `src/ipc/utils/xml_tag_parser.ts`
2. Full-response action application in `src/ipc/processors/response_processor.ts`
3. Unclosed-tag and dyad-tag cleanup helpers in `src/ipc/chat_runtime/helpers.ts`

### 6.3 Renderer and transcript surfaces

1. Tag classification and rendering in `src/components/chat/ActionMarkdownParser.tsx`
2. JSX intrinsic tag typing in `src/components/chat/types.d.ts`
3. Copy/export conversion in `src/hooks/useCopyToClipboard.ts`

### 6.4 Test and fixture surfaces

1. Fake LLM output in `testing/fake-llm-server/chatCompletionHandler.ts`
2. E2E fixtures under `e2e-tests/fixtures/`
3. Parser/processor unit tests under `src/__tests__/`
4. Webdriver/runtime specs that inspect copied/rendered tag output

## 7. Recommended Migration Shape

### 7.1 Central registry first

- Introduce one shared registry module that defines:
  - canonical action kinds;
  - canonical emitted tag names;
  - accepted aliases;
  - helper utilities for open/close tag names and regex construction.
- Example action coverage:
  - `write`
  - `rename`
  - `delete`
  - `add-dependency`
  - `execute-sql`
  - `search-replace`
  - `edit`
  - `command`
  - `chat-summary`
  - `write-plan`
  - transcript-only tags such as attachment or MCP result wrappers

### 7.2 Normalize before business logic

- Parser functions must return action objects keyed by canonical action kind.
- Business logic must stop caring whether the original raw tag was `dyad-write` or `chm-write`.
- Renderer components must switch on canonical action kind, not raw literal tag strings.

### 7.3 Keep old namespace readable indefinitely

- The safe default is to keep `dyad-*` accepted for as long as:
  - old chats remain in user databases,
  - old test fixtures remain useful,
  - or old assistant responses can still appear in transcript history.
- Hard-removing legacy alias support should be a separate task with its own evidence.

## 8. Ordered Implementation Tasks

### Phase 0. Freeze current behavior

Goal:

1. Capture the current runtime semantics before the namespace changes start.

Tasks:

1. Record the current packaged smoke result as the baseline:
   - initial Version History visible after import;
   - external git commits visible after opening versions UI;
   - AI-created file increments version count.
2. Add or refresh focused tests that prove the current `dyad-*` path before changing code.
3. Explicitly classify the existing `version-integrity.e2e.mjs` runtime check as `manual/unstable` and non-blocking until the namespace migration is finished.

Exit:

1. There is one agreed baseline for legacy behavior and one place to detect regression.

### Phase 1. Introduce a shared XML tag registry

Goal:

1. Eliminate distributed raw tag literals as the source of truth.

Tasks:

1. Add a shared registry module, for example `src/ipc/shared/xml_action_tags.ts`.
2. Define a canonical action record for every currently supported `dyad-*` tag.
3. For each action record, define:
   - emitted `chm-*` tag name;
   - accepted `dyad-*` alias;
   - any attribute expectations.
4. Add helper functions for:
   - alias-aware regex generation;
   - canonical action lookup from raw tag name;
   - transcript tag classification.
5. Add unit tests for the registry itself.

Exit:

1. The rest of the migration can import tag definitions from one place.

### Phase 2. Make parser and helpers alias-aware

Goal:

1. Allow runtime ingestion of both old and new namespaces without changing behavior.

Tasks:

1. Update `src/ipc/utils/xml_tag_parser.ts` so every parser accepts both namespaces.
2. Update `src/ipc/chat_runtime/helpers.ts` so:
   - unclosed write-tag detection accepts both namespaces;
   - generic `dyad-*` cleanup logic becomes namespace-agnostic.
3. Keep parser return types behaviorally stable for existing callers while adding canonical action information where needed.
4. Add focused tests for mixed transcripts containing both old and new tags.

Exit:

1. Old and new tag families both parse successfully.

### Phase 3. Normalize executor surfaces

Goal:

1. Ensure execution logic no longer branches on raw namespace strings.

Tasks:

1. Update `src/ipc/processors/response_processor.ts` to consume normalized parser output.
2. Verify add-dependency, rename, delete, write, execute-sql, and search-replace still behave identically.
3. Audit any auxiliary processors or handlers that still build literal `dyad-*` fixup strings and move them to the registry.
4. Keep all existing git/version side effects unchanged.

Exit:

1. Action execution is namespace-neutral.

### Phase 4. Normalize renderer and export surfaces

Goal:

1. Ensure transcripts and copied output work for both namespaces.

Tasks:

1. Update `src/components/chat/ActionMarkdownParser.tsx` to map both namespaces to the same render path.
2. Update `src/components/chat/types.d.ts` so JSX intrinsic elements support the new namespace aliases.
3. Update `src/hooks/useCopyToClipboard.ts` so copied content strips or converts both old and new tags correctly.
4. Verify hidden summary behavior still works for both `dyad-chat-summary` and its new alias.
5. Verify command-button rendering still works for both old and new command tags.

Exit:

1. The user cannot tell from UI behavior whether the stored message used old or new tags.

### Phase 5. Switch generation to the new namespace

Goal:

1. Make all new build-mode output emit `chm-*`.

Tasks:

1. Update build-mode instructions in `src/prompts/system_prompt.ts`.
2. Update upload instructions and XML recovery guidance in `src/ipc/chat_runtime/run_chat_stream_session.ts`.
3. Update the `Write the code in the correct format` remediation prompt in `src/components/chat/ChatInput.tsx`.
4. Update any hardcoded XML examples in prompt assets that are still part of live runtime selection.
5. Ensure new transcript-only wrappers emitted at runtime also use the new namespace where brand leakage matters.

Exit:

1. New messages use `chm-*` by default.

### Phase 6. Migrate tests, fixtures, and fake runtime surfaces

Goal:

1. Keep test coverage aligned with the new emitted namespace while preserving legacy compatibility coverage.

Tasks:

1. Parameterize parser/processor unit tests to run for:
   - old `dyad-*`
   - new `chm-*`
2. Update fake LLM outputs in `testing/fake-llm-server/chatCompletionHandler.ts`.
3. Update fixtures under `e2e-tests/fixtures/` to use the new emitted namespace where those fixtures represent current generation output.
4. Preserve at least one legacy fixture set so backward compatibility remains tested.
5. Update any snapshot tests or clipboard assertions that assume only `dyad-*`.

Exit:

1. Coverage proves both compatibility and the new canonical emitted format.

### Phase 7. Packaged regression verification

Goal:

1. Prove the migration did not damage the real packaged user path.

Tasks:

1. Rebuild the packaged desktop binary.
2. Import a known git-backed app through the normal UI flow.
3. Verify initial Version History still appears immediately.
4. Create external git commits in the imported app copy and verify:
   - no restart required;
   - opening the versions UI still shows the new versions.
5. Verify an AI-created file still increments Version History as expected.
6. Verify copied chat output does not expose raw old or new tags.

Exit:

1. Manual packaged smoke matches or exceeds the current baseline.

## 9. Requirement -> Task -> Test -> Gate

### Requirement 1. Historical chats must remain readable

- Task: dual-read parser and renderer support.
- Test: unit tests with stored `dyad-*` transcripts and mixed old/new transcripts.
- Gate: no historical transcript regression.

### Requirement 2. New generation must stop leaking `Dyad` in action tags

- Task: build-mode prompt and runtime emission switch to `chm-*`.
- Test: generated assistant output and fake LLM fixtures use new namespace.
- Gate: no newly generated `dyad-*` tags in the default build path.

### Requirement 3. Execution semantics must remain identical

- Task: normalize both namespaces into one action model before business logic.
- Test: write, rename, delete, add-dependency, execute-sql, and search-replace unit coverage for both namespaces.
- Gate: no executor behavior drift.

### Requirement 4. Renderer and copy behavior must remain stable

- Task: renderer and clipboard support for both namespaces.
- Test: copy-chat regression checks and parser rendering tests.
- Gate: no raw-tag leakage or hidden-summary breakage.

### Requirement 5. Packaged legacy XML path must stay release-safe

- Task: rerun packaged manual smoke after the namespace switch.
- Test: packaged `.exe` import, external commits, and AI-created file versioning smoke.
- Gate: no release-line regression.

## 10. Acceptance and Tests

- Required unit coverage:
  - registry tests
  - alias-aware parser tests
  - response processor tests
  - copy/export tests
  - helper tests for unclosed tags and generic cleanup
- Required integration coverage:
  - fake LLM responses using `chm-*`
  - at least one backward-compatibility transcript using `dyad-*`
- Required manual coverage:
  - packaged `.exe` smoke on normal UI path
  - Version History check with external git commits
  - one AI-created file check to confirm end-to-end version write still lands
- This spec is accepted when:
  - all emitted default build-mode tags use the new namespace;
  - old `dyad-*` transcripts still parse, render, and execute;
  - packaged smoke remains green on the legacy XML lane.

## 11. Promotion Artifacts

- runtime verification note update for packaged smoke after migration
- parser/renderer migration note if hard-cut removal is proposed later
- any release note that mentions removal of visible `Dyad` protocol leakage from build-mode assistant output

## 12. Risks and Rollback

- Risks:
  - silent breakage of historical chat transcripts;
  - stale literal `dyad-*` strings left in recovery prompts;
  - clipboard/export regressions because the renderer was updated but sanitizer paths were not;
  - fake test lanes passing while packaged legacy XML behavior regresses.
- Rollback:
  - keep dual-read support in place from the first migration commit onward;
  - if new emission regresses, flip emission back to old tags while keeping compatibility infrastructure;
  - do not remove legacy alias support in the same series as the namespace switch.

## 13. Agent Guardrails

- Do not implement this as a one-shot grep rename.
- Do not remove `dyad-*` read support in the same task that introduces `chm-*` write support.
- Do not expand this task into a structured-agent migration.
- Do not rewrite the packaged manual smoke result to fit the test; keep the packaged behavior as the real acceptance signal.
- Do not treat historical transcript migration as a prerequisite for landing the compatibility layer.

## Evidence

- path: `../../src/prompts/system_prompt.ts`
  symbol: `Build-mode prompt still mandates dyad-write output and getSystemPromptForChatMode still selects that prompt`
  lines: 94-106, 331-339, 557-568
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Runtime still injects dyad-write examples for uploads and uses constructSystemPrompt for build mode`
  lines: 554-568, 638-653, 1156-1222
- path: `../../src/ipc/utils/xml_tag_parser.ts`
  symbol: `Parser currently hardcodes dyad-write and sibling regexes`
  lines: 13-45, 48-132
- path: `../../src/ipc/processors/response_processor.ts`
  symbol: `Full-response action processor consumes dyad-tag parser output as execution truth`
  lines: 97-160
- path: `../../src/ipc/chat_runtime/helpers.ts`
  symbol: `Unclosed-tag and generic dyad-tag cleanup helpers still assume dyad namespace`
  lines: 72-104, 193-193
- path: `../../src/components/chat/ActionMarkdownParser.tsx`
  symbol: `Renderer maps raw dyad tag names directly to UI action components`
  lines: 46-77, 433-645, 738-738
- path: `../../src/components/chat/types.d.ts`
  symbol: `JSX intrinsic elements currently typed only for dyad tag names`
  lines: 7-24
- path: `../../src/hooks/useCopyToClipboard.ts`
  symbol: `Clipboard conversion recognizes dyad namespaces directly`
  lines: 5-17, 87-187
- path: `../../src/components/chat/ChatInput.tsx`
  symbol: `User-facing remediation prompt still asks the model to use dyad-write tags`
  lines: 825-825
- path: `../../testing/fake-llm-server/chatCompletionHandler.ts`
  symbol: `Fake LLM server fixtures still emit dyad-write responses`
  lines: 96-252, 339-339
- path: `../../docs-new/05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md`
  symbol: `Canonical audit states that dyad XML is still the live build action language`
  lines: 38-64
- path: `../../docs-new/07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md`
  symbol: `Current UI inventory still classifies dyad-write-era surfaces as XML delete candidates rather than already migrated`
  lines: 152-154

## Links

- [[../spec-template.md]]
- [[2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[../../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
- [[../../07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md]]
