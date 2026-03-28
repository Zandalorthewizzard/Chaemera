---
id: chaemera-spec-agent-access-foundation-and-hosted-entitlement-detachment-2026-03-26
title: Agent Access Foundation and Hosted Entitlement Detachment
type: spec
status: active
tags: [spec, governance, byok, agent, entitlement, quota]
related:
  [
    [2026-03-02-chaemera-next-phase-product-roadmap.md],
    [../../02-guides/working-notes.md],
    [../../../notes/README.md],
    [../../../notes/Decisions/2026-03-26-agent-access-foundation-decision.md],
  ]
depends_on: [[2026-03-02-chaemera-next-phase-product-roadmap.md]]
generated: false
source_of_truth: governance
outline: []
---

# Agent Access Foundation and Hosted Entitlement Detachment

1. Start Here

- This spec records the accepted decision for the current Chaemera product posture.
- Chaemera remains `BYOK-first` and `OSS-first` for the current release line.
- The remaining hosted or freemium-shaped `Dyad Pro` remnants should be disabled in active product behavior, not ripped out blindly.
- The useful foundation to preserve is a neutral entitlement and quota layer that can later support optional Chaemera subscriptions without reintroducing coercive `Dyad Pro` semantics.

2. Context + Problem

- Current code still mixes three separate concepts into one `local-agent` access model:
  - using the agent with the user's own providers,
  - hosted or managed access,
  - free-tier quota or trial policy.
- That coupling was inherited from earlier Dyad product packaging, but the current Chaemera direction is different:
  - no active subscription system in the current product,
  - no requirement to upsell before the app is useful,
  - no default UX where `BYOK` agent capability feels like a trial.
- As long as those concepts stay coupled, the app sends the wrong product signal:
  - `BYOK` agent access looks like a gated free trial,
  - quota logic appears foundational instead of optional,
  - future monetization would be forced to reuse Dyad-branded terminology and assumptions.

3. Accepted Decision

- Keep `Agent` capability available for `BYOK` usage in the current product.
- Disable active hosted, premium, and freemium UX in the current release line.
- Stop treating the `BYOK` `local-agent` path as quota-limited.
- Preserve the quota and entitlement plumbing as dormant foundation, not as active current policy.
- Reframe future monetization around neutral Chaemera-owned entitlement concepts rather than `Dyad Pro`.

4. Locked Decisions

- Current release posture is `BYOK-first OSS`, not hosted-first.
- No active `Dyad Pro`, subscription, upgrade, or cloud-access copy should remain in the default product UX.
- The current `local-agent` mode should present as plain `Agent` in active UI.
- Any future optional subscription must layer onto a neutral entitlement model and must not gate the app's baseline usefulness.
- Do not pay migration cost now just to rename the persisted quota column in the database.
- If quota logic is reactivated later, the reset window must be corrected from the current `23`-hour implementation to a real `24`-hour policy unless a shorter window is explicitly intended and documented.

5. Target Model

- `agent capability`
  - Can the user run agent mode with their own configured providers?
- `hosted access`
  - Can the product route agent requests through a Chaemera-managed service?
- `quota policy`
  - If Chaemera later offers optional hosted access, what free-tier, trial, or managed usage policy applies to that hosted path?

The important separation is:

- `BYOK agent access` is a product capability.
- `Hosted access` is a future optional service.
- `Quota policy` is a future business rule that should only attach to the hosted layer, not to the core `BYOK` path.

6. Naming Direction

Current legacy names should be moved toward neutral naming in a later rename pass.

| Current name                | Planned direction                             |
| --------------------------- | --------------------------------------------- |
| `enableDyadPro`             | `hostedAgentEnabled` or `managedAgentEnabled` |
| `isDyadProEnabled()`        | `hasHostedAgentAccess()`                      |
| `hasDyadProKey()`           | `hasHostedAgentKey()`                         |
| `freeAgentQuota`            | `hostedAgentQuota` or `agentTrialQuota`       |
| `userBudget`                | `managedUsage` or `hostedUsage`               |
| `FREE_AGENT_QUOTA_EXCEEDED` | `AGENT_QUOTA_EXCEEDED`                        |

The rename pass is intentionally separate from the first disable pass so the product can stop shipping confusing behavior before the full neutral-language cleanup finishes.

7. Ordered Implementation Plan

1. Stage 1 - Disable active hosted and freemium behavior.

- Hide or remove active `Dyad Pro` and cloud-access UX.
- Remove quota messaging and quota-driven affordances from the default `Agent` UI.
- Stop applying free-tier quota enforcement to the `BYOK` agent path.
- Stop default-mode selection from treating `BYOK Agent` as a trial-gated mode.
- Keep quota handlers, storage, and contracts dormant unless they directly block the current UX cleanup.

2. Stage 2 - Rename the access model into neutral entitlement language.

