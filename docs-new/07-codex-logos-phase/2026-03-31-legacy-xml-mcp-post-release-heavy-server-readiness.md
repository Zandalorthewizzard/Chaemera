---
id: chaemera-discussion-legacy-xml-mcp-post-release-heavy-server-readiness-2026-03-31
title: Legacy XML MCP Readiness for Heavy Servers Is Post-Release Validation, Not an MVP Blocker
type: discussion
status: active
tags: [mcp, legacy-xml, release, post-release, vercel, supabase]
related:
  [
    [README.md],
    [2026-03-30-release-line-mvp-roadmap.md],
    [../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Legacy XML MCP Readiness for Heavy Servers Is Post-Release Validation, Not an MVP Blocker

## 1. Start Here

1. This document answers a narrow release question: how ready is the current release-line `Legacy XML` runtime to use heavier `MCP` servers such as `Vercel` or `Supabase`.
2. The conclusion is not that `MCP` is blocked for MVP.
3. The conclusion is that the current release line has now proven basic `MCP` viability, but heavier external-state `MCP` workflows should be treated as a post-release validation bucket.

## 2. Intent + Non-goals

### Intent

1. Separate what is already proven from what is still only plausible.
2. Record the specific technical risks for large or stateful `MCP` servers under the current `Legacy XML` runtime.
3. Define a post-release test matrix so this does not remain hand-wavy.

### Non-goals

1. This is not a request to reopen the MVP scope.
2. This is not a claim that heavy-server `MCP` is currently broken.
3. This is not a design approval for a broad agent-runtime rewrite or a return to the removed cloud/paywalled agent mode.

## 3. Current Proven State

1. The release-line worker path now supports real `MCP` tool discovery, consent, execution, and rendered tool output on the Tauri runtime lane.
2. The default Tauri webdriver runtime suite now proves three important readiness states:

- no `MCP` configured;
- idle `MCP` server configured but not used;
- and one broken `stdio` server that fails softly instead of killing the base chat path.

3. Packaged Tauri build and packaged runtime smoke remain green for the current `MCP` slice.
4. This is enough to justify `MCP` as part of the MVP release line.

## 4. What Is Still Unproven

1. The current verification does not yet prove that large, high-context, multi-step `MCP` servers behave well inside the `Legacy XML` workflow.
2. It also does not yet prove that the runtime remains reliable when `MCP` results are:

- large;
- deeply nested;
- stateful across multiple tool calls;
- or semantically coupled to external systems that diverge from the local codebase snapshot.

3. This matters most for servers such as `Vercel MCP` and `Supabase MCP` because they can return rich operational context, not just tiny utility responses.

## 5. Practical Interpretation

1. The current runtime is mechanically compatible with `MCP`.
2. That does not automatically mean it is already robust for heavy operational `MCP` workflows.
3. The main concern is not raw XML parsing.
4. The main concern is the interaction between:

- host-driven tool calls,
- `Legacy XML` response structure,
- context window pressure,
- external-state drift,
- and multi-step orchestration.

## 6. Why This Is A Post-Release Bucket

1. The MVP roadmap only requires that `MCP` be real and release-supported on the release lane, not that every rich server and orchestration pattern be proven upfront.
2. The currently proven slice already meets that bar:

- tools are reachable;
- consent is real;
- execution is real;
- lifecycle truth is preserved on the tested lane;
- and degraded config has a verified soft-failure path.

3. Heavy-server validation is therefore a quality and expansion bucket, not a release gate.

## 7. Risk Areas For Heavy MCP Servers

### 7.1 Context volume risk

1. `Vercel` and `Supabase` style servers can return large JSON payloads, listings, logs, schema details, deployment metadata, and environment information.
2. The current release-line runtime has proven serialization hardening for non-string tool input and output, but it has not yet proven stable behavior for repeated large results in long loops.

### 7.2 State drift risk

1. These servers can mutate or report external state that is not identical to the local repo snapshot.
2. If the model reasons over stale local context after a remote-side change, the XML/build workflow can become confidently wrong rather than safely limited.

### 7.3 Multi-step orchestration risk

1. Utility-style `MCP` use is short and compact.
2. Operational `MCP` use often requires multiple chained tool calls with intermediate interpretation.
3. The release line has not yet proven that the current runtime remains strong when tool-heavy orchestration becomes the dominant interaction pattern.

### 7.4 Result-shaping risk

1. Even when a tool call succeeds, the next model step may still use the result badly if the payload is too verbose or not summarized enough.
2. The current lane proves transport and rendering, but not yet optimal heavy-result shaping.

## 8. Release-Line Decision

1. `MCP` remains in the MVP.
2. Heavy-server `MCP` validation is explicitly post-release.
3. This should be described as:

- supported core `MCP` infrastructure now proven;
- rich external operational `MCP` workflows still needing dedicated scenario validation.

## 9. Post-Release Validation Scenarios

### 9.1 Vercel MCP scenarios

1. Project discovery with large result sets.
2. Deployment listing with pagination or long metadata payloads.
3. Environment-variable inspection where sensitive values must not be over-rendered into the transcript.
4. Multi-step loop: discover project -> inspect latest deploy -> inspect logs -> produce a concise action summary.
5. Mixed local/remote reasoning: local code says one thing, deployment state says another; verify the runtime does not silently lose one side of the picture.

### 9.2 Supabase MCP scenarios

1. Schema/table discovery with many tables.
2. Query-result payloads large enough to stress transcript shaping.
3. Multi-step loop: inspect schema -> inspect migration state -> inspect table rows -> propose local change.
4. Local codebase versus remote database state mismatch.
5. Error-path validation for auth failures, missing project selection, and partial tool availability.

### 9.3 Shared runtime checks

1. Confirm tool outputs do not produce transcript bloat that destabilizes later turns.
2. Confirm consent and final lifecycle events remain unambiguous under repeated tool calls.
3. Confirm copy/export/transcript rendering remains readable when large tool results are involved.
4. Confirm safe degradation when a heavy server is slow, partially unavailable, or returns unexpectedly large content.

## 10. What Would Move This From Experimental To Proven

1. At least one real `Vercel MCP` smoke pass and one real `Supabase MCP` smoke pass on the packaged lane.
2. Evidence that repeated large tool-result flows do not break transcript shaping or final-state truth.
3. Evidence that external-state workflows do not quietly reintroduce stale-context mistakes severe enough to make the flow unsafe.
4. A written disposition on whether heavy-result summarization or output clipping needs host-side support.

## 11. Working Conclusion

1. The current `Legacy XML` release line is technically ready for real core `MCP` usage.
2. It is not yet fully proven for rich operational `MCP` servers like `Vercel` and `Supabase`.
3. That gap is real, but it is a post-release test and hardening bucket rather than an MVP blocker.

## Evidence

- path: `2026-03-30-release-line-mvp-roadmap.md`
  symbol: `Requirement 4 and Phase 5 MVP cut criteria`
  lines: 217-279
- path: `../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md`
  symbol: `2026-03-31 follow-up status and MCP release-readiness follow-up`
  lines: 40-109
- path: `../../src/ipc/chat_runtime/mcp_tools.ts`
  symbol: `buildMcpToolSet`
  lines: 1-157
- path: `../../src/ipc/chat_runtime/run_chat_stream_session.ts`
  symbol: `MCP tool serialization and stream handling`
  lines: 1-260
- path: `../../testing/tauri-webdriver/specs/mcp-build-mode.e2e.mjs`
  symbol: `Focused MCP happy-path verification`
  lines: 1-400
- path: `../../testing/tauri-webdriver/specs/mcp-release-readiness.e2e.mjs`
  symbol: `No-MCP, idle-MCP, and broken-MCP release-readiness verification`
  lines: 1-400

## Links

- [[README.md]]
- [[2026-03-30-release-line-mvp-roadmap.md]]
- [[../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md]]
