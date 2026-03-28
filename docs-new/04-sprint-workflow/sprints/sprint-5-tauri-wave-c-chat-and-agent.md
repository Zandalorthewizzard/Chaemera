---
id: chaemera-sprint-5-tauri-wave-c-chat-and-agent
title: Sprint 5 - Tauri Wave C Chat and Agent
type: sprint
status: completed
tags: [sprint, migration, tauri2, wave-c]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-4-tauri-wave-b-files-and-apps.md],
  ]
depends_on: [[sprint-4-tauri-wave-b-files-and-apps.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 5 - Tauri Wave C Chat and Agent

## Sprint Goal

Migrate chat streaming, local-agent, MCP, token, and problems domains onto the new runtime bridge.

## Deliverables

1. Tauri-backed chat, MCP, and tool runtime path.
2. Compatibility bridge and UI consumer migration for chat and agent workflows.
3. Deterministic harness backlog for chat streaming and tool-assisted flows.

## Parallel 3-Agent Plan

1. Agent 1: native chat and tool runtime migration.
2. Agent 2: bridge and UI consumer migration for chat and agent domains.
3. Agent 3: deterministic harness preparation for chat/MCP/local-agent coverage.

## Done Criteria

1. Chat and MCP flows are available through the Tauri migration path.
2. OSS policy behavior for Agent/Ask/Plan remains explicit and stable.
3. Wave C is ready for full-sprint validation.

## Implementation Outcome

1. Implemented in commit `358724e` (`sprint-5: add tauri chat and tool transport bridge`).
2. Added Tauri event/invoke transport for chat streaming, agent-tool surfaces, and MCP state/consent paths.
3. Preserved the OSS product lock that `Agent`, `Ask`, and `Plan` are `temporarily unavailable in OSS` instead of pretending those modes were migrated.

## Validation Snapshot

1. This sprint was later validated as part of the post-Sprint-10 stabilization pass on 2026-03-01.
2. `npm run ts`, `npm run build`, and the passing smoke/regression subset verified the transport bridge still integrates with the renderer.
3. A full native AI runtime replacement remains out of scope until the final cutover stage.
