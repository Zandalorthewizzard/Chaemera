---
id: chaemera-sprint-2-agent-3-scope
title: Sprint 2 Agent 3 Scope
type: task
status: planned
tags: [sprint-2, agent-3, scope]
related:
  [
    [../sprint-2-tauri2-bootstrap.md],
    [ownership-map.md],
    [interface-lock.md],
    [agent-3.exclude],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 Agent 3 Scope

## Workstream

Long Slice C: build pipeline, test harness bootstrap, and migration CI glue.

## Owned Paths

1. `package.json`
2. `playwright.config.ts`
3. `e2e-tests/helpers/**`
4. `testing/**`
5. `.github/workflows/**`
6. `scripts/**` (except shell-owned scripts reserved by Agent 1)

## Responsibilities

1. Add bootstrap scripts for Tauri dev/test path.
2. Introduce Tauri-compatible smoke harness path.
3. Keep fake-LLM orchestration deterministic.

## Autonomy Rules

1. Do not edit native shell or bridge implementation files.
2. Own CI/harness migration path end-to-end.
3. Use handoff request if runtime changes are required.
4. Tests may be written in slice, but test execution is deferred to full-sprint test stage.

## Exclude

See `agent-3.exclude`.
