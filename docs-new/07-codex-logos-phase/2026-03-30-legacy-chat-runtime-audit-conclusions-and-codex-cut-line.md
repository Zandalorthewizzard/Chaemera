---
id: chaemera-spec-legacy-chat-runtime-audit-conclusions-and-codex-cut-line-2026-03-30
title: Legacy Chat Runtime Audit Conclusions and Codex Cut Line
type: spec
status: active
tags: [spec, audit, legacy, codex, logos, tauri, conclusions]
related:
  [
    [README.md],
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md],
    [2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
  ]
generated: false
source_of_truth: code-audit
outline: []
---

# Legacy Chat Runtime Audit Conclusions and Codex Cut Line

1. Start Here

- This document records the first completed audit pass over the current legacy chat runtime after the real Tauri worker-path investigation.
- It exists to answer three now-concrete questions:
  - what is actually live and working on the current branch,
  - what still remains defective or incomplete,
  - and where the cut line should be between legacy release work and the future Codex/Logos integration scope.

2. Intent + Non-goals

- Intent:
  - convert the audit from a framework into an evidence-backed conclusion set;
  - separate fixed cutover defects from remaining runtime debt;
  - define the practical Codex cut line after the audit.
- Non-goals:
  - no claim that legacy XML should remain the future default runtime;
  - no claim that the legacy worker bridge is the long-term architecture;
  - no claim that all dormant legacy scope must be rescued.

3. Audit Verdict

- The current branch is no longer dominated by fatal Electron -> Tauri transport failure.
- The major cutover defects were real, but they are now localized and substantially repaired.
- The current branch has live proof for the core legacy build-mode path.
- The remaining issues are narrower:
  - terminal-state semantics,
  - cancellation coherence,
  - incomplete metadata,
  - worker-adapter omissions,
  - and XML-era debt.
- The correct conclusion is therefore:
  - the legacy runtime is viable as a release-line compatibility mode,
  - but it is still the wrong foundation for the future mainline architecture.

4. Confirmed Fixed Cutover Defects

The audit confirmed and repaired these Tauri cutover faults:

1. worker stdout protocol contamination
2. Rust/worker field-name mismatch
3. sqlite path divergence between Rust host and TypeScript worker
4. invalid `chat:response:end` payload shape because optional fields were emitted as `null`
5. direct `app-details` route not synchronizing selected app state
6. runtime harness apps-dir environment mismatch

These were genuine migration defects, not just flaky tests.

5. Live-Proven Current-Branch Paths

### 5.1. Home composer build-mode path

Live-proven:

- app creation
- route into chat
- worker-backed stream startup
- prompt persistence
- chunk delivery
- valid end event
- assistant copy affordance after completion

### 5.2. Direct `app-details -> Open in Chat` path

Live-proven:

- direct route entry to `/app-details?appId=...`
- selected-app synchronization from the route
- transition into the chat route
- real worker-backed stream completion on that path

### 5.3. Import core path for apps that already contain `AI_RULES.md`

Live-proven:

- import core path itself
- imported app landing on app-details
- imported files in isolated profile roots
- no false AI-rules autogeneration prompt when the rules file already exists

### 5.4. Copy-message behavior after streamed output

Live-proven:

- imported app can continue into chat
- streamed assistant response completes
- copied message content omits raw dyad tags while preserving the intended visible result

6. Filled First-Pass Capability Verdicts

| Capability                            | Current Branch          | Conclusion                                                                 |
| ------------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `Packaged Tauri entrypoint`           | `works`                 | real desktop runtime lane is alive                                         |
| `User and assistant persistence`      | `partial`               | success path is live; cancel-state coherence still incomplete              |
| `Redo semantics`                      | `works`                 | runtime behavior is present and code-localized                             |
| `Prompt, settings, and model resolve` | `partial`               | live, but host environment ownership is still incomplete                   |
| `Codebase extraction`                 | `works`                 | still active in the worker path                                            |
| `Attachments and selected context`    | `partial`               | prep path is real; final packaged manual proof still recommended           |
| `Provider invocation and streaming`   | `partial`               | build-mode stream is live; other branches depend on unwired hooks          |
| `End and error semantics`             | `partial`               | real host bug remains because one run can still hit `error` and `end`      |
| `XML cleanup`                         | `partial`               | still real legacy behavior, but explicitly future-drop debt                |
| `Repair, continuation, and auto-fix`  | `partial`               | real legacy loops exist; not fully live-proven beyond build-mode core      |
| `Completion metadata`                 | `partial`               | some metadata is real; `totalTokens` and `contextWindow` remain incomplete |
| `Cancellation-aware behavior`         | `partial`               | abort propagates; final transcript semantics still need hardening          |
| `MCP consent and tool hooks`          | `partial`               | consent transport exists; MCP execution branch is adapter-blocked          |
| `Local-agent hook points`             | `by-design-unavailable` | dormant or intentionally unavailable; not a generic runtime break          |

7. Residual Defect List

### 7.1. Host/worker environment contract is still incomplete

- `appPath` and `settingsSnapshot` exist in the protocol but are not yet authoritative.

### 7.2. Rust host still has a double-terminal defect on error

