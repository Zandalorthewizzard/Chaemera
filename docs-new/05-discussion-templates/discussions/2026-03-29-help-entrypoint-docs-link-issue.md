---
id: chaemera-issue-help-entrypoint-docs-link-2026-03-29
title: Help Entrypoint Should Resolve to Real Chaemera Documentation
type: issue
status: deferred
tags: [issue, help, docs, ux, release]
related:
  [
    [../README.md],
    [2026-03-01-help-bot-oss-equivalent-issue.md],
    [
      ../../04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md,
    ],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Help Entrypoint Should Resolve to Real Chaemera Documentation

## Description

1. The current help entry flow still reflects a temporary compatibility shape rather than a final Chaemera help experience.
2. `Open Help Tools` currently navigates to the local `/help` route, and the `/help` page in turn exposes `Open Support Tools` for the legacy debug/support dialog.
3. This is acceptable as a temporary local tool surface, but it is not the final user-facing help story.

## Discovery Context

1. During packaged smoke testing, `Open Help Tools` was observed to blink or effectively no-op when triggered from the help route itself.
2. Product intent is now clearer: long-term, the main help entry should lead users to real Chaemera documentation rather than a recursive local route pattern.
3. The local `/help` route still has value as an internal support and diagnostics surface, but it should not be confused with the main product documentation entrypoint.

## Impact

1. The current behavior is confusing because the action label suggests documentation, while the implementation is actually a local debug/support route.
2. It creates unnecessary route churn and makes the help entry feel unreliable.
3. If left untracked, this will be easy to forget because the local support dialog still mostly works.

## Proposed Resolution

1. Split `documentation entry` from `support tools entry`.
2. The primary help action should open a real Chaemera docs/help URL once that documentation surface exists.
3. The local `/help` route should remain a dedicated support-tools page for diagnostics, debug bundle export, and issue-reporting helpers.
4. The implementation should be config-driven:
   - documentation URL comes from one explicit app-level config source,
   - the button label matches the real destination,
   - and self-navigation on `/help` is avoided entirely.
5. Until the external docs surface exists, the issue should remain deferred rather than papered over with ambiguous route behavior.

## Decision Status

1. Status: `DEFERRED`
2. Not a release-blocking issue for the current non-chat hardening stage.
3. Must be revisited when the public Chaemera documentation entrypoint is ready.

## Evidence

- path: `src/components/HelpDialog.tsx`
  symbol: `Main help action navigates directly to /help without route-context guard`
  lines: 375-381
- path: `src/components/HelpDialog.tsx`
  symbol: `Upload-complete help action already has a help-route guard helper`
  lines: 348-352
- path: `src/pages/help.tsx`
  symbol: `Help page is a local support-tools wrapper around the legacy HelpDialog`
  lines: 11-28
- path: `docs-new/04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md`
  symbol: `Help and diagnostics remains an explicit smoke-validation surface`
  lines: 250-263

## Links

- [[../README.md]]
- [[2026-03-01-help-bot-oss-equivalent-issue.md]]
- [[../../04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md]]
