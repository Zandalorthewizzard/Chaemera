---
id: chaemera-discussion-current-ai-runtime-state-2026-03-28
title: Current AI Runtime State
type: discussion
status: active
tags: [discussion, ai, runtime, agent, oss]
related:
  [
    [../discussion-template.md],
    [../README.md],
    [../../02-guides/agent-navigation.md],
    [../../02-guides/integrations-reference.md],
    [
      ../../04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md,
    ],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: code-audit
outline: []
---

# Current AI Runtime State

1. Context

- This document captures the current AI and agent runtime state as implemented in code.
- The goal is to distinguish what is actually live from what is only scaffolded in prompts, UI, or contracts.
- This is a working discussion artifact for later decision-making, not a final architecture spec.

2. What Is Live Today

- The active production AI execution path is `build` mode.
- `build` mode constructs a system prompt, streams model output, parses tagged responses, and applies file or project actions in the main process.
- The live response-processing path handles file edits, renames, deletions, dependency installs, Supabase SQL execution, and post-processing updates.
- Chat summaries are extracted from `<dyad-chat-summary>` tags and used to update chat titles and stored message content.

3. What Is Scaffolded But Not Running In OSS

- `ask`, `plan`, and `local-agent` are routed through the local-agent handler path.
- In the current OSS code, that handler immediately returns that the mode is temporarily unavailable in OSS and tells the user to switch to Build mode.
- The local-agent prompt already describes a richer tool-based agent with read/search/list/planning behavior, but the runtime does not currently execute that loop in OSS.
- Tool consent UI and IPC state exist for agent tools, but the actual tool executor is not wired up.

4. Special-Case AI Paths

- `/security-review` switches the prompt to a dedicated security review flow and persists findings through dedicated security handlers.
- Summary requests use a dedicated summarization prompt that requires exactly one `<dyad-chat-summary>` tag.
- Plan mode has its own prompt and plan persistence layer, but the implementation still depends on the local-agent routing path rather than a separate live agent runtime.
- MCP is present as a separate tool-extension layer and can participate in build-mode flows when enabled, but it is not the same thing as the local-agent runtime.

5. Practical Interpretation

- The codebase currently behaves like a hybrid system.
- The real runtime center is tagged-response build automation.
- The agent-v2 surface exists mostly as contract, prompt, and UI scaffolding.
- The current product decision point is therefore not "how to tune an existing autonomous agent", but "whether to keep the scaffold, remove it, or implement the missing runtime".

6. Unknown / Deferred

- Whether the local-agent runtime should be implemented in full, simplified, or removed remains undecided.
- Whether the current tag-based build path should remain the primary AI execution model long term remains a product question.
- Exact ownership of future planning, todos, and consent flows is not resolved by the current code alone.

## Evidence

- path: `../../src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `mode routing, special intents, and local-agent dispatch`
  lines: 705-760, 1081-1218, 1575-1606
- path: `../../src/ipc/handlers/local_agent/local_agent_handler.ts`
  symbol: `HandleLocalAgentStream and OSS unavailability`
  lines: 1-40
- path: `../../src/prompts/local_agent_prompt.ts`
  symbol: `Local agent prompt contract`
  lines: 52-272
- path: `../../src/ipc/handlers/local_agent/tool_definitions.ts`
  symbol: `Declared agent tools and empty runtime set`
  lines: 1-31
- path: `../../src/ipc/handlers/local_agent/agent_tool_handlers.ts`
  symbol: `Agent tool consent IPC`
  lines: 1-30
- path: `../../src/ipc/types/agent.ts`
  symbol: `Agent contracts and events`
  lines: 17-212
- path: `../../src/components/chat/DyadMarkdownParser.tsx`
  symbol: `Tagged response rendering`
  lines: 1-80, 349-754
- path: `../../src/ipc/processors/response_processor.ts`
  symbol: `Tagged response application`
  lines: 97-120, 168-230, 584-630
- path: `../../src/prompts/system_prompt.ts`
  symbol: `System prompt assembly and chat-mode dispatch`
  lines: 510-571
- path: `../../src/prompts/plan_mode_prompt.ts`
  symbol: `Plan mode contract`
  lines: 1-140
- path: `../../src/prompts/summarize_chat_system_prompt.ts`
  symbol: `Chat summary contract`
  lines: 1-41
- path: `../../src/prompts/security_review_prompt.ts`
  symbol: `Security review contract`
  lines: 1-46

## Links

- [[../discussion-template.md]]
- [[../README.md]]
- [[../../02-guides/agent-navigation.md]]
- [[../../02-guides/integrations-reference.md]]
- [[../../04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md]]
