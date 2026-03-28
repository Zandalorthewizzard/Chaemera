---
id: chaemera-guide-working-notes
title: Agent Working Notes Guide
type: guide
status: active
tags: [agent, notes, continuity]
related:
  [
    [agent-navigation.md],
    [operations/documentation-sync.md],
    [../../notes/README.md],
    [../../AGENTS.md],
  ]
depends_on: []
generated: false
source_of_truth: process
outline: []
---

# Agent Working Notes Guide

`notes/` is the operational memory layer for agents working in this repository.

## Status

1. `notes/` is allowed and expected for substantial implementation, debugging, orchestration, and handoff work.
2. `notes/` is non-canonical. It does not override code, runtime behavior, or evidence-backed `docs-new/` artifacts.

## When To Write Notes

Write or update a note when:

1. A task creates observations that may matter later.
2. Debugging reveals environment fixes, traps, or recovery steps.
3. Work is paused and another agent may need to resume it.
4. Session loss, crash recovery, or long-running migration work makes context continuity valuable.

## What Notes Should Contain

1. Current task or milestone context.
2. What changed.
3. Observations and hypotheses, clearly labeled.
4. Open issues or blockers.
5. The next safe resume point.

## Promotion Rule

1. Keep transient reasoning and operational breadcrumbs in `notes/`.
2. Promote durable decisions, accepted findings, and process rules into `docs-new/`.
3. Canonical promotion must include evidence blocks.

## Recovery Flow

If an agent resumes with partial context:

1. Read `AGENTS.md`.
2. Read the required `docs-new/` chain.
3. Read this guide.
4. Read the relevant files in `notes/`.
5. Continue only from confirmed state, not memory alone.

## Evidence

- path: `../../AGENTS.md`
  symbol: `Documentation governance`
  lines: 104-132
- path: `../../notes/README.md`
  symbol: `Agent Working Notes`
  lines: 1-80

## Links

- [[agent-navigation.md]]
- [[operations/documentation-sync.md]]
- [[../../notes/README.md]]
- [[../../AGENTS.md]]
