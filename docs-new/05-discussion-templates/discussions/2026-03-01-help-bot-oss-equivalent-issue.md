---
id: chaemera-issue-help-bot-oss-equivalent-2026-03-01
title: Help Bot OSS Equivalent Decision
type: issue
status: deferred
tags: [issue, help-bot, oss, branding]
related:
  [
    [../README.md],
    [2026-02-23-tauri2-leptos-migration-strategy.md],
    [
      ../../04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md,
    ],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Help Bot OSS Equivalent Decision

## Description

1. The current help bot surface is still present in the product, but its runtime implementation is tied to a Dyad-branded external service.
2. That means the feature is not yet cleanly classified as:
   - retained OSS functionality,
   - temporary compatibility surface,
   - or branded/proprietary surface that should be removed or replaced.
3. We must decide what the Chaemera fork wants this feature to become before we port or delete it.

## Discovery Context

1. The issue was rediscovered during `Sprint 11` cutover triage while reviewing remaining Electron-only and branded surfaces after the app/workspace/runtime waves.
2. The feature is still wired into IPC contracts and renderer UX, so ignoring it would leave a decision gap near final parity.

## Impact

1. If we port it blindly, we risk reintroducing a branded dependency into the public OSS fork.
2. If we remove it blindly, we may delete useful product behavior without first understanding what users would expect from an OSS equivalent.
3. This issue blocks a clean decision for:
   - whether the feature stays,
   - what backend/provider model it should use,
   - whether it should be local, provider-backed, or documentation-search-based.

## Proposed Resolution

1. Investigate the original behavior precisely:
   - what the help bot is supposed to answer,
   - whether it is product docs search, general Q&A, or account/service-assisted guidance,
   - what response quality and latency expectations the original UX implies.
2. Decide whether Chaemera wants:
   - a true OSS equivalent,
   - a reduced OSS-safe replacement,
   - or a temporary unavailable state pending a better design.
3. Keep the current surface in place until that decision is made.
4. Do not remove the feature yet.

## Decision Status

1. Status: `DEFERRED`
2. Current lock:
   - feature is not deleted yet,
   - no Tauri/Leptos port is authorized yet,
   - decision requires explicit follow-up investigation.
3. Product lock as of `2026-03-01`:
   - all `help:chat:*` migration work is `DEFERRED`,
   - `Sprint 11` does not include help-bot porting,
   - the feature remains present until a separate OSS/product decision is executed.

## Evidence

- path: `src/ipc/types/help.ts`
  symbol: `helpContracts and helpStreamContract`
  lines: 33-70
- path: `src/ipc/handlers/help_bot_handlers.ts`
  symbol: `registerHelpBotHandlers`
  lines: 18-118
- path: `src/ipc/handlers/help_bot_handlers.ts`
  symbol: `createOpenAI baseURL helpchat.dyad.sh`
  lines: 39-46
- path: `src/i18n/locales/en/home.json`
  symbol: `helpBotDescription`
  lines: 144-144

## Links

- [[../README.md]]
- [[2026-02-23-tauri2-leptos-migration-strategy.md]]
- [[../../04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md]]
