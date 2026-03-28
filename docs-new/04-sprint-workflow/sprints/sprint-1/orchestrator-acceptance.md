---
id: chaemera-sprint-1-orchestrator-acceptance
title: Sprint 1 Orchestrator Acceptance
type: artifact
status: active
tags: [sprint-1, acceptance, orchestrator]
related:
  [
    [../sprint-1-oss-detox.md],
    [phase-gates.md],
    [ownership-map.md],
    [interface-lock.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Orchestrator Acceptance

## Accepted Slice Deliveries

1. Agent 1 accepted (`f430940`):
   - removed `dyad-pro-return` handling,
   - removed `src/main/pro.ts`,
   - disabled runtime call to `api.dyad.sh/v1/user/info` while keeping channel contract stable.
2. Agent 2 accepted (`d8a8696`):
   - removed pro/paywall frontend surfaces,
   - neutralized OSS-facing copy in UI + i18n locales,
   - preserved non-pro deep-link and backend contract boundaries.
3. Agent 3 accepted (`3acfcc0`):
   - migrated test harness to `setUpOss`,
   - realigned e2e/unit expectations to current OSS runtime behavior,
   - added OSS-safe deep-link test for `add-mcp-server`.
4. Orchestrator policy lock accepted (`d35614a`):
   - Agent/Ask/Plan now explicitly report `temporarily unavailable in OSS`.

## Open Items (Deferred by Directive)

1. No full-sprint test execution has been run yet.
2. Snapshot reconciliation is deferred to full-sprint validation stage.
3. Sprint closure remains `implementation complete / validation deferred` until `G1.5` is executed.

## Next Validation Stage

1. Run full-sprint acceptance stack in one stage (not per slice).
2. Triage failures into:
   - expected snapshot drift,
   - real regressions requiring code fix.
3. Re-run and close `G1.5` after pass.
