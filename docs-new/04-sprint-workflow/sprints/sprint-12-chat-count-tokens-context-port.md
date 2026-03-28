---
id: chaemera-sprint-12-chat-count-tokens-context-port
title: Sprint 12 - Chat Count Tokens and Context Accounting
type: sprint
status: planned
tags: [sprint, token-count, chat, context, migration]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [
      ../../05-discussion-templates/discussions/2026-03-01-help-bot-oss-equivalent-issue.md,
    ],
  ]
depends_on: [[sprint-11-final-cutover-and-electron-cleanup.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 12 - Chat Count Tokens and Context Accounting

## Goal

1. Split `chat:count-tokens` out into its own dedicated migration sprint instead of hiding it inside a generic runtime wave.
2. Rebuild the token-count path on the target stack with enough fidelity that the workspace can reason about context pressure correctly.

## Why This Is Its Own Sprint

1. `chat:count-tokens` is not a small utility.
2. The current handler pulls together:
   - chat history,
   - input text,
   - system prompt assembly,
   - theme prompt lookup,
   - `AI_RULES`,
   - Supabase context,
   - codebase extraction,
   - mentioned-app context,
   - model context-window logic.
3. Treating it like a small bridge would create a half-migrated context pipeline that is harder to debug than a dedicated sprint.

## High-Level Outcome

1. The target stack has a single explicit context-accounting pipeline for chat requests.
2. Token counting becomes a first-class workspace capability rather than an incidental side effect of scattered helpers.
3. The UI gets consistent section-level numbers for:
   - message history,
   - input,
   - system prompt,
   - codebase context,
   - mentioned apps,
   - total estimated tokens,
   - model context window.

## High-Level Implementation Direction

1. Freeze the current Electron semantics as the migration baseline.
2. Extract or mirror the current context assembly into clearly named stages.
3. Decide which stages stay shared/TypeScript-driven and which, if any, move to Tauri-side orchestration.
4. Avoid splitting token estimation logic across multiple partial runtimes without a deliberate contract.

## Ordered Workstreams

1. Baseline the current token-count behavior and section breakdown.
2. Isolate dependencies:
   - prompt construction,
   - theme prompt resolution,
   - rules loading,
   - provider/project context,
   - codebase extraction,
   - mentioned-app extraction,
   - tokenizer/context-window helpers.
3. Define an explicit context-accounting contract:
   - inputs,
   - section breakdown,
   - error behavior,
   - caching/invalidations,
   - sync points with the selected model/provider.
4. Implement the target-stack pipeline.
5. Add migration-safe tests for:
   - empty/minimal chats,
   - large codebase contexts,
   - mentioned apps,
   - provider/model switches,
   - `AI_RULES` changes,
   - context-window edge cases.

## Mechanism Notes for More Accurate Token Counting

1. Keep two concepts separate:
   - fast UX estimate,
   - provider-accurate or tokenizer-accurate count.
2. A practical model is:
   - `Tier 1`: fast heuristic estimate for immediate UI feedback,
   - `Tier 2`: provider/model-specific recount when a reliable tokenizer is available.
3. The pipeline should return section-level attribution, not only one total number.
4. The system should cache stable sections:
   - unchanged message history,
   - unchanged codebase snapshots,
   - unchanged mentioned-app expansions,
     so that recounts do not rescan everything every time.
5. Model context-window resolution should be explicit and versioned by provider/model identity, not inferred ad hoc.
6. If exact tokenization is unavailable for a provider, the fallback should be clearly labeled as estimated rather than pretending to be exact.

## Non-Goals

1. This sprint is not about chat streaming itself.
2. This sprint is not about provider auth.
3. This sprint is not about redesigning the chat UI.
4. This sprint is not about changing the meaning of prompt-building inputs without an explicit product decision.

## Acceptance Snapshot

1. `chat:count-tokens` runs on the target architecture with the same conceptual inputs as the Electron baseline.
2. Section-level counts are visible and stable.
3. Model context-window reporting is correct for supported providers.
4. The path has dedicated tests, not just incidental coverage through chat runtime tests.

## Evidence

- path: `src/ipc/types/chat.ts`
  symbol: `countTokens contract`
  lines: 232-236
- path: `src/hooks/useCountTokens.ts`
  symbol: `useCountTokens`
  lines: 1-120
- path: `src/ipc/handlers/token_count_handlers.ts`
  symbol: `registerTokenCountHandlers`
  lines: 30-160
- path: `src/prompts/system_prompt.ts`
  symbol: `constructSystemPrompt and readAiRules`
  lines: 1-220
- path: `src/utils/codebase.ts`
  symbol: `extractCodebase`
  lines: 1-360
- path: `src/ipc/utils/mention_apps.ts`
  symbol: `extractMentionedAppsCodebases`
  lines: 1-220
- path: `src/ipc/utils/token_utils.ts`
  symbol: `estimateTokens and getContextWindow`
  lines: 1-220

## Links

- [[README.md]]
- [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../05-discussion-templates/discussions/2026-03-01-help-bot-oss-equivalent-issue.md]]
