---
id: chaemera-sprint-partitioning-v2
title: Sprint Partitioning v2 (Long Slice Model)
type: guide
status: active
tags: [sprint, partitioning, parallel, governance]
related:
  [
    [README.md],
    [sprint-slicing-rules.md],
    [sprint-1-oss-detox.md],
    [sprint-2-tauri2-bootstrap.md],
  ]
depends_on: [[README.md]]
generated: false
source_of_truth: governance
outline: []
---

# Sprint Partitioning v2 (Long Slice Model)

## Why v2

Previous slicing was too fine-grained and caused dependency coupling across agents.

## Core Rules

1. Long-slice by capability:
   - Agent 1: runtime/backend capability.
   - Agent 2: frontend capability.
   - Agent 3: testing/tooling capability.
2. No shared write in a sprint:
   - Any path can have only one write owner.
3. Interface lock:
   - Shared interfaces are frozen for the sprint unless explicitly reopened.
4. Handoff protocol:
   - If an owner needs a cross-slice change, create a handoff request instead of editing foreign files.
5. Merge sequence:
   - Backend owner -> Frontend owner -> Test/tooling owner, unless sprint-specific map says otherwise.
6. No docs-only slices:
   - All three slices must be coding/development slices.
7. Orchestrator model:
   - Orchestrator accepts slice outputs and updates docs (default: Agent 1).
8. Test execution policy:
   - Tests may be authored in slices but are executed only once after full sprint completion.

## Acceptance for Good Slicing

1. Agents can work in parallel for 1 full sprint without touching the same files.
2. Cross-slice requests are below 10% of total task count.
3. No merge conflict caused by direct overlap of owned paths.

## Links

- [[README.md]]
- [[sprint-slicing-rules.md]]
- [[sprint-1-oss-detox.md]]
- [[sprint-2-tauri2-bootstrap.md]]
