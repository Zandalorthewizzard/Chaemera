---
id: chaemera-discussion-structured-agent-core-with-legacy-xml-mode-2026-03-28
title: Structured Agent Core with Legacy XML Expert Mode
type: discussion
status: active
tags: [discussion, ai, agent, xml, architecture, context]
related:
  [
    [../discussion-template.md],
    [../README.md],
    [2026-03-28-current-ai-runtime-state.md],
    [../../02-guides/integrations-reference.md],
    [
      ../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md,
    ],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: discussion
outline: []
---

# Structured Agent Core with Legacy XML Expert Mode

1. Context

- The current AI runtime is split between a live XML-tagged build flow and a scaffolded but not currently live structured local-agent path.
- The current roadmap already locks a retrieval-first future direction and explicitly rejects the whole-codebase-in-context default as the long-term model.
- XML tagging has real strengths for high-fanout batch generation and cost-sensitive BYOK workflows.
- XML tagging is also a poor fit for discovery-heavy agent loops, precise edit reliability, and long-running structured orchestration.
- Product principles require both transparency and power-user-friendly escape hatches rather than one locked workflow for all users.

2. Problem

- If XML remains the primary execution architecture, the system keeps paying complexity to patch around format fragility and weak discovery semantics.
- If XML is removed entirely, Chaemera loses a class of workflows where a user intentionally wants a cheap single-shot or batch-style generation path.
- The current whole-repo-first context habit makes XML discovery especially risky and unpredictable if reused as the basis for a pseudo-agent loop.
- The architecture therefore needs to separate:
  - reasoning and discovery,
  - precise iterative editing,
  - high-fanout batch application,
  - legacy or expert user control over token cost.

3. Goals

- Make the default future agent runtime structured, retrieval-first, and tool-driven.
- Preserve an opt-in XML path for expert users who knowingly want its batching and cost profile.
- Prevent XML from remaining the primary substrate for discovery or orchestration.
- Keep the system transparent: the user should still be able to inspect what the AI is about to do.
- Keep the design power-user friendly rather than forcing one expensive or one simplistic mode onto every workflow.

4. Alternatives

1. Keep XML as the primary architecture and harden it further.

- Pro: preserves the current batch behavior and the Dyad-style user experience.
- Con: keeps discovery, verification, and repair logic attached to a fragile text-emitted action format.
- Con: pushes more engineering effort into compensating for XML weaknesses rather than improving the core agent model.

2. Remove XML entirely and use only structured tools.

- Pro: cleaner architecture for discovery, validation, tracing, and long-running loops.
- Pro: better fit for retrieval-first context control and precise edit workflows.
- Con: loses a class of high-fanout, cost-sensitive expert workflows where single-shot batch output is genuinely useful.

3. Structured agent core plus legacy XML expert mode, with batch execution as a separate layer. Selected for further design.

- Pro: puts discovery, reading, editing, and verification on the stronger structured-agent foundation.
- Pro: keeps XML available where it is genuinely strong rather than pretending it is a universal control plane.
- Pro: leaves room for a future batch executor that may reuse XML compatibility without making XML the reasoning language of the system.
- Con: requires maintaining two execution styles and very clear product boundaries between them.

5. Decision Direction

- The default future architecture should be a structured agent core.
- Discovery should use structured retrieval tools only:
  - file listing,
  - grep or text search,
  - targeted file reads,
  - semantic or symbol-aware discovery where available.
- XML should not be the primary discovery or orchestration substrate.
- XML should survive only as one or both of:
  - an expert-facing legacy mode,
  - a backend-compatible batch application format behind a structured tool boundary.

    5.1. Default runtime

- The default agent should reason in structured tools, not in free-form XML actions.
- The default context model should be retrieval-first, not whole-repo-first.
- The default edit path should favor precise per-file operations with explicit verification.

  5.2. Legacy XML expert mode

- XML can remain available for users who explicitly opt into its tradeoffs.
- This mode should be framed as advanced or expert behavior, not as the primary path the whole product is optimized around.
- Its value proposition is not "better agenting". Its value proposition is:
  - batch generation,
  - simple high-fanout rewrites,
  - transparent single-shot output,
  - deliberate token-cost control for BYOK users.

    5.3. Batch execution layer

- High-fanout operations should be modeled as a separate batch-application concern, not as proof that XML should stay the main control language.
- A future structured agent may call a batch executor when it has enough confidence that a bulk operation is appropriate.
- That executor may accept:
  - legacy XML,
  - an XML-compatible manifest,
  - or a new explicit batch schema.
- The important boundary is that the agent core does not need to "think in XML" in order to benefit from bulk application.

  5.4. Validation boundary

- Bulk application should pass through orchestrator-side validation before hitting the live workspace.
- Validation should check:
  - path safety,
  - duplicate operations,
  - conflicting writes,
  - malformed payloads,
  - and optional dry-run or syntax checks where practical.
- This is especially important if a future orchestrator delegates batch generation to a side worker or parallel flow.

  5.5. Product positioning

- The common path should be the structured agent.
- XML should be an advanced capability, not the main mental model of the product.
- This matches the product principles:
  - intuitive but power-user friendly,
  - transparent over magical,
  - backend-flexible rather than locked to one brittle interaction style.

6. Unknown / Deferred

- Whether the batch executor should preserve literal Dyad XML syntax or move to a new manifest format remains open.
- Whether legacy XML mode should write directly to the workspace or only via an approval and validation gate remains open.
- Whether multi-agent or sidecar batch generation is worth the complexity in the first implementation phase remains open.
- The migration path for existing Dyad-style users still needs explicit UX design:
  - naming,
  - settings placement,
  - warnings,
  - and compatibility expectations.

## Evidence

- path: `../../rules/product-principles.md`
  symbol: `Backend-Flexible, Intuitive But Power-User Friendly, Transparent Over Magical`
  lines: 1-80
- path: `2026-03-28-current-ai-runtime-state.md`
  symbol: `Current split between live XML build flow and scaffolded local-agent path`
  lines: 1-82
- path: `../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `retrieval-first future direction and rejection of whole-codebase-first default`
  lines: 30-34, 52-61, 139-174
- path: `../../../docs/architecture.md`
  symbol: `XML rationale and cost argument against more agentic loops`
  lines: 15-19, 25-34, 36-42, 52-52
- path: `../../../docs/agent_architecture.md`
  symbol: `shift toward standard tool calling and local-agent loop direction`
  lines: 1-14

## Links

- [[../discussion-template.md]]
- [[../README.md]]
- [[2026-03-28-current-ai-runtime-state.md]]
- [[../../02-guides/integrations-reference.md]]
- [[../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md]]
