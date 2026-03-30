---
id: chaemera-spec-legacy-chat-runtime-capability-audit-matrix-2026-03-29
title: Legacy Chat Runtime Capability Audit Matrix
type: spec
status: active
tags: [spec, audit, legacy, chat-runtime, matrix, codex, logos]
related:
  [
    [README.md],
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md,
    ],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Legacy Chat Runtime Capability Audit Matrix

1. Start Here

- This document is the canonical audit structure for the legacy chat-runtime execution slice.
- It exists to answer one narrow question before Codex daemon implementation starts:
  - what in the legacy runtime actually works,
  - what is broken or transport-blocked,
  - what is unproven,
  - and what should later be replaced, kept, or dropped in the new daemon lane.
- The audit is not a roadmap for making XML the future.
- The audit is a control document for avoiding two mistakes:
  - blindly continuing the legacy transport migration without a truth table,
  - or blindly claiming Codex replacement value without understanding the exact slice being replaced.
- OpenCode remains the external inspiration for daemon plus desktop topology.
- It is not the source of truth for this audit.

2. Scope Boundary

- The audit covers the legacy `chat:stream` execution slice and its supporting service-layer responsibilities.
- The audit does not re-audit host surfaces that are already separately known to work in the desktop shell:
  - preview,
  - app lifecycle,
  - app console,
  - import handling,
  - and desktop-native commands.
- The audit baseline is the known-good packaged Tauri executable:
  - `src-tauri/target/release/chaemera-tauri.exe`
- The audit compares:
  - old packaged baseline behavior,
  - current branch behavior,
  - and the likely `Codex Lane Disposition` of each capability.

3. Matrix Structure

| Column                   | Meaning                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `Capability`             | One concrete function or mechanic in the legacy chat-runtime slice                                                      |
| `Acceptance`             | What must be true for the capability to count as working                                                                |
| `Legacy Evidence`        | Which code or spec defines the capability as real scope                                                                 |
| `Old EXE Baseline`       | Status on the known-good packaged Tauri executable                                                                      |
| `Current Branch`         | Status on the current branch under audit                                                                                |
| `Failure Location`       | Primary break location: `renderer`, `tauri-host`, `node-transport`, `runtime-logic`, `provider`, `db`, `mcp`, `unknown` |
| `Proof Method`           | How the status was proved: `existing-test`, `new-e2e`, `manual-byok`, `fixture-provider`, `code-audit`                  |
| `Observed Symptom`       | Exact user-visible or trace-visible failure mode                                                                        |
| `Codex Lane Disposition` | `replace-with-codex-core`, `keep-chaemera-host`, `legacy-only`, `drop`, or `unknown`                                    |
| `Next Action`            | Immediate follow-up needed after the audit row is filled                                                                |

4. Status Vocabulary

- Use only these row statuses:
  - `works`
  - `partial`
  - `broken`
  - `blocked-by-transport`
  - `untested`
  - `unknown`
  - `by-design-unavailable`
- Do not use vague labels such as:
  - `mostly works`
  - `seems fine`
  - `probably broken`
  - `not sure`

5. Scenario Matrix

