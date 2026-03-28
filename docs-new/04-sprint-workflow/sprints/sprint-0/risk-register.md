---
id: chaemera-sprint-0-risk-register
title: Sprint 0 Risk Register
type: artifact
status: active
tags: [sprint-0, risk]
related: [[../sprint-0-baseline-scope-freeze.md], [phase-gates.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Risk Register

## Baseline Metrics (2026-02-23)

1. `e2e-tests` spec files: `113`.
2. `test(...)` occurrences in specs: `121`.
3. `setUpDyadPro` occurrences in e2e specs: `50`.
4. Pro-related code hits (`enableDyadPro|dyad-pro-return|pro_handlers|free_agent_quota|api.dyad.sh`): `115`.

## Risks

| Risk ID | Risk                                                                        | Severity | Probability | Trigger                                                                 | Mitigation                                                                             | Owner             |
| ------- | --------------------------------------------------------------------------- | -------- | ----------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------- |
| R-001   | Hidden Electron dependency in core OSS flows blocks Tauri parity            | high     | high        | Any P0 flow fails after shell bridge introduction                       | Migrate domain-by-domain with command contract tests and smoke checks per wave         | Sprint Lead       |
| R-002   | OSS detox removes behavior that is still baseline-critical                  | high     | medium      | P0 test flow missing from acceptance matrix or fails after pro cleanup  | Freeze acceptance matrix before cleanup; run P0 smoke after each detox PR              | Agent 1 + Agent 2 |
| R-003   | Parallel agent edits produce overlapping file ownership and merge conflicts | medium   | high        | Same file touched by multiple agents in same sprint                     | Enforce `agent-*.scope.md` + `agent-*.exclude`; escalate cross-slice needs before edit | All Agents        |
| R-004   | Test harness regression hides runtime breakage during migration             | high     | medium      | e2e harness cannot validate startup/chat/settings after runtime changes | Keep minimal smoke subset runnable each phase and pin fake-LLM setup                   | Agent 3           |
| R-005   | Pro surface incomplete: paid/brand endpoints left in runtime                | high     | medium      | Any `api.dyad.sh`/pro path survives after Sprint 1                      | Build explicit removal checklist and grep gate before Sprint 2                         | Agent 1           |
| R-006   | Scope creep inflates Sprint 1 with non-migration refactors                  | medium   | medium      | PR includes unrelated refactor outside scope                            | PR template requires “scope-only delta”; reject mixed-domain PRs                       | Sprint Lead       |

## Residual Risk Notes

1. Deep-link branching in `src/main.ts` mixes OSS and pro routes; cleanup must preserve `supabase-oauth-return`, `neon-oauth-return`, `add-mcp-server`, `add-prompt`.
2. High count of `setUpDyadPro` usage (`50`) indicates significant test realignment work in Sprint 1.

## Rollback Trigger

1. Any P0 gate failure blocks promotion to next sprint.
2. Any unresolved `high` severity risk without mitigation owner blocks Sprint 1 start.
