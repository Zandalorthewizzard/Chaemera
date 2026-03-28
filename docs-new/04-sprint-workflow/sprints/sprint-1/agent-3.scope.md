---
id: chaemera-sprint-1-agent-3-scope
title: Sprint 1 Agent 3 Scope
type: task
status: planned
tags: [sprint-1, agent-3, scope]
related:
  [
    [../sprint-1-oss-detox.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-3.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Agent 3 Scope

## Workstream

Long Slice C: test and tooling alignment for OSS detox.

## Owned Paths

1. `e2e-tests/**`
2. `src/__tests__/**`
3. `testing/**`
4. `README.md`
5. `CONTRIBUTING.md`

## Responsibilities

1. Update tests for new OSS expectations.
2. Remove pro-oriented fixtures and setup helpers where needed.
3. Prepare test/harness changes required for sprint-level execution.

## Autonomy Rules

1. Do not edit runtime or frontend implementation files.
2. Consume locked interfaces as-is; request handoff if breakage discovered.
3. Tests may be written in slice, but test execution is deferred to full-sprint test stage.

## Exclude

See `agent-3.exclude`.
