---
id: chaemera-spec-hosted-paywall-surface-inventory-and-archive-policy-2026-03-28
title: Hosted Paywall Surface Inventory and Archive Policy
type: spec
status: active
tags: [spec, governance, byok, archive, hosted, paywall, subscriptions]
related:
  [
    [2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
    [2026-03-28-rust-logging-backend-contract-and-migration-plan.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
    [../sprints/sprint-0/proprietary-surface-map.md],
    [../sprints/sprint-0/removal-candidate-list.md],
  ]
depends_on:
  [
    [2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md],
    [2026-03-28-prod-mvp-release-roadmap.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Hosted Paywall Surface Inventory and Archive Policy

1. Start Here

- This document is the canonical inventory for everything in the current codebase that should be treated as hosted-paywall, subscription-shaped, or Dyad-hosted legacy surface.
- The public release branch should not keep these surfaces active.
- The public GitHub repo should not present these surfaces as a live product path.
- If we need them later for an optional subscription product, they belong in a local-only archive outside the public release tree, not in the mainline runtime.

2. Decision

- Remove or neutralize all active hosted-paywall logic from the public release line.
- Keep only neutral BYOK-capable features in the public branch.
- Preserve a frozen local archive of the removed implementation so a future optional subscription layer can be rebuilt quickly without re-inventing every surface.
- Treat the archive as reference material, not as live product code.

3. Archive Policy

- The archive is local-only.
- It must live outside the shipped public repo surface.
- It must not be committed to the release branch.
- It must not be linked from user-facing help, release notes, or product docs.
- It may contain:
  - removed source snapshots,
  - old strings and UI copy,
  - legacy endpoint manifests,
  - compatibility notes,
  - migration notes for a future optional subscription product.
- It must not contain secrets, tokens, user data, or live credentials.
- It should use neutral file names internally, even if the archived code still uses legacy names.

Suggested local archive layout:

| Folder        | Purpose                                                |
| ------------- | ------------------------------------------------------ |
| `manifest.md` | High-level index of what was archived and why.         |
| `runtime/`    | Hosted entitlement, quota, and routing code snapshots. |
| `ui/`         | Paywall, upsell, and subscription UI snapshots.        |
| `i18n/`       | Legacy strings and labels.                             |
| `tests/`      | Legacy contract tests and fixtures.                    |
| `docs/`       | Internal rationale notes and migration references.     |
| `endpoints/`  | Hosted service URLs and adapter notes.                 |

4. Inventory Summary

## 4.1 Remove From Public Repo And Release Line

| Bucket                                                      | Representative files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | What it is                                                                                                                                         | Public action                                                                                                 | Archive action                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Hosted entitlement and quota control plane                  | `src/lib/schemas.ts`, `src/main/settings.ts`, `src/ipc/utils/get_model_client.ts`, `src/ipc/handlers/pro_handlers.ts`, `src/ipc/handlers/free_agent_quota_handlers.ts`, `src/ipc/types/free_agent_quota.ts`, `src/lib/queryKeys.ts`, `src/renderer.tsx`, `src/ipc/ipc_host.ts`, `src/hooks/useUserBudgetInfo.ts`, `src/hooks/useFreeAgentQuota.ts`, `src/hooks/useTrialModelRestriction.ts`, `src/hooks/useSettings.ts`, `src/hooks/useStreamChat.ts`, `src/db/schema.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Flags, quota windows, hosted access checks, budget queries, and the routing that decides whether the app behaves like BYOK-only or hosted/premium. | Remove from the public branch or leave only as a dormant compatibility shell with no active product behavior. | Keep the full implementation snapshot so a future subscription layer can be restored without re-deriving the policy logic. |
| Premium and trial UI surfaces                               | `src/components/ProBanner.tsx`, `src/components/ProModeSelector.tsx`, `src/components/DyadProTrialDialog.tsx`, `src/components/DyadProSuccessDialog.tsx`, `src/components/settings/ProviderSettingsPage.tsx`, `src/components/settings/ProviderSettingsHeader.tsx`, `src/pages/home.tsx`, `src/app/TitleBar.tsx`, `src/components/SetupBanner.tsx`, `src/components/ModelPicker.tsx`, `src/components/ChatModeSelector.tsx`, `src/components/DefaultChatModeSelector.tsx`, `src/components/chat/FreeAgentQuotaBanner.tsx`, `src/components/chat/ChatErrorBox.tsx`, `src/components/chat/PromoMessage.tsx`, `src/components/chat/TokenBar.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/chat/ChatPanel.tsx`, `src/components/ChatList.tsx`, `src/components/preview_panel/AnnotatorOnlyForPro.tsx`, `src/components/preview_panel/FileEditor.tsx`, `src/components/AIGeneratorTab.tsx`, `src/components/TelemetryBanner.tsx`, `src/components/ReleaseChannelSelector.tsx`, `src/components/HelpDialog.tsx` | Visible subscription banners, quota banners, upgrade prompts, help/report flows that assume a hosted or paid tier.                                 | Remove or neutralize in release UI so the product reads as BYOK-first and OSS-first.                          | Keep as design/archive reference for a future optional subscription product.                                               |
| Hosted service and bridge endpoints                         | `src/neon_admin/neon_management_client.ts`, `src/supabase_admin/supabase_management_client.ts`, `src/ipc/handlers/neon_handlers.ts`, `src/ipc/handlers/supabase_handlers.ts`, `src/ipc/handlers/template_utils.ts`, `src/ipc/handlers/release_note_handlers.ts`, `src/ipc/handlers/app_upgrade_handlers.ts`, `src/components/NeonConnector.tsx`, `src/components/SupabaseConnector.tsx`, `src/components/GitHubConnector.tsx`, `src/components/HelpDialog.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Calls or links that depend on Dyad-hosted infrastructure, cloud OAuth flows, upload/report endpoints, or branded release channels.                 | Replace with Chaemera-owned services or remove from the public release line.                                  | Keep endpoint manifests and adapter notes only in the archive.                                                             |
| Branding and paywall language                               | `src/prompts/system_prompt.ts`, `src/prompts/local_agent_prompt.ts`, `src/prompts/plan_mode_prompt.ts`, `src/i18n/locales/en/settings.json`, `src/i18n/locales/en/home.json`, `src/i18n/locales/en/chat.json`, `src/i18n/locales/pt-BR/settings.json`, `src/i18n/locales/pt-BR/home.json`, `src/i18n/locales/pt-BR/chat.json`, `src/i18n/locales/zh-CN/settings.json`, `src/i18n/locales/zh-CN/home.json`, `src/i18n/locales/zh-CN/chat.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Direct `Dyad`, `Pro`, `subscription`, `upgrade`, `credits`, and hosted-model wording in prompts and UI strings.                                    | Remove or rename to neutral Chaemera language in shipped UX.                                                  | Keep frozen string snapshots in the archive for reference.                                                                 |
| Tests, fixtures, and snapshots that encode the old contract | `src/__tests__/cloud_ai_settings.test.ts`, `src/__tests__/readSettings.test.ts`, `src/__tests__/import_app_context.test.ts`, `e2e-tests/helpers/page-objects/PageObject.ts`, `e2e-tests/helpers/page-objects/components/Settings.ts`, `e2e-tests/free_agent_quota.spec.ts`, `e2e-tests/thinking_budget.spec.ts`, `e2e-tests/smart_context_*.spec.ts`, `e2e-tests/local_agent_*.spec.ts`, `e2e-tests/annotator.spec.ts`, `e2e-tests/engine.spec.ts`, `e2e-tests/context_manage.spec.ts`, `e2e-tests/visual_editing.spec.ts`, `e2e-tests/turbo_edits_*.spec.ts`, `e2e-tests/snapshots/*.yml`                                                                                                                                                                                                                                                                                                                                                                                                                             | Unit and E2E expectations that still assume `enableDyadPro`, quota-gated flows, pro setup, or branded copy.                                        | Rewrite or remove in the public test tree.                                                                    | Keep the old scenarios in the archive as regression reference.                                                             |

## 4.2 Keep In Public Repo, But Rename Or Neutralize

| Bucket                                                            | Representative files                                                                                                                                                                                                                                                                                                                                                                                              | What it is                                                                                                                                                                       | Public action                                                                            | Archive action                                                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Neutral quality features that are not inherently paywall features | `src/lib/schemas.ts`, `src/main/settings.ts`, `src/utils/codebase.ts`, `src/ipc/handlers/token_count_handlers.ts`, `src/components/ContextFilesPicker.tsx`, `src/components/chat/TokenBar.tsx`, `src/components/AutoFixProblemsSwitch.tsx`, `src/hooks/useCheckProblems.ts`, `src/components/preview_panel/FileEditor.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/preview_panel/NeonConfigure.tsx` | Smart context, lazy edits, web search, auto-fix, context compaction, and related utility features. They are useful BYOK capabilities but should not carry Pro/paywall semantics. | Keep the feature if it is product-positive; rename and detach from entitlement language. | Keep a copy only if future optional subscriptions need an implementation reference. |
| OSS-safe deep-link and integration surfaces                       | `src/contexts/DeepLinkContext.tsx`, `src/ipc/deep_link_data.ts`, `src/pages/library.tsx`, `src/components/settings/ToolsMcpSettings.tsx`, `src/components/SupabaseConnector.tsx`, `src/components/NeonConnector.tsx`                                                                                                                                                                                              | Deep-link and integration plumbing that also serves OSS flows such as `add-prompt`, `add-mcp-server`, `supabase-oauth-return`, and `neon-oauth-return`.                          | Keep, but do not conflate with hosted/paywall behavior.                                  | No archive needed unless a future subscription uses the same plumbing.              |

5. What Goes Into The Archive For A Future Optional Subscription Layer

- Current hosted access control logic, including the current `enableCloudAI` / `enableDyadPro` transition history.
- Quota and budget policy code, including server-time trust and reset behavior.
- Hosted engine override code and provider gateway assumptions.
- Trial/upgrade banners, dialogs, and copy variants.
- Support/report upload endpoints and legacy cloud links.
- Translation bundles that still describe a hosted or premium product tier.
- Legacy tests and E2E fixtures that encode the old entitlement model.

6. What Must Stay Out Of The Archive

- Secrets, tokens, API keys, or user data.
- Live environment-specific credentials.
- Runtime output or debug bundles that contain identifiable user information.
- Any file that would reintroduce hidden paywall behavior into the public release line if copied back without review.

7. Public-Branch Rule

- If a surface is still needed in the public branch, it must not read as a hosted entitlement or subscription gate.
- If a surface exists only to preserve compatibility, it must be labeled as compatibility-only and must not affect the baseline BYOK path.
- If a surface is unnecessary for the public release line, it should be removed rather than left to imply hidden paywall behavior.

8. Future Optional Subscription Rule

- A future optional subscription product may use a clean, neutral entitlement model.
- That future model should not reuse `Dyad Pro` wording in user-facing strings.
- It may reuse archive material as implementation reference, but the reintroduced code must be rewritten for Chaemera naming and product rules before shipping.
- The public branch should never look like it still contains a partially hidden paywall.

9. Evidence

- path: `src/lib/schemas.ts`
  symbol: `Hosted entitlement and BYOK gating helpers`
  lines: 312-321, 416-448, 492-513
- path: `src/ipc/utils/get_model_client.ts`
  symbol: `Hosted engine override through enableCloudAI`
  lines: 74-130
- path: `src/ipc/handlers/free_agent_quota_handlers.ts`
  symbol: `Free agent quota runtime`
  lines: 17-184
- path: `src/main/settings.ts`
  symbol: `Legacy pro-shaped settings defaults`
  lines: 22-35
- path: `src/components/HelpDialog.tsx`
  symbol: `Debug upload and Cloud AI settings export`
  lines: 67-537
- path: `src/components/chat/ChatErrorBox.tsx`
  symbol: `Hosted quota and upgrade help links`
  lines: 26-105
- path: `docs-new/04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md`
  symbol: `Accepted BYOK-first, hosted-detachment policy`
  lines: 1-240
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  symbol: `Release-line detachment and cleanup scope`
  lines: 1-320
- path: `docs-new/04-sprint-workflow/sprints/sprint-0/proprietary-surface-map.md`
  symbol: `Proprietary surface map and removal candidates`
  lines: 1-140

10. Promotion Artifacts

- A local-only archive manifest outside the public repo, if and when the team wants a frozen copy for future optional subscriptions.
- A replacement spec for any later optional subscription product, written in neutral Chaemera terms.
- A release checklist item proving that no hosted-paywall path remains active in the public branch.

11. Links

- [[2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md]]
- [[2026-03-28-prod-mvp-release-roadmap.md]]
- [[2026-03-28-rust-logging-backend-contract-and-migration-plan.md]]
- [[2026-03-28-final-tauri-host-capability-cutover.md]]
- [[../sprints/sprint-0/proprietary-surface-map.md]]
- [[../sprints/sprint-0/removal-candidate-list.md]]
