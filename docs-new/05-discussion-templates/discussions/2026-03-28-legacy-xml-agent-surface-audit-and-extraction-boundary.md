---
id: chaemera-discussion-legacy-xml-agent-surface-audit-and-extraction-boundary-2026-03-28
title: Legacy XML Agent Surface Audit and Extraction Boundary
type: discussion
status: historical
tags: [discussion, ai, xml, legacy, extraction, runtime]
related:
  [
    [../discussion-template.md],
    [../README.md],
    [2026-03-28-current-ai-runtime-state.md],
    [2026-03-28-structured-agent-core-with-legacy-xml-mode.md],
    [
      ../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md,
    ],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: code-audit
outline: []
---

# Legacy XML Agent Surface Audit and Extraction Boundary

1. Context

- Historical notice:
  - this document records the pre-cut-line XML surface audit that informed later dual-runtime and release-line decisions;
  - keep it as extraction-boundary context, not as the current active planning document.
- Chaemera needs a precise map of the current legacy XML-centered AI runtime before replacing the default agent path.
- The goal of this document is not to redesign the future structured agent. The goal is to localize the XML surface so it can be isolated behind an expert wall and removed from the default runtime without guesswork.
- This document therefore distinguishes:
  - where XML is part of the live runtime contract,
  - where XML-specific recovery logic exists,
  - and what boundary should remain if XML is preserved only as legacy or batch behavior.

2. Legacy XML Surface Map

2.1. Prompt contract

- The live build prompt explicitly tells the model to emit `<dyad-write>`, `<dyad-rename>`, `<dyad-delete>`, `<dyad-add-dependency>`, and `<dyad-chat-summary>` tags.
- The older architectural documentation describes the same model: prompt the LLM in XML-like tags, stream the tags to the UI, then process them after generation finishes.
- This means XML is not just a renderer detail. It is the current action language of the live build runtime.

  2.2. Execution engine

- `processFullResponseActions()` receives one `fullResponse` string, extracts all supported `dyad-*` tags from that single response, resolves the app workspace through `getDyadAppPath()`, and then applies the resulting filesystem or dependency actions.
- The current build runtime therefore batches many requested actions inside one model completion and executes them after parsing, rather than exposing those actions as first-class structured tool calls.

  2.3. XML-specific repair and recovery loops

- `chat_stream_handlers.ts` contains explicit retry logic for malformed or failing `dyad-search-replace` output.
- The same handler contains continuation logic for unclosed `<dyad-write>` tags.
- It also contains post-generation auto-fix loops that append structured problem reports back into the assistant response stream and ask the model to repair the result.
- These loops are important, but they are not a general-purpose agent runtime. They are compensating logic around a text-emitted XML action format.

  2.4. Boundary from the scaffolded local-agent path

- `ask`, `plan`, and `local-agent` already route to a different handler path than build mode.
- In OSS, that handler currently stops immediately and reports that the mode is temporarily unavailable.
- The current local-agent tool definitions are only a thin contract layer and return an empty tool set.
- This means the live legacy XML surface is concentrated in build mode and its supporting parser/executor flow, not in the dormant local-agent scaffold.

3. Extraction Boundary

3.1. Keep inside the legacy XML runtime

- XML prompt instructions and tag vocabulary.
- XML response rendering and tag-oriented assistant output display.
- XML tag parsing and action execution.
- XML-specific repair loops such as:
  - malformed search-replace recovery,
  - unclosed write continuation,
  - and XML-oriented auto-fix retries.

    3.2. Remove from the future default structured agent runtime

- Any requirement that the assistant emit `dyad-*` tags as its primary control language.
- Any generic response-processing path that assumes filesystem actions arrive embedded in assistant text.
- XML-specific recovery loops as a dependency of the normal agent path.
- The assumption that action batching must happen by parsing one large tagged response instead of through explicit runtime operations.

  3.3. Shared surfaces that should survive the extraction

- App and workspace resolution such as `getDyadAppPath()` and import/copy rules.
- Underlying filesystem mutation helpers, where they are reusable from a future structured executor.
- Approval and review concepts that can be reused independently of XML.
- Special-case AI flows should be evaluated one by one instead of assuming they belong either wholly to XML or wholly to the new structured core.

4. Suggested Isolation Sequence

1. Re-label the current live build flow internally as the legacy XML runtime rather than treating it as the general AI runtime.
1. Move XML prompt construction, tag parsing, and XML-specific recovery behavior behind an explicit runtime boundary.
1. Route future default `ask`, `plan`, and `agent` behavior to a structured tool-based runtime that does not import XML execution assumptions.
1. Keep XML available only through:
   - an expert-facing legacy mode,
   - or a future batch-execution compatibility layer.
1. Only after that separation, decide whether parts of the legacy XML stack should be deleted, retained as compatibility code, or rewritten as structured batch tools.

1. Consequences

- This localization makes it possible to replace the default runtime without breaking the old Dyad-style batched flow for expert users.
- It also prevents the future structured agent from inheriting XML-specific repair debt as part of its core orchestration model.
- The practical architectural target is not "delete XML immediately". The target is "stop letting XML define the default runtime contract".

6. Unknown / Deferred

- Whether `dyad-search-replace` should survive at all in legacy mode remains open.
- Whether chat-summary generation should stay XML-tagged in legacy mode or move to a structured side channel remains open.
- Whether the future structured runtime should reuse the current mutation helpers directly or wrap them behind a new execution service remains open.
- Whether the legacy XML runtime should continue to support auto-fix loops after it is hidden behind an expert wall remains open.

## Evidence

- path: `../../../docs/architecture.md`
  symbol: `Life of a request, XML rationale, and cost reasoning`
  lines: 15-21, 25-34, 36-42, 44-52
- path: `../../src/prompts/system_prompt.ts`
  symbol: `Live XML response contract`
  lines: 83-99
- path: `../../src/ipc/processors/response_processor.ts`
  symbol: `processFullResponseActions and dyad tag extraction`
  lines: 97-112, 146-166
- path: `../../src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `XML recovery loops and action application`
  lines: 1275-1372, 1375-1455, 1575-1604
- path: `../../src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `ask and plan mode routing to local-agent path`
  lines: 1081-1147
- path: `../../src/ipc/handlers/local_agent/local_agent_handler.ts`
  symbol: `OSS stubbed local-agent runtime`
  lines: 24-42
- path: `../../src/ipc/handlers/local_agent/tool_definitions.ts`
  symbol: `Declared tools and empty tool set`
  lines: 1-29

## Links

- [[../discussion-template.md]]
- [[../README.md]]
- [[2026-03-28-current-ai-runtime-state.md]]
- [[2026-03-28-structured-agent-core-with-legacy-xml-mode.md]]
- [[../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md]]
