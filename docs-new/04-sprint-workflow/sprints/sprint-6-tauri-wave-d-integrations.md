---
id: chaemera-sprint-6-tauri-wave-d-integrations
title: Sprint 6 - Tauri Wave D Integrations
type: sprint
status: completed
tags: [sprint, migration, tauri2, wave-d]
related:
  [
    [README.md],
    [../specs/2026-02-23-tauri2-leptos-migration-master-plan.md],
    [sprint-5-tauri-wave-c-chat-and-agent.md],
  ]
depends_on: [[sprint-5-tauri-wave-c-chat-and-agent.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint 6 - Tauri Wave D Integrations

## Sprint Goal

Migrate integration domains such as GitHub, Supabase, Neon, Vercel, and local model providers onto the Tauri path.

## Deliverables

1. Tauri-backed integration auth and command flows.
2. Bridge and UI consumer migration for integration settings and actions.
3. Harness backlog for provider and cloud integration regression checks.

## Parallel 3-Agent Plan

1. Agent 1: native integration runtime and auth flows.
2. Agent 2: bridge and UI migration for integration domains.
3. Agent 3: integration harness and CI preparation.

## Done Criteria

1. Integration domains operate through the Tauri migration path.
2. OSS-compatible provider flows remain behaviorally stable.
3. Wave D is ready for full-sprint validation.

## Implementation Outcome

1. Implemented in commit `ac58497` (`sprint-6: add tauri integration auth and local model paths`).
2. Added Tauri-backed Vercel auth/project discovery and local model discovery for Ollama and LM Studio.
3. Cloud mutation flows that still depend on app DB state or heavier orchestration were intentionally deferred.

## Validation Snapshot

1. This sprint was later validated as part of the post-Sprint-10 stabilization pass on 2026-03-01.
2. `npm run ts`, `npm run build`, and integrated smoke coverage verified the Wave D bridge remains loadable and compatible.
3. Full GitHub/Supabase/Neon mutation parity remains deferred to the final cleanup and cutover stage.