| Capability                            | Acceptance / Scenario to Prove                                                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Packaged Tauri entrypoint`           | From packaged or debug Tauri, send a real chat prompt and enter the real runtime path rather than a stub or immediate transport failure                           |
| `User and assistant persistence`      | Starting a run creates user message and assistant placeholder, finalizes assistant content on success, and leaves a consistent persisted state on error or cancel |
| `Redo semantics`                      | Retrying a user intent removes or reuses the correct prior user and assistant pair and does not silently duplicate transcript state                               |
| `Prompt, settings, and model resolve` | Selected model, temperature, and rules materially affect the provider request or deterministic fixture capture                                                    |
| `Codebase extraction`                 | Repository context is extracted and reaches the runtime prompt path for a known file-targeted query                                                               |
| `Attachments and selected context`    | Text attachment, image attachment, selected component, and codebase-upload paths each survive request preparation correctly                                       |
| `Provider invocation and streaming`   | A real provider call or fixture-backed equivalent streams chunks in order and produces one terminal outcome                                                       |
| `End and error semantics`             | There is never both terminal success and terminal error for one run; `wasCancelled` and cleanup behavior stay coherent                                            |
| `XML cleanup`                         | Broken or noisy XML-tagged output is cleaned enough that assistant-visible content is not polluted by raw internal tags                                           |
| `Repair, continuation, and auto-fix`  | Broken generation can trigger continuation or repair logic and either recover or fail explicitly with a correct terminal state                                    |
| `Completion metadata`                 | `updatedFiles`, `extraFiles`, `extraFilesError`, `totalTokens`, `contextWindow`, and `chatSummary` are populated consistently where expected                      |
| `Cancellation-aware behavior`         | Cancel during stream and cancel during repair loop both stop forward progress and preserve consistent persisted state                                             |
| `MCP consent and tool hooks`          | A consent request reaches UI, user decision returns, and downstream path resolves consistently                                                                    |
| `Local-agent hook points`             | Explicitly classify whether this is legacy debt, dormant scaffold, or intentionally unavailable rather than mixing it with chat-stream failure                    |

6. Execution Order

1. Fill `Legacy Evidence` for every row from code and canonical docs before running tests.
1. Freeze the baseline artifact identity:
   - record the exact packaged executable used for the audit,
   - record branch and commit under test,
   - and do not move the baseline definition mid-audit.
1. Run the scenario matrix manually against the old packaged Tauri executable first.
1. Run the same scenario matrix against the current branch second.
1. Where determinism matters, use a `fixture-provider` harness instead of relying only on live network variance.
1. Use manual BYOK runs only for final truth checks that genuinely require a real provider.
1. Populate `Codex Lane Disposition` for each capability only after the baseline and current statuses are known.
1. Only after the matrix is filled may the team decide:
   - continue legacy repair,
   - freeze legacy as release-line only,
   - replace capabilities through Codex core,
   - or deliberately drop a legacy behavior.

1. Execution Rules

- The audit owner must not silently rewrite capability definitions during testing.
- If a capability cannot be proved, mark it `untested` or `unknown`.
- If a capability fails because the current branch never reaches runtime code due to the Node worker shell, mark it `blocked-by-transport`.
- If a capability exists only in dormant OSS-disabled paths, mark it `by-design-unavailable` rather than `broken`.
- The audit must keep two questions separate:
  - is the legacy behavior live and correct today,
  - and do we still want that behavior in the Codex daemon lane.

8. Initial Row Set

The audit table must include at least these rows:

| Capability                            | Initial `Codex Lane Disposition` hypothesis |
| ------------------------------------- | ------------------------------------------- |
| `Packaged Tauri entrypoint`           | `legacy-only`                               |
| `User and assistant persistence`      | `replace-with-codex-core`                   |
| `Redo semantics`                      | `replace-with-codex-core`                   |
| `Prompt, settings, and model resolve` | `replace-with-codex-core`                   |
| `Codebase extraction`                 | `replace-with-codex-core`                   |
| `Attachments and selected context`    | `replace-with-codex-core`                   |
| `Provider invocation and streaming`   | `replace-with-codex-core`                   |
| `End and error semantics`             | `replace-with-codex-core`                   |
| `XML cleanup`                         | `drop`                                      |
| `Repair, continuation, and auto-fix`  | `unknown`                                   |
| `Completion metadata`                 | `replace-with-codex-core`                   |
| `Cancellation-aware behavior`         | `replace-with-codex-core`                   |
| `MCP consent and tool hooks`          | `replace-with-codex-core`                   |
| `Local-agent hook points`             | `unknown`                                   |

- The hypotheses above are not accepted verdicts.
- They are only a forced starting point so the matrix cannot remain vague.

9. Acceptance and Tests

- This audit document is accepted when:
  - the matrix structure is fixed,
  - scenario coverage is fixed,
  - execution order is fixed,
  - and future audit notes can fill rows without redefining the framework.
- The audit process is accepted only when at least one pass is recorded comparing:
  - old packaged baseline,
  - and current branch.

10. Promotion Artifacts

- Filled audit worksheet or follow-up evidence note for each completed audit pass.
- Future daemon planning docs may cite this matrix as the reason a capability is:
  - replaced,
  - preserved host-side,
  - or dropped.

11. Risks and Guardrails

- Risks:
  - confusing host-shell success with chat-runtime success;
  - over-focusing on transport failure and never classifying deeper runtime mechanics;
  - carrying XML cleanup debt into the new daemon lane by inertia;
  - declaring Codex replacement scope without row-by-row evidence.
- Guardrails:
  - keep the audit scoped to the legacy chat-runtime slice;
  - keep mainline daemon decisions separate from legacy repair execution;
  - treat OpenCode as topology inspiration, not audit truth;
  - do not let `unknown` rows be silently promoted into architecture assumptions.

## Evidence

- path: `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
  symbol: `Canonical legacy runtime capability inventory`
  lines: 1-220
- path: `../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
  symbol: `Release-line migration and transport context`
  lines: 1-220
- path: `../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
  symbol: `Legacy runtime line critique and transitional verdict`
  lines: 1-180
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Legacy runtime execution brain including persistence, prompt assembly, attachments, provider streaming, and XML cleanup`
  lines: 1-260
- path: `../../src/hooks/useStreamChat.ts`
  symbol: `Renderer stream orchestration, onChunk/onEnd/onError handling, queueing, and cancellation flow`
  lines: 1-220

## Links

- [[README.md]]
- [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
- [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md]]
- [[../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
- [[../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md]]
