---
id: chaemera-discussion-codex-like-agent-core-reference-and-transfer-plan-2026-03-28
title: Codex-Like Agent Core Reference and Transfer Plan
type: discussion
status: active
tags: [discussion, ai, agent, codex, rust, transfer, terminal]
related:
  [
    [../discussion-template.md],
    [../README.md],
    [2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md],
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

# Codex-Like Agent Core Reference and Transfer Plan

1. Context

- Codex is a useful reference not because Chaemera should clone its brand or UI, but because the OSS Rust implementation exposes a mature structured-tool agent runtime.
- The transfer target should be the Codex capability envelope:
  - structured model-visible tools,
  - explicit tool routing,
  - a central approval and sandbox orchestrator,
  - first-class shell and patch runtimes,
  - prompt layering for repo instructions and skills,
  - and optional hierarchical agents.
- External product input from this discussion also matters:
  - the user reports strong long-term editing reliability with Codex,
  - there is perceived community demand for real console support in Dyad,
  - and there is a related side project (`Logos`) that may later benefit from the same architectural direction.
- Those product inputs are relevant, but the code-backed transfer plan below is grounded in the audited implementations.

2. Codex Capability Envelope To Use As Reference

2.1. Structured tool registry and model-visible specs

- `ToolRouter::from_config()` builds a registry plus the exact set of model-visible tool specs from configured tools, MCP tools, app tools, discoverable tools, and dynamic tools.
- `build_prompt()` then sends the model the visible tool set plus the model capability flag for `parallel_tool_calls`.
- This is materially different from the current Chaemera XML build flow: the model sees callable tool contracts rather than an XML response language.

  2.2. Tool dispatch and parallelism

- `ToolCallRuntime` routes each tool call through the router and uses a shared lock to allow parallel execution only for tools whose spec explicitly supports it.
- Parallelism is therefore not an accident of the prompt. It is a runtime property attached to specific tools and enforced by dispatch.

  2.3. Central approval and sandbox orchestration

- `ToolOrchestrator` is the key portability target.
- Its runtime sequence is explicit: approval, sandbox selection, first attempt, then escalated retry on sandbox denial when policy allows it.
- This separates agent reasoning from execution policy and keeps sandbox/escalation behavior in one place instead of scattering it across individual tools.

  2.4. Shell and patch as first-class runtimes

- Codex shell execution is a structured request with explicit `command`, `cwd`, `timeout_ms`, environment handling, `sandbox_permissions`, optional additional permissions, and human-facing `justification`.
- `apply_patch` is also a dedicated runtime with its own approval path, file-based approval keys, minimal execution environment, and explicit orchestration contract.
- This is the right shape for Chaemera if the goal is reliable iterative editing and console-backed verification rather than free-form XML execution.

  2.5. Agent hierarchy

- Codex has real subagent control with `spawn_agent`, message delivery, wait, close, and rollout-forking support in `AgentControl`.
- The tool descriptions also constrain when delegation is allowed, how to scope subtasks, and how to avoid misuse of parallel subagents.
- This is qualitatively different from the current dormant local-agent scaffold in Chaemera.

  2.6. Prompt and instruction layering

- Codex loads project instructions through hierarchical `AGENTS.md` discovery from project root to current working directory.
- It merges those instructions with configured user instructions and feature-specific additions such as JS REPL or child-agent guidance.
- The turn context then builds developer and contextual-user layers containing:
  - execution policy instructions,
  - collaboration-mode instructions,
  - skills,
  - plugins,
  - user instructions,
  - environment context,
  - and visible subagents.
- This prompt assembly model is important to transfer because a structured runtime still fails if instructions and environment context are weak or unordered.

3. Chaemera Constraints That Must Shape The Transfer

3.1. Workspace and environment model

- Chaemera is not currently a generic arbitrary-`cwd` coding shell.
- The product has an app-centric workspace model built around `getDyadAppPath()` and the `dyad-apps` root, while import flow can optionally skip copying and keep an absolute path.
- This means the transferred agent core should not treat execution as "run anywhere by default".
- It should introduce an explicit workspace/app environment layer that understands:
  - app root,
  - imported absolute roots,
  - writable boundaries,
  - and project-specific runtime metadata.

  3.2. Terminal and console gap

- The current `shell_handler.ts` only opens external URLs and shows items in folders.
- The current preview `Console.tsx` and `PreviewPanel.tsx` are app-log viewers attached to the preview/runtime panel, not a general coding terminal.
- This is an important product opportunity:
  - a Codex-like structured agent core naturally wants shell and patch runtimes,
  - and the same work can satisfy the long-standing demand for real terminal support.

  3.3. Current AI runtime gap

- `ask`, `plan`, and `local-agent` are already routed away from the live XML build path, but OSS currently stubs them.
- That gap should be treated as an insertion point for the new structured core rather than as a reason to extend XML further.

4. What To Transfer Closely

- Tool registry plus model-visible tool specs.
- Prompt builder that attaches tools and respects model parallel-call capability.
- Central tool orchestrator for approvals, sandbox policy, and escalation.
- Structured `shell_command`-style runtime with explicit working directory and approval metadata.
- Structured `apply_patch`-style runtime for deterministic file edits.
- Hierarchical project instructions via `AGENTS.md`-style discovery.
- Environment context injection so the model knows its workspace and available runtime state.

5. What Not To Transfer Literally

- Chaemera does not need to copy every Codex feature in the first implementation wave.
- The first transfer does not need:
  - web search,
  - image tools,
  - JS REPL,
  - full plugin parity,
  - or immediate multi-agent parity.
- Chaemera also should not inherit a purely generic CLI mental model. Its agent runtime must remain compatible with the product's app/workspace UX and lifecycle.

6. Proposed Transfer Plan

1. Introduce a workspace environment layer for Chaemera.

- Normalize app-root resolution, imported-root behavior, writable roots, and environment metadata before adding structured execution tools.

2. Add prompt and instruction layering.

- Support hierarchical project instructions, future skill-like extensions, and explicit environment context in the prompt.

3. Implement a structured tool registry and router.

- The model should see real tools, not XML response conventions.

4. Implement a central approval and sandbox orchestrator.

- Shell, patch, and future mutating tools should all pass through one policy boundary.

5. Ship the first core tool set.

- `list_files`
- `grep`
- `read_file`
- `shell_command`
- `apply_patch`

6. Add a real terminal surface to the product.

- Live command output, approval prompts, and runtime state should be visible in-product instead of hiding execution behind preview logs or post-hoc messages.

7. Route `ask`, `plan`, and `agent` to the new structured core.

- Keep XML build mode behind the expert wall as legacy behavior.

8. Add batch execution and optional legacy XML compatibility later.

- Bulk execution should be layered on top of the structured core, not the other way around.

9. Add hierarchical subagents only after the single-agent core is stable.

- Codex proves the shape is viable, but Chaemera does not need to start with the full delegation surface.

7. Adjacent Opportunities

- A real terminal can be delivered as part of the structured-agent transfer rather than as a separate side feature.
- If the resulting agent core is cleanly extracted in Rust, it may later inform `Logos`.
- That said, Chaemera's first implementation should be driven by Chaemera's own workspace and product constraints, not by speculative reuse.

8. Unknown / Deferred

- Whether the new core should live directly in the Tauri/Rust migration line or in a separately reusable Rust crate remains open.
- Whether Windows sandbox behavior should match Codex v1 closely or start with a simpler approval model remains open.
- Whether the first structured release should include subagents or stay single-agent only remains open.
- Whether Chaemera should support both `shell_command` and a longer-lived `unified_exec`-style terminal session in the first cut remains open.

## Evidence

- path: `../../../codex-main/codex-rs/core/src/tools/router.rs`
  symbol: `ToolRouter and model-visible specs`
  lines: 36-88, 108-119, 213-250
- path: `../../../codex-main/codex-rs/core/src/tools/parallel.rs`
  symbol: `ToolCallRuntime parallel gating`
  lines: 27-32, 55-80, 81-123, 173-179
- path: `../../../codex-main/codex-rs/core/src/tools/orchestrator.rs`
  symbol: `ToolOrchestrator approval and sandbox flow`
  lines: 1-8, 101-190, 211-340
- path: `../../../codex-main/codex-rs/core/src/tools/runtimes/shell.rs`
  symbol: `ShellRequest and ShellRuntime`
  lines: 45-59, 121-201, 204-264
- path: `../../../codex-main/codex-rs/core/src/tools/runtimes/apply_patch.rs`
  symbol: `ApplyPatchRuntime`
  lines: 1-6, 36-45, 130-204, 208-230
- path: `../../../codex-main/codex-rs/core/src/agent/control.rs`
  symbol: `AgentControl spawn, send, and close`
  lines: 112-292, 470-598
- path: `../../../codex-main/codex-rs/core/src/tools/spec.rs`
  symbol: `tool specs for shell_command and spawn_agent plus handler registration`
  lines: 935-1009, 1162-1255, 2440-2560, 2780-2855
- path: `../../../codex-main/codex-rs/core/src/codex.rs`
  symbol: `session setup, prompt build, and tool runtime assembly`
  lines: 526-617, 6310-6395
- path: `../../../codex-main/codex-rs/core/src/codex.rs`
  symbol: `developer and contextual user prompt layering`
  lines: 3462-3629
- path: `../../../codex-main/codex-rs/core/src/project_doc.rs`
  symbol: `hierarchical AGENTS.md discovery and merged user instructions`
  lines: 1-17, 77-119, 181-260
- path: `../../src/paths/paths.ts`
  symbol: `dyad-apps base directory and app path resolution`
  lines: 5-23
- path: `../../src/ipc/handlers/import_handlers.ts`
  symbol: `import flow and optional copy into dyad-apps`
  lines: 47-112
- path: `../../src/ipc/handlers/shell_handler.ts`
  symbol: `current shell IPC scope`
  lines: 9-34
- path: `../../src/components/preview_panel/Console.tsx`
  symbol: `preview log console`
  lines: 66-119, 151-175
- path: `../../src/components/preview_panel/PreviewPanel.tsx`
  symbol: `preview panel console placement`
  lines: 24-57, 59-69, 141-170
- path: `../../src/ipc/handlers/local_agent/local_agent_handler.ts`
  symbol: `current OSS local-agent stub`
  lines: 24-42

## Links

- [[../discussion-template.md]]
- [[../README.md]]
- [[2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md]]
- [[2026-03-28-structured-agent-core-with-legacy-xml-mode.md]]
- [[../../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md]]
