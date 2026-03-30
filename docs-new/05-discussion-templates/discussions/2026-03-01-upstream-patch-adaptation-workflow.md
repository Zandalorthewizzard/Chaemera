---
id: chaemera-discussion-upstream-patch-adaptation-workflow-2026-03-01
title: Upstream Patch Adaptation Workflow
type: discussion
status: historical
tags: [discussion, upstream, adaptation, workflow, governance]
related:
  [
    [../discussion-template.md],
    [2026-02-23-tauri2-leptos-migration-strategy.md],
    [
      ../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md,
    ],
    [../../04-sprint-workflow/sprints/partitioning-v2.md],
    [../../04-sprint-workflow/sprints/sprint-slicing-rules.md],
    [../../02-guides/integrations-reference.md],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: discussion
outline: []
---

# Upstream Patch Adaptation Workflow

1. Context

- Historical notice:
  - this document records an earlier migration-stage workflow for adapting upstream Dyad ideas and patches;
  - keep it as historical process context, not as a current control document.
- Chaemera is no longer in a state where raw upstream code synchronization is realistic.
- Current migration path deliberately moves runtime and UI away from the original Electron + React stack toward Tauri 2 + Leptos.
- That means future value from upstream Dyad will often come from behavioral ideas, bug fixes, security fixes, and product logic rather than from directly reusing implementation diffs.
- The existing migration work already produced a useful process baseline:
  - contract-first analysis,
  - capability-grouped migration waves,
  - explicit docs/meta synchronization,
  - agent continuity notes,
  - orchestration over parallel or sequential execution.

2. Problem

- Without an explicit adaptation workflow, upstream intake becomes ad hoc.
- Useful changes risk being missed because direct code cherry-picks are often impossible.
- Unwanted changes risk slipping in because there is no formal filter for:
  - branded logic,
  - closed/pro logic,
  - cloud-locked services we intentionally do not want,
  - stack-specific Electron/React implementation details that do not belong in Chaemera.
- Over time, "maybe useful" upstream changes would turn into undocumented drift with no audit trail.

3. Goals

- Treat upstream Dyad as a source of behavior, ideas, and fixes rather than as a source of directly mergeable code.
- Create a repeatable intake and triage workflow for upstream commits, PRs, or release batches.
- Preserve a clear log of:
  - which upstream range was reviewed,
  - what changed,
  - what is relevant,
  - what is deferred,
  - what is rejected and why.
- Reuse the current migration discipline:
  - capability-first grouping,
  - explicit ownership,
  - milestone-based validation,
  - evidence-backed documentation.
- Make later automation possible instead of depending on memory or manual GitHub browsing.

4. Alternatives

- Ignore upstream entirely:
  - Pro: zero process overhead.
  - Con: lose security fixes, behavior improvements, and useful product learnings.
- Try to periodically merge or cherry-pick upstream code:
  - Pro: simple in theory.
  - Con: structurally wrong once the stack and architecture have diverged this far.
- Use an adaptation workflow instead of sync (selected):
  - Pro: keeps useful upstream value while respecting stack divergence and OSS policy.
  - Con: requires disciplined triage and logging.

5. Decision

- Establish an `Upstream Patch Adaptation Workflow`.
- Core rule:
  - Chaemera does not sync upstream code directly.
  - Chaemera adapts upstream behavioral intent and accepted invariants.

    5.1. Recommended Process Model

For each upstream review cycle:

1. Fetch upstream metadata.
2. Define a review range:
   - from last reviewed upstream commit
   - to current chosen upstream commit
3. Build a machine-readable and human-readable change log for that range.
4. Classify changes by domain.
5. Filter out known non-target surfaces.
6. Triage the remaining items by value and compatibility.
7. Convert selected items into:
   - issue,
   - discussion,
   - sprint,
   - or explicit rejection record.

5.2. Core Adaptation Rule

The adaptation unit should not be "the diff".

The adaptation unit should be:

1. upstream problem solved
2. upstream behavior changed
3. important invariant to preserve
4. Chaemera-specific implementation path

This matches the migration approach already used in Chaemera:

1. preserve behavior and contracts
2. reimplement behind the new stack
3. validate parity at meaningful checkpoints

5.3. Proposed Triage Statuses

Every upstream item should land in exactly one of these statuses:

1. `PORT`
   - Useful and compatible.
   - Should be implemented in Chaemera.

2. `REINTERPRET`
   - The idea is useful, but implementation must differ significantly because of stack or architecture.

3. `DEFER`
   - Useful, but not now.
   - Usually blocked by migration stage, missing subsystem, or unfinished internal refactor.

4. `REJECT`
   - Explicitly not wanted.
   - Examples:
     - pro logic,
     - closed-license surfaces,
     - branded service dependencies,
     - product decisions Chaemera has already intentionally reversed.

5.4. Proposed Priority Model

Inside `PORT` and `REINTERPRET`, classify priority as:

1. `P0`
   - security fixes
   - data-loss fixes
   - correctness bugs in shared OSS behavior
   - build/runtime breakages

2. `P1`
   - meaningful workflow improvements in domains we actively keep
   - integration reliability fixes
   - context/token/runtime correctness improvements

3. `P2`
   - UX polish
   - optional developer experience improvements
   - nice-to-have product improvements

4. `R`
   - explicit reject bucket

5.5. Explicit Reject Filters

The workflow should auto-flag likely reject candidates before human review:

1. `PRO` or clearly pro-only paths
2. branded cloud access logic we have removed intentionally
3. closed or license-incompatible surfaces
4. vendor-specific service hooks that have no OSS-safe equivalent
5. UI or runtime logic tied to old Dyad branding or account services

These still deserve a log record, but they should enter review pre-labeled as likely `REJECT`.

5.6. Domain Classification

Upstream changes should be grouped by affected domain, not just by commit order.

Suggested first-pass domain map:

1. runtime / IPC / handlers
2. app and chat data model
3. preview / publish / configure
4. integrations:
   - GitHub
   - Supabase
   - Neon
   - Vercel
   - model providers
   - MCP
5. agent / prompt / token / context logic
6. tests / harness
7. docs / governance
8. branded / closed / pro surfaces

This mirrors the migration work that already proved effective in Chaemera:

1. capability-grouped waves
2. clear ownership
3. no accidental mixing of unrelated surfaces

5.7. Recommended Log Structure

The adaptation log should be append-only and range-based.

Recommended per-range fields:

1. `reviewed_at`
2. `upstream_from_commit`
3. `upstream_to_commit`
4. `upstream_compare_url` or equivalent reference
5. `range_summary`
6. `items`

Each item should include:

1. upstream commit hash
2. title or short description
3. changed paths
4. inferred domains
5. status:
   - `PORT`
   - `REINTERPRET`
   - `DEFER`
   - `REJECT`
6. priority:
   - `P0`
   - `P1`
   - `P2`
   - `R`
7. why it matters
8. why it does or does not fit Chaemera
9. target artifact:
   - discussion
   - issue
   - sprint
   - none

5.8. Recommended Automation

The best automation model is lightweight and review-first.

Recommended steps:

1. Add an `upstream` remote for original Dyad.
2. Store the last reviewed upstream commit in a small checkpoint file.
3. Use a script to:
   - fetch upstream,
   - compute the next review range,
   - collect commits and changed paths,
   - classify by path patterns,
   - pre-label likely rejects,
   - emit a structured log artifact.
4. Then let the orchestrator review and finalize statuses.

Good output formats:

1. JSON for machine processing
2. Markdown summary for humans

Recommended future artifact shape:

1. `docs-new/07-upstream-adaptation/checkpoints.json`
2. `docs-new/07-upstream-adaptation/logs/YYYY-MM-DD-upstream-range.md`
3. `docs-new/07-upstream-adaptation/logs/YYYY-MM-DD-upstream-range.json`

5.9. Recommended Automatic Signals

The script should prioritize or flag changes when paths match:

1. `src/ipc/types/**`
   - likely contract change
2. `src/ipc/handlers/**`
   - likely runtime behavior change
3. `src/components/preview_panel/**`
   - preview/publish/configure impact
4. `src/components/**` or `src/routes/**`
   - renderer UX impact
5. `src/prompts/**`, `src/utils/codebase.ts`, token/context logic
   - prompt/context behavior impact
6. `e2e-tests/**`
   - acceptance or behavior shift
7. `PRO/**`, branded cloud routes, or branded service endpoints
   - likely reject

5.10. Best Use Of Current Chaemera Experience

The current refactor already produced the right habits for this future workflow.

Reusable lessons:

1. contract surfaces are the best first inventory
2. capability-grouped waves are easier to reason about than file-by-file porting
3. parity should be measured at accepted checkpoints, not every local intermediate state
4. notes are valuable for continuity
5. docs/meta sync keeps process debt from accumulating silently
6. reject/defer decisions should be recorded, not left implicit

5.11. Minimal Viable First Version

The first version should stay simple.

Phase 1:

1. add `upstream` remote
2. define checkpoint file
3. define log template
4. manually review selected upstream ranges

Phase 2:

1. add local script for range summary and path classification
2. auto-generate markdown + json log
3. auto-label likely reject candidates

Phase 3:

1. scheduled fetch
2. automatic draft review cards
3. optional integration with orchestrator queue

4. Unknown / Deferred

5. Whether the future upstream-tracking artifacts should live inside `docs-new/` or in a separate operational folder.
6. Whether we want commit-level logging, PR-level logging, or release-batch logging as the default granularity.
7. Whether the first automation should use:
   - local git compare only,
   - GitHub API compare endpoints,
   - or both.
8. Whether some domains should be permanently auto-rejected by policy rather than only pre-labeled for review.
9. Whether we want a dedicated strict spec after this discussion for the first implementation of the workflow.

## Evidence

- path: `../../04-sprint-workflow/sprints/partitioning-v2.md`
  symbol: `Sprint Partitioning v2 (Long Slice Model)`
  lines: 1-120
- path: `../../04-sprint-workflow/sprints/sprint-slicing-rules.md`
  symbol: `Sprint and Slice Rules (Hard Requirements)`
  lines: 1-120
- path: `../../04-sprint-workflow/runbook.md`
  symbol: `Sprint Pack Runbook`
  lines: 1-120
- path: `../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  symbol: `Migration Master Plan (Leptos + Tauri 2)`
  lines: 1-260
- path: `../../02-guides/integrations-reference.md`
  symbol: `Integration model used by Chaemera`
  lines: 1-320
- path: `../../../notes/2026-03-01-migration-state.md`
  symbol: `Capability-grouped Sprint 11 waves and resume discipline`
  lines: 1-743
- path: `../../../AGENTS.md`
  symbol: `Documentation governance and working-notes rules`
  lines: 104-132
- stack: `git remote -v`
  observation: only `origin` is configured in the current fork working copy on 2026-03-01, so an explicit `upstream` remote would need to be added before local range automation can rely on git remotes.

## Links

- [[../discussion-template.md]]
- [[2026-02-23-tauri2-leptos-migration-strategy.md]]
- [[../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../04-sprint-workflow/sprints/partitioning-v2.md]]
- [[../../04-sprint-workflow/sprints/sprint-slicing-rules.md]]
- [[../../02-guides/integrations-reference.md]]
