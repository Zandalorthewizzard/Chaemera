---
id: chaemera-sprint-0-baseline-feature-catalog
title: Sprint 0 Baseline Feature Catalog
type: artifact
status: active
tags: [sprint-0, baseline, catalog]
related: [[../sprint-0-baseline-scope-freeze.md], [acceptance-matrix.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Baseline Feature Catalog

## Catalog Rules

1. Every feature maps to one or more matrix IDs in `acceptance-matrix.md`.
2. `Priority` is the highest priority among mapped matrix rows.
3. `UNKNOWN` marks unresolved OSS-boundary decisions (no assumptions).

## Feature Catalog

| Feature ID  | Feature                                                          | Domain        | Priority | Gate       | Matrix Mapping                           | Evidence Anchor                                                                     |
| ----------- | ---------------------------------------------------------------- | ------------- | -------- | ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| BF-APP-001  | App shell startup and first prompt usability                     | app lifecycle | P0       | must-pass  | `AM-APP-001`                             | `e2e-tests/main.spec.ts:3`                                                          |
| BF-APP-002  | Setup entry and onboarding reachability                          | app lifecycle | P0       | must-pass  | `AM-APP-002`                             | `e2e-tests/setup.spec.ts:8`                                                         |
| BF-APP-003  | Runtime continuity (restart + refresh)                           | app lifecycle | P1       | phase-gate | `AM-APP-003`                             | `e2e-tests/restart.spec.ts:4`                                                       |
| BF-APP-004  | Force-close telemetry dialog surface                             | app lifecycle | P2       | phase-gate | `AM-APP-004`                             | `e2e-tests/performance_monitor.spec.ts:28`                                          |
| BF-CHAT-001 | Core chat/engine response loop                                   | chat          | P0       | must-pass  | `AM-CHAT-001`                            | `e2e-tests/engine.spec.ts:3`                                                        |
| BF-CHAT-002 | Proposal approval/rejection control loop                         | chat          | P0       | must-pass  | `AM-CHAT-002`                            | `e2e-tests/approve.spec.ts:4`                                                       |
| BF-CHAT-003 | Chat resiliency (retry, queue, partial resume)                   | chat          | P1       | phase-gate | `AM-CHAT-003`                            | `e2e-tests/queued_message.spec.ts:12`                                               |
| BF-CHAT-004 | Multi-chat session navigation (new/tabs/history)                 | chat          | P1       | phase-gate | `AM-CHAT-004`                            | `e2e-tests/chat_tabs.spec.ts:4`                                                     |
| BF-CHAT-005 | Mentions and prompt context references                           | chat          | P1       | phase-gate | `AM-CHAT-005`                            | `e2e-tests/mention_files.spec.ts:4`                                                 |
| BF-CHAT-006 | Agent mode quota and advanced local-agent flows                  | chat          | P2       | phase-gate | `AM-CHAT-006`, `AM-CHAT-007`             | `e2e-tests/free_agent_quota.spec.ts:11`, `e2e-tests/local_agent_basic.spec.ts:8`    |
| BF-SET-001  | Provider configuration and provider CRUD                         | settings      | P0       | must-pass  | `AM-SET-001`                             | `e2e-tests/edit_provider.spec.ts:3`                                                 |
| BF-SET-002  | Consent/preferences persistence (telemetry/update/channel/theme) | settings      | P1       | phase-gate | `AM-SET-002`, `AM-SET-003`, `AM-SET-004` | `e2e-tests/telemetry.spec.ts:3`, `e2e-tests/theme_selection.spec.ts:4`              |
| BF-SET-003  | Runtime dependency settings (Node path/setup)                    | settings      | P1       | phase-gate | `AM-SET-005`                             | `e2e-tests/nodejs_path_configuration.spec.ts:5`                                     |
| BF-SET-004  | Pro-mode settings persistence surface                            | settings      | P2       | phase-gate | `AM-SET-006`                             | `e2e-tests/smart_context_options.spec.ts:3`                                         |
| BF-FILE-001 | App import baseline                                              | files         | P0       | must-pass  | `AM-FILE-001`                            | `e2e-tests/import.spec.ts:6`                                                        |
| BF-FILE-006 | App import advanced variants and in-place import                 | files         | P1       | phase-gate | `AM-FILE-002`                            | `e2e-tests/import.spec.ts:48`, `e2e-tests/import_in_place.spec.ts:7`                |
| BF-FILE-002 | Code edit correctness and version integrity                      | files         | P0       | must-pass  | `AM-FILE-003`, `AM-FILE-004`             | `e2e-tests/edit_code.spec.ts:41`, `e2e-tests/version_integrity.spec.ts:49`          |
| BF-FILE-003 | Undo/version UX reliability                                      | files         | P1       | phase-gate | `AM-FILE-005`                            | `e2e-tests/undo.spec.ts:36`                                                         |
| BF-FILE-004 | Context curation and file discovery                              | files         | P0       | must-pass  | `AM-FILE-006`                            | `e2e-tests/context_manage.spec.ts:3`                                                |
| BF-FILE-005 | App inventory lifecycle operations                               | files         | P1       | phase-gate | `AM-FILE-007`                            | `e2e-tests/switch_apps.spec.ts:4`                                                   |
| BF-INT-001  | GitHub integration (connect/sync/import)                         | integrations  | P1       | phase-gate | `AM-INT-001`, `AM-INT-002`               | `e2e-tests/github.spec.ts:4`, `e2e-tests/github-import.spec.ts:4`                   |
| BF-INT-002  | Supabase integration baseline                                    | integrations  | P1       | phase-gate | `AM-INT-003`                             | `e2e-tests/supabase_migrations.spec.ts:7`                                           |
| BF-INT-003  | MCP and local model integrations                                 | integrations  | P1       | phase-gate | `AM-INT-004`, `AM-INT-005`               | `e2e-tests/mcp.spec.ts:6`, `e2e-tests/ollama.spec.ts:3`                             |
| BF-INT-004  | Azure and git-collaboration extended suites                      | integrations  | P2       | phase-gate | `AM-INT-006`                             | `e2e-tests/azure_send_message.spec.ts:13`, `e2e-tests/git_collaboration.spec.ts:71` |

## Explicit UNKNOWN Set

1. `BF-CHAT-006`: includes mixed free-mode and pro-gated paths; final keep/remove decision depends on parallel OSS detox decisions.
2. `BF-SET-004`: pro-mode settings (`smart context`, `turbo edits`) are intentionally unresolved at Sprint 0 baseline freeze.
3. `BF-INT-004`: environment-heavy and potentially scope-sensitive integration coverage is tracked but not promoted to P0/P1 blocker.

## Sync Check (Catalog <-> Matrix)

1. All catalog rows reference one or more matrix IDs.
2. All `P0` catalog rows map only to `must-pass` matrix rows.
3. All `UNKNOWN` entries in catalog map to matrix rows already marked `UNKNOWN`.
