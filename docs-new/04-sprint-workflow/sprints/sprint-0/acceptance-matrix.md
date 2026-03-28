---
id: chaemera-sprint-0-acceptance-matrix
title: Sprint 0 Acceptance Matrix
type: artifact
status: active
tags: [sprint-0, acceptance, matrix]
related: [[../sprint-0-baseline-scope-freeze.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Acceptance Matrix

## Baseline Method

1. Baseline is derived from `e2e-tests/*.spec.ts` only (no speculative behavior from `src/`).
2. Priority policy:
   - `P0` = OSS baseline blocker for Sprint 1 (`must-pass`).
   - `P1` = phase-gate for migration waves (`phase-gate`).
   - `P2` = conditional/deferred; keep as `phase-gate` with explicit `UNKNOWN` when scope is unclear.
3. Any disputed OSS boundary is marked `UNKNOWN` (no assumptions).

## Matrix

| Matrix ID   | Domain        | Capability / Scenario                                         | Priority | Gate Type  | Evidence (spec:test)                                                                                                                                                                                             | Notes                                                    |
| ----------- | ------------- | ------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| AM-APP-001  | app lifecycle | App boots to usable chat surface and can send first prompt    | P0       | must-pass  | `e2e-tests/main.spec.ts:3`, `e2e-tests/main.spec.ts:9`                                                                                                                                                           | Core runtime smoke for OSS baseline                      |
| AM-APP-002  | app lifecycle | Setup entry path for provider onboarding is reachable         | P0       | must-pass  | `e2e-tests/setup.spec.ts:8`, `e2e-tests/setup_flow.spec.ts:98`                                                                                                                                                   | Must remain valid after runtime migration                |
| AM-APP-003  | app lifecycle | Restart and preview refresh continue to work                  | P1       | phase-gate | `e2e-tests/restart.spec.ts:4`, `e2e-tests/refresh.spec.ts:4`, `e2e-tests/refresh.spec.ts:32`                                                                                                                     | Includes route-preservation behavior                     |
| AM-APP-004  | app lifecycle | Force-close detection and performance-state dialog            | P2       | phase-gate | `e2e-tests/performance_monitor.spec.ts:28`, `e2e-tests/performance_monitor.spec.ts:75`, `e2e-tests/performance_monitor.spec.ts:110`                                                                              | `UNKNOWN`: keep-or-drop decision not locked for OSS MVP  |
| AM-CHAT-001 | chat          | Message roundtrip through engine providers                    | P0       | must-pass  | `e2e-tests/engine.spec.ts:3`, `e2e-tests/engine.spec.ts:15`                                                                                                                                                      | Baseline conversational path                             |
| AM-CHAT-002 | chat          | Proposal decision loop (approve/reject)                       | P0       | must-pass  | `e2e-tests/approve.spec.ts:4`, `e2e-tests/reject.spec.ts:4`                                                                                                                                                      | Core build-mode control path                             |
| AM-CHAT-003 | chat          | Retry, queued messages, and partial-response recovery         | P1       | phase-gate | `e2e-tests/retry.spec.ts:3`, `e2e-tests/queued_message.spec.ts:12`, `e2e-tests/queued_message.spec.ts:48`, `e2e-tests/partial_response.spec.ts:3`                                                                | Reliability behavior                                     |
| AM-CHAT-004 | chat          | Multi-chat UX: new chat, tabs, history recall                 | P1       | phase-gate | `e2e-tests/new_chat.spec.ts:9`, `e2e-tests/chat_tabs.spec.ts:4`, `e2e-tests/chat_history.spec.ts:4`                                                                                                              | Session navigation coverage                              |
| AM-CHAT-005 | chat          | Prompt mentions for file/app context                          | P1       | phase-gate | `e2e-tests/mention_files.spec.ts:4`, `e2e-tests/mention_app.spec.ts:3`                                                                                                                                           | Uses explicit non-pro path for app mention               |
| AM-CHAT-006 | chat          | Free Basic Agent quota and fallback to Build mode             | P2       | phase-gate | `e2e-tests/free_agent_quota.spec.ts:11`, `e2e-tests/free_agent_quota.spec.ts:86`                                                                                                                                 | `UNKNOWN`: tied to product packaging, keep evidence only |
| AM-CHAT-007 | chat          | Local-agent v2 tool-calling flows                             | P2       | phase-gate | `e2e-tests/local_agent_basic.spec.ts:8`, `e2e-tests/local_agent_search_replace.spec.ts:9`, `e2e-tests/local_agent_list_files.spec.ts:8`                                                                          | `UNKNOWN`: mostly `setUpDyadPro`-gated                   |
| AM-SET-001  | settings      | Provider setup/edit/delete settings flows                     | P0       | must-pass  | `e2e-tests/setup.spec.ts:8`, `e2e-tests/edit_provider.spec.ts:3`, `e2e-tests/delete_provider.spec.ts:3`                                                                                                          | OSS setup baseline                                       |
| AM-SET-002  | settings      | Telemetry consent states (accept/reject/later)                | P1       | phase-gate | `e2e-tests/telemetry.spec.ts:3`, `e2e-tests/telemetry.spec.ts:10`, `e2e-tests/telemetry.spec.ts:17`                                                                                                              | User-consent persistence                                 |
| AM-SET-003  | settings      | Auto-update and release-channel toggles                       | P1       | phase-gate | `e2e-tests/auto_update.spec.ts:4`, `e2e-tests/release_channel.spec.ts:4`                                                                                                                                         | Desktop lifecycle settings                               |
| AM-SET-004  | settings      | Theme selection persistence (global + app)                    | P1       | phase-gate | `e2e-tests/theme_selection.spec.ts:4`, `e2e-tests/theme_selection.spec.ts:42`                                                                                                                                    | UX preference persistence                                |
| AM-SET-005  | settings      | Node.js runtime/path configuration surfaces                   | P1       | phase-gate | `e2e-tests/setup_flow.spec.ts:44`, `e2e-tests/nodejs_path_configuration.spec.ts:5`, `e2e-tests/nodejs_path_configuration.spec.ts:20`                                                                             | Runtime dependency baseline                              |
| AM-SET-006  | settings      | Smart-context and turbo-edits mode settings                   | P2       | phase-gate | `e2e-tests/smart_context_options.spec.ts:3`, `e2e-tests/turbo_edits_options.spec.ts:3`                                                                                                                           | `UNKNOWN`: pro-mode dependency                           |
| AM-FILE-001 | files         | Import app baseline                                           | P0       | must-pass  | `e2e-tests/import.spec.ts:6`                                                                                                                                                                                     | Core onboarding/import path                              |
| AM-FILE-002 | files         | Import advanced options and in-place import                   | P1       | phase-gate | `e2e-tests/import.spec.ts:48`, `e2e-tests/import.spec.ts:77`, `e2e-tests/import_in_place.spec.ts:7`                                                                                                              | Includes command customization path                      |
| AM-FILE-003 | files         | Code editor save writes intended file                         | P0       | must-pass  | `e2e-tests/edit_code.spec.ts:6`, `e2e-tests/edit_code.spec.ts:41`                                                                                                                                                | Protects against cross-file corruption                   |
| AM-FILE-004 | files         | Version restore and integrity across git backends             | P0       | must-pass  | `e2e-tests/version_integrity.spec.ts:49`, `e2e-tests/version_integrity.spec.ts:53`, `e2e-tests/switch_versions.spec.ts:31`                                                                                       | Regression blocker for migration                         |
| AM-FILE-005 | files         | Undo semantics after generated/no-code responses              | P1       | phase-gate | `e2e-tests/undo.spec.ts:36`, `e2e-tests/undo.spec.ts:44`                                                                                                                                                         | Version-control UX reliability                           |
| AM-FILE-006 | files         | Context include/exclude and file-tree search                  | P0       | must-pass  | `e2e-tests/context_manage.spec.ts:3`, `e2e-tests/context_manage.spec.ts:84`, `e2e-tests/file_tree_search.spec.ts:4`                                                                                              | OSS default context controls                             |
| AM-FILE-007 | files         | App management: switch/rename/copy/delete/search/storage move | P1       | phase-gate | `e2e-tests/switch_apps.spec.ts:4`, `e2e-tests/rename_app.spec.ts:5`, `e2e-tests/copy_app.spec.ts:20`, `e2e-tests/delete_app.spec.ts:5`, `e2e-tests/app_search.spec.ts:3`, `e2e-tests/app_storage_path.spec.ts:7` | Covers app inventory lifecycle                           |
| AM-INT-001  | integrations  | GitHub connection and repo sync lifecycle                     | P1       | phase-gate | `e2e-tests/github.spec.ts:4`, `e2e-tests/github.spec.ts:23`, `e2e-tests/github.spec.ts:121`                                                                                                                      | Open-compatible cloud integration                        |
| AM-INT-002  | integrations  | GitHub import flows                                           | P1       | phase-gate | `e2e-tests/github-import.spec.ts:4`, `e2e-tests/github-import.spec.ts:59`, `e2e-tests/github-import.spec.ts:107`                                                                                                 | Import entrypoint parity                                 |
| AM-INT-003  | integrations  | Supabase connect/client/migrations/branch flow                | P1       | phase-gate | `e2e-tests/supabase_client.spec.ts:3`, `e2e-tests/supabase_migrations.spec.ts:7`, `e2e-tests/supabase_branch.spec.ts:4`                                                                                          | OSS-compatible DB workflow                               |
| AM-INT-004  | integrations  | MCP tool server integration (stdio + http)                    | P1       | phase-gate | `e2e-tests/mcp.spec.ts:6`, `e2e-tests/mcp.spec.ts:54`                                                                                                                                                            | Requires consent and tool wiring                         |
| AM-INT-005  | integrations  | Local model backends (Ollama / LM Studio)                     | P1       | phase-gate | `e2e-tests/ollama.spec.ts:3`, `e2e-tests/lm_studio.spec.ts:3`                                                                                                                                                    | Local inference compatibility                            |
| AM-INT-006  | integrations  | Azure and advanced git-collab suites                          | P2       | phase-gate | `e2e-tests/azure_provider_settings.spec.ts:4`, `e2e-tests/azure_send_message.spec.ts:13`, `e2e-tests/git_collaboration.spec.ts:71`                                                                               | `UNKNOWN`: external/env-heavy and scope sensitivity      |

## P0 Must-Pass Set (Sprint 1 Blockers)

1. `AM-APP-001`
2. `AM-APP-002`
3. `AM-CHAT-001`
4. `AM-CHAT-002`
5. `AM-SET-001`
6. `AM-FILE-001`
7. `AM-FILE-003`
8. `AM-FILE-004`
9. `AM-FILE-006`

## Open Items

1. `AM-CHAT-007`, `AM-SET-006`, `AM-INT-006` are intentionally marked `UNKNOWN` until pro-surface decisions from parallel tracks are fully reconciled.
2. Matrix is synchronized with `baseline-feature-catalog.md` via shared matrix IDs.
