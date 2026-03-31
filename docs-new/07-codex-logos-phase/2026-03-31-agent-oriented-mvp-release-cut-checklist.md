---
id: chaemera-spec-agent-oriented-mvp-release-cut-checklist-2026-03-31
title: Agent-Oriented MVP Release Cut Checklist
type: spec
status: active
tags: [release, mvp, checklist, agents, triage]
related:
  [
    [README.md],
    [2026-03-30-release-line-mvp-roadmap.md],
    [2026-03-31-legacy-xml-mcp-post-release-heavy-server-readiness.md],
    [../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Agent-Oriented MVP Release Cut Checklist

## 1. Start Here

1. This checklist is written for an AI agent running the release-readiness pass on the current release line.
2. Its purpose is to prevent scope creep during the final MVP cut.
3. The agent must first establish a clean evidence ledger of what works, what fails, and what is deferred.
4. The agent must not try to solve every discovered problem in place.

## 2. Operating Rule

1. When a problem is discovered, the agent must do three things in this order:

- record it;
- classify it;
- and separate it from the proven working lane.

2. Only after the working and failing buckets are clearly separated may the agent decide whether the problem is:

- a release blocker,
- a non-blocking limitation,
- or a post-release follow-up.

3. Default behavior:

- do not broaden scope during discovery;
- do not interrupt the release ledger to chase every bug immediately;
- do not hide failures inside vague notes;
- and do not let one red scenario erase already-proven green coverage.

## 3. Triage Policy

### 3.1 Required first action for any new issue

1. Reproduce enough to name the failure clearly.
2. Record the exact lane where it appeared:

- packaged manual,
- packaged automated,
- webdriver runtime,
- worker unit test,
- lint / ts,
- or docs/process.

3. Mark whether the failure affects:

- the supported `Legacy XML` lane,
- the supported `MCP` lane,
- packaging/startup,
- or only a test harness.

### 3.2 When to fix immediately

1. Fix immediately only if one of these is true:

- the issue blocks the baseline packaged app from launching or running;
- the issue invalidates the supported MVP user path;
- the issue makes an already-proven green lane ambiguous again;
- or the fix is narrow and necessary to finish a currently running verification bucket.

### 3.3 When not to fix immediately

1. Do not fix immediately if the issue is instead:

- a flaky or untrustworthy test scenario;
- an edge-case injection that is not the intended release signal;
- a post-release expansion question;
- or a limitation that can be explicitly documented without invalidating the MVP support story.

2. In that case, create a note or issue-style document, mark the disposition, and continue proving the rest of the supported lane.

## 4. Release Evidence Ledger Shape

The agent must maintain four explicit buckets:

### 4.1 Proven working now

1. List the scenarios that are green with evidence.
2. Example categories:

- packaged build succeeds;
- packaged app launches;
- home/app-details chat works;
- copy behavior works;
- `MCP` happy path works;
- no-MCP and idle-MCP paths work.

### 4.2 Broken and blocking

1. List only issues that invalidate the MVP cut.
2. Every item here must explain exactly why shipping is not yet justified.

### 4.3 Broken but non-blocking

1. List issues that are real but do not invalidate the supported release promise.
2. Each item must include the reason it is non-blocking.

### 4.4 Deferred by scope

1. List anything intentionally outside the MVP cut.
2. This includes post-release validation scenarios and future architecture work.

## 5. Required MVP Buckets

The agent must complete and disposition these buckets in order.

### 5.1 Packaging and startup

1. Verify `npm run package:tauri` succeeds.
2. Verify the packaged app launches.
3. If packaging fails, this is blocking.

### 5.2 Legacy runtime core

1. Verify the supported `Legacy XML` user paths in the packaged app or explicitly disposition any manual-only lane.
2. If a path fails, decide whether it is:

- a real user-facing break,
- a harness issue,
- or a documented manual/non-blocking limitation.

### 5.3 MCP release line

1. Verify focused `MCP` happy path.
2. Verify release-readiness around absent config, idle config, and at least one safe broken-config path.
3. If a discovered red case comes from an unrealistic failure injection, record it and replace it with a safer release-signal scenario instead of letting it poison the whole bucket.

### 5.4 Hygiene

1. Verify `npm run lint` and `npm run ts`.
2. If issues are found, do not continue pretending the tree is release-clean until they are either fixed or explicitly dispositioned.

### 5.5 Known limitations review

1. Review every open caveat found during the pass.
2. Confirm none of them secretly invalidates the supported packaged lane.

## 6. Special Rule For Test Problems

1. If a test reports failure but manual or packaged evidence shows the product path works, the agent must not treat the test as the source of truth automatically.
2. The agent should:

- classify the test as problematic or unstable,
- record the real user-path evidence,
- move the test out of the blocking lane if justified,
- and continue the release evidence pass.

3. This rule exists to prevent automation artifacts from stalling the MVP cut unfairly.

## 7. Special Rule For Post-Release Expansion Questions

1. Questions like heavy `MCP` server readiness, future dual-runtime behavior, or deeper orchestration support must not be allowed to silently reopen MVP scope.
2. If such a question appears, the agent should create a focused follow-up document and classify it as:

- post-release validation,
- future hardening,
- or future architecture work.

## 8. Exit Criteria For The Agent

The agent may recommend an MVP cut only when all of the following are true:

1. The packaged build is green.
2. The supported packaged legacy lane is green or explicitly and credibly dispositioned.
3. The supported `MCP` lane is green with evidence.
4. `lint` and `ts` are green or explicitly waived with written rationale.
5. Known limitations are written down and separated from blockers.
6. Deferred work is named clearly and does not secretly undermine the release claim.

## 9. Final Output Format For The Agent

When the checklist is complete, the agent should report using this shape:

1. `Shipping in MVP`
2. `Verified green`
3. `Known non-blocking limitations`
4. `Deferred post-release work`
5. `Open blockers`, or explicit statement that none remain
6. `MVP verdict`

## 10. Current Known Non-Blocking Examples

At the time this checklist was written, examples include:

1. `version-integrity.e2e.mjs` as manual/unstable automation rather than a product blocker.
2. Heavy-server `MCP` validation for `Vercel` / `Supabase` as post-release test coverage rather than an MVP gate.

## Evidence

- path: `2026-03-30-release-line-mvp-roadmap.md`
  symbol: `Phase 5 - MVP cut and release readiness review`
  lines: 217-302
- path: `2026-03-31-legacy-xml-mcp-post-release-heavy-server-readiness.md`
  symbol: `Post-release heavy-server MCP classification`
  lines: 1-151
- path: `../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md`
  symbol: `Current MCP verification ledger`
  lines: 27-109

## Links

- [[README.md]]
- [[2026-03-30-release-line-mvp-roadmap.md]]
- [[2026-03-31-legacy-xml-mcp-post-release-heavy-server-readiness.md]]
- [[../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md]]