- worker `error` can still trigger both `chat:response:error` and `chat:response:end`.

### 7.3. Completion metadata is only partially real

- `updatedFiles`, `extraFiles`, and `chatSummary` are real;
- `totalTokens` and `contextWindow` are still incomplete on the public end-event contract.

### 7.4. Cancellation outcome semantics still need tightening

- abort is wired, but final persisted state and emitted outcome are not yet clean enough to count as fully solved.

### 7.5. MCP execution remains blocked by a worker-adapter omission

- consent transport exists,
- but the worker path does not provide `getMcpTools`, so the live execution branch is still unreachable there.

### 7.6. XML-era cleanup and repair remain legacy-only debt

- still important for release-line compatibility,
- but not a future architecture obligation.

8. What Is Not A Core Runtime Failure Anymore

1. `Import App -> Select Folder` behavior under Tauri WebDriver is currently best classified as host-shell or dialog automation debt, not proof that import core is broken.
1. The old runtime specs waiting for `/chat` directly after import were stale harness assumptions because imported apps now land on `/app-details`.
1. Local-agent, ask, and plan-mode scaffolding on the current worker path should not be counted as generic chat-runtime corruption.

1. Codex Cut Line

### 9.1. Keep in Chaemera host/UI

- desktop shell and routing
- app selection and `app-details`
- import host behavior
- preview, console, and version shells
- consent UI and transcript shell
- settings and app-aware host surfaces

### 9.2. Replace with Codex/Logos runtime truth

- prompt assembly
- provider invocation and stream semantics
- transcript persistence semantics
- codebase and attachment context preparation
- redo runtime behavior
- completion metadata production
- cancellation outcome semantics
- tool-runtime semantics that survive into the new mainline

### 9.3. Keep only as legacy-release debt

- worker bridge hardening
- session supervision fixes
- terminal event normalization
- XML cleanup and continuation only inside the legacy mode

### 9.4. Drop from future default-path scope

- XML parser and XML tag cleanup as the default integration contract
- XML-only remediation affordances
- XML repair UX as a future mainline product assumption

10. Manual Verification Bucket For Final Packaged Pass

These items still benefit from a final live user walkthrough on a fresh packaged build:

1. visible model/rules/settings sensitivity
2. text attachment plus image attachment plus selected component context
3. cancel during an active stream and observe final transcript outcome
4. redo on a richer, already-mutated transcript
5. file-targeted prompt that proves codebase extraction materially helps
6. native dialog shell flows, especially `Import App -> Select Folder`

7. Acceptance and Tests

- This document is accepted when:
  - the audit verdict is explicit,
  - live-proven paths are named,
  - residual defects are listed,
  - and the Codex cut line is explicit enough to guide future specs.

12. Risks and Rollback

- Risks:
  - overstating current legacy runtime health and ignoring the remaining semantic defects;
  - understating current legacy runtime health and needlessly rewriting working release-line behavior;
  - letting XML-era compatibility debt expand future mainline scope.
- Rollback:
  - keep this conclusions document tied to code-audit evidence;
  - update it only when new live proof materially changes a row classification;
  - keep future daemon planning documents separate from legacy repair notes.

## Evidence

- path: `../../src-tauri/src/chat_worker_host.rs`
  symbol: `Rust host session management, worker spawn, cancel routing, consent routing, and residual double-terminal error path`
  lines: 348-409, 490-701
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `Legacy runtime brain covering persistence, prompt assembly, build-mode branch, repair loops, cancellation, and completion metadata`
  lines: 213-541, 802-1451
- path: `../../src/ipc/chat_runtime/worker_session_manager.ts`
  symbol: `Worker-side session lifecycle and explicit TODO about host-provided runtime environment`
  lines: 31-104, 106-194
- path: `../../src/hooks/useStreamChat.ts`
  symbol: `Renderer stream completion, error, metadata, and cancellation-adjacent behavior`
  lines: 164-291
- path: `../../testing/tauri-webdriver/specs/home-chat-runtime.e2e.mjs`
  symbol: `Real Tauri runtime proof for home composer path`
  lines: 1-198
- path: `../../testing/tauri-webdriver/specs/chat-from-app-details.e2e.mjs`
  symbol: `Real Tauri runtime proof for app-details open-in-chat path`
  lines: 1-200
- path: `../../testing/tauri-webdriver/specs/import-with-ai-rules.e2e.mjs`
  symbol: `Real Tauri runtime proof for import core path with existing AI_RULES`
  lines: 1-160
- path: `../../testing/tauri-webdriver/specs/copy-chat.e2e.mjs`
  symbol: `Real Tauri runtime proof for copy-message behavior after imported-app chat flow`
  lines: 1-210
- path: `2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
  symbol: `Canonical audit framework and capability rows`
  lines: 38-199
- path: `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
  symbol: `Canonical inventory of what the legacy runtime actually owns`
  lines: 37-179, 217-237
- path: `../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
  symbol: `Transitional verdict that the runtime bridge is valid for release-line work but not a final architecture`
  lines: 71-117, 154-194

## Links

- [[README.md]]
- [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
- [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
- [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
- [[2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md]]
- [[../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
- [[../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md]]