- Rename code-level helpers, state, and UI concepts away from `Dyad Pro`.
- Keep only the minimum compatibility shims needed for persistence or staged migration.
- Update tests and fixtures so they describe Chaemera-owned hosted access rather than Dyad-branded behavior.

3. Stage 3 - Reintroduce optional hosted access only when Chaemera actually ships it.

- Attach billing or subscription logic to the neutral entitlement layer, not to `BYOK Agent`.
- Decide explicitly whether a future free hosted tier exists at all.
- If a future trial or quota exists, make it scoped to hosted access and document its exact reset semantics.

8. File-Level Scope

Primary disable targets:

- `src/components/settings/ProviderSettingsPage.tsx`
- `src/components/settings/ProviderSettingsHeader.tsx`
- `src/app/TitleBar.tsx`
- `src/components/ModelPicker.tsx`
- `src/components/ChatModeSelector.tsx`
- `src/components/chat/FreeAgentQuotaBanner.tsx`
- `src/components/chat/ChatErrorBox.tsx`
- `src/pages/home.tsx`
- `src/ipc/handlers/chat_stream_handlers.ts`
- `src/ipc/utils/get_model_client.ts`

Primary dormant-foundation keep targets:

- `src-tauri/src/wave_ah_domains.rs`
- `src/ipc/types/free_agent_quota.ts`
- `src/lib/queryKeys.ts`
- persisted quota column in the database schema

Primary later rename targets:

- `src/lib/schemas.ts`
- `src/ipc/utils/get_model_client.ts`
- `src/components/settings/ProviderSettingsPage.tsx`
- `src/components/settings/ProviderSettingsHeader.tsx`
- `src/components/ModelPicker.tsx`
- tests and fixtures that still speak in `Basic Agent`, `Dyad Pro`, or similar legacy product language

9. Non-Goals

- No new billing, subscription, or hosted entitlement implementation in this phase.
- No database migration just to rename the existing quota column.
- No removal of the core `BYOK Agent` capability.
- No reintroduction of paywall-shaped or manipulative product UX.

10. Acceptance

- Active product UX no longer presents `Dyad Pro`, subscription, or freemium messaging as part of the default Chaemera experience.
- `BYOK Agent` remains usable without the current free-tier quota restriction.
- Quota and entitlement plumbing are preserved only as explicit dormant foundation.
- Future optional subscriptions, if ever implemented, have a documented neutral-language integration point.

11. Risks and Rollback

- Risks:
  - partial cleanup could leave hidden quota enforcement behind while removing only the UI,
  - a rushed rename pass could break persistence or tests for old field names,
  - dormant hosted logic could be mistaken for active current policy if not documented clearly.
- Rollback:
  - keep Stage 1 and Stage 2 separate,
  - verify runtime behavior before deleting old code paths,
  - do not remove quota foundation until a future hosted policy is either implemented or explicitly rejected.

12. Promotion Artifacts

- This spec is the canonical reference for the accepted product and implementation direction.
- A short operational decision note should remain in `notes/Decisions/` and link back here.
- Any implementation note or checklist that touches hosted access, quota policy, or `BYOK Agent` behavior should link back to this spec.

13. Evidence

- path: `src/lib/schemas.ts`
  symbol: `isDyadProEnabled`, `getEffectiveDefaultChatMode`, `isBasicAgentMode`
  lines: 422-479
- path: `src/ipc/utils/get_model_client.ts`
  symbol: `Dyad Pro override`
  lines: 83-130
- path: `src/components/settings/ProviderSettingsPage.tsx`
  symbol: `cloud access toggle and default local-agent setup`
  lines: 146-195
- path: `src/components/ChatModeSelector.tsx`
  symbol: `local-agent mode list entry and free-tier quota copy`
  lines: 1-198
- path: `src/components/chat/FreeAgentQuotaBanner.tsx`
  symbol: `quota exceeded banner copy`
  lines: 1-62
- path: `src/components/chat/ChatErrorBox.tsx`
  symbol: `FREE_AGENT_QUOTA_EXCEEDED handling`
  lines: 101-107
- path: `src/ipc/handlers/chat_stream_handlers.ts`
  symbol: `Basic Agent quota enforcement`
  lines: 1150-1195
- path: `src-tauri/src/wave_ah_domains.rs`
  symbol: `FREE_AGENT_QUOTA_LIMIT` and `QUOTA_WINDOW_MS`
  lines: 7-122
- path: `docs-new/04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `premium-shaped behavior removal and OSS-first direction`
  lines: 30-224

## Links

- [[2026-03-02-chaemera-next-phase-product-roadmap.md]]
- [[../../02-guides/working-notes.md]]
- [[../../../notes/README.md]]
- [[../../../notes/Decisions/2026-03-26-agent-access-foundation-decision.md]]
