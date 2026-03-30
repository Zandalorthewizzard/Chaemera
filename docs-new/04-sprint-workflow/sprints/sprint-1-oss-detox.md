---
id: chaemera-sprint-1-oss-detox
title: Sprint 1 - OSS Detox
type: sprint
status: historical
tags: [sprint, migration, oss, license]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-1/ownership-map.md],
    [sprint-1/interface-lock.md],
    [sprint-1/phase-gates.md],
    [sprint-1/agent-1.scope.md],
    [sprint-1/agent-2.scope.md],
    [sprint-1/agent-3.scope.md],
  ]
depends_on: [[sprint-0-baseline-scope-freeze.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 - OSS Detox

## Historical Notice

1. This sprint is retained as completed implementation history for OSS detachment work.
2. It is no longer an active planning artifact for the current release-line runtime finish work.

## Sprint Goal

Remove proprietary/pro/brand-locked behavior from runtime, UI, i18n, and tests while preserving open-source features.

## Deliverables

1. Pro handlers and pro deep-link flows removed or replaced by OSS-safe behavior.
2. UI/strings updated to remove pro branding and paywall UX.
3. Tests updated for new OSS expectations.
4. Removal report with affected paths and behavior changes.

## Parallel 3-Agent Plan

1. Agent 1: backend/runtime detox (`main`, `ipc`, shared settings logic).
2. Agent 2: frontend detox (`components`, `pages`, `routes`, `i18n`).
3. Agent 3: tests/tooling detox (`e2e`, unit tests, harness/tooling updates).

## Long Slice Model

1. Work is partitioned by capability, not by scattered files.
2. Ownership and lock rules are defined in:
   - `sprint-1/ownership-map.md`
   - `sprint-1/interface-lock.md`
3. Zero shared-write policy is mandatory.
4. Slices are coding-only; documentation is finalized by orchestrator after slice acceptance.
5. Test execution happens once after all slices in the sprint are complete.

## Done Criteria

1. No runtime calls to removed pro endpoints remain.
2. No pro setup/toggle UX remains in active flows.
3. Regression smoke for OSS baseline passes.
4. Sprint 2 bootstrap backlog is approved.

## Current Delivery State (2026-02-23)

1. Slice A delivered: `f430940` (runtime/backend detox).
2. Slice B delivered: `d8a8696` (frontend/i18n detox).
3. Slice C delivered: `3acfcc0` (test/harness realignment).
4. Orchestrator policy lock delivered: `d35614a` (`temporarily unavailable in OSS` for Agent/Ask/Plan).
5. Full-sprint acceptance execution is intentionally deferred by user directive.

## Links

- [[README.md]]
- [[../specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[sprint-1/ownership-map.md]]
- [[sprint-1/interface-lock.md]]
- [[sprint-1/phase-gates.md]]
- [[sprint-1/agent-1.scope.md]]
- [[sprint-1/agent-2.scope.md]]
- [[sprint-1/agent-3.scope.md]]
