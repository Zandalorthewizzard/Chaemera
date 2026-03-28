---
id: chaemera-sprint-1-phase-gates
title: Sprint 1 Phase Gates
type: artifact
status: active
tags: [sprint-1, gates]
related:
  [
    [../sprint-1-oss-detox.md],
    [README.md],
    [ownership-map.md],
    [interface-lock.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Phase Gates

## Gate Table

| Gate ID | Gate                             | Measurement                                                 | Pass Criteria                                                     | Owner        |
| ------- | -------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- | ------------ |
| G1.1    | Runtime/backend OSS detox        | Pro deep-link and pro budget API path removed               | No `dyad-pro-return`; no `api.dyad.sh/v1/user/info` runtime usage | Agent 1      |
| G1.2    | Frontend/i18n OSS detox          | Pro/paywall surfaces removed and strings neutralized        | No active pro/paywall UI path remains in owned frontend scope     | Agent 2      |
| G1.3    | Test/harness OSS realignment     | E2E/unit harness aligned to OSS contract                    | `setUpOss` is baseline; pro setup path removed                    | Agent 3      |
| G1.4    | OSS mode policy lock             | Agent/Ask/Plan OSS behavior explicitly set                  | User-facing message uses `temporarily unavailable in OSS` wording | Orchestrator |
| G1.5    | Full-sprint acceptance execution | Unified lint/type/unit/e2e pass and snapshot reconciliation | Full sprint validation report attached                            | Orchestrator |

## Current Status (2026-02-23)

| Gate ID | Status   | Evidence                                                               | Notes                                                                        |
| ------- | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| G1.1    | pass     | `f430940`, `src/main.ts`, `src/ipc/handlers/pro_handlers.ts`           | Pro deep-link removed, budget API call removed, contract channel kept stable |
| G1.2    | pass     | `d8a8696`, `src/components/**`, `src/pages/**`, `src/i18n/locales/**`  | Pro/paywall frontend surfaces removed in Agent 2 ownership                   |
| G1.3    | pass     | `3acfcc0`, `e2e-tests/**`, `src/__tests__/local_agent_handler.test.ts` | OSS harness and test expectations updated                                    |
| G1.4    | pass     | `d35614a`, `src/ipc/handlers/local_agent/local_agent_handler.ts`       | Message policy locked to `temporarily unavailable in OSS`                    |
| G1.5    | deferred | User directive: do not run tests yet                                   | Validation executes only when orchestrator opens full-sprint test stage      |

## Exit Condition for Sprint 1

1. `G1.1..G1.4` are pass.
2. `G1.5` is executed and pass at full-sprint validation stage.

## Closure Verdict

Sprint 1 is `IMPLEMENTATION COMPLETE / VALIDATION DEFERRED` as of 2026-02-23.
