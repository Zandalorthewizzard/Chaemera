---
id: chaemera-sprint-0-removal-candidate-list
title: Sprint 0 Removal Candidate List
type: artifact
status: active
tags: [sprint-0, oss, cleanup]
related:
  [
    [../sprint-0-baseline-scope-freeze.md],
    [proprietary-surface-map.md],
    [decision-matrix.md],
    [phase-gates.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Removal Candidate List

## Sprint 1 Backlog (Short)

### P0 - Remove/Replace First

1. Remove pro deep-link route and handler.
   - Files: `src/main.ts`, `src/main/pro.ts`, `src/app/TitleBar.tsx`.
   - Target: delete `dyad-pro-return` path, keep `supabase/neon/add-mcp/add-prompt` (`D-0007`).
2. Remove budget endpoint and pro backend wiring.
   - Files: `src/ipc/handlers/pro_handlers.ts`, `src/ipc/types/system.ts`, `src/hooks/useUserBudgetInfo.ts`, `src/renderer.tsx`, `src/ipc/ipc_host.ts`.
   - Target: no runtime dependency on `api.dyad.sh` budget calls.
3. Remove paid upsell/pro-only UI.
   - Files: `src/components/ProBanner.tsx`, `src/components/ProModeSelector.tsx`, `src/components/DyadProTrialDialog.tsx`, `src/components/DyadProSuccessDialog.tsx`, `src/components/settings/ProviderSettingsPage.tsx`, `src/components/settings/ProviderSettingsHeader.tsx`, `src/pages/home.tsx`.
   - Target: no paid subscription prompts in OSS default UX.
4. Replace pro/paid i18n strings.
   - Files: `src/i18n/locales/en/{settings,home,chat}.json`, `src/i18n/locales/pt-BR/{settings,home,chat}.json`, `src/i18n/locales/zh-CN/{settings,home,chat}.json`.
   - Target: no "Dyad Pro", subscription, upgrade, credits-used copy remains.

## Safeguard

1. Every P0 change must be cross-checked against Agent 1 baseline matrix before merge (`G0.5`).
2. If any candidate conflicts with P0 baseline behavior, move to `REVIEW` and attach mitigation first.

## G0.5 Cross-Check Mitigations (P0 Alignment)

1. Deep-link pro route removal (`dyad-pro-return`) must preserve OSS deep-link routes.
   - Protected P0 set: `AM-APP-001`, `AM-APP-002`.
   - Mitigation: remove only pro branch and keep `supabase/neon/add-mcp/add-prompt` behavior unchanged.
2. Budget backend removal must not break default chat and proposal loop.
   - Protected P0 set: `AM-CHAT-001`, `AM-CHAT-002`.
   - Mitigation: detach budget prefetch path from chat critical path; preserve provider-based message flow.
3. Pro UI cleanup must preserve provider setup surface.
   - Protected P0 set: `AM-SET-001`.
   - Mitigation: replace pro-specific UI with OSS-neutral controls, do not remove provider CRUD entry points.
4. i18n pro string cleanup must preserve file and context operations.
   - Protected P0 set: `AM-FILE-001`, `AM-FILE-003`, `AM-FILE-004`, `AM-FILE-006`.
   - Mitigation: copy replacement only; no behavioral edits in file/version/context logic.

## REVIEW Queue (Do Not Blindly Remove)

1. Deep-link infra that also serves OSS:
   - `src/contexts/DeepLinkContext.tsx`, `src/ipc/deep_link_data.ts`, `src/pages/library.tsx`, `src/components/settings/ToolsMcpSettings.tsx`, `src/components/SupabaseConnector.tsx`, `src/components/NeonConnector.tsx`.
2. Quota/budget policy surface:
   - `src/ipc/handlers/free_agent_quota_handlers.ts`, `src/ipc/types/free_agent_quota.ts`, `src/hooks/useFreeAgentQuota.ts`, `src/components/chat/FreeAgentQuotaBanner.tsx`, `src/components/ChatModeSelector.tsx`, `src/components/DefaultChatModeSelector.tsx`, `src/components/ChatPanel.tsx`, `src/components/ChatList.tsx`.
3. Pro-mode flags reused by non-pro logic:
   - `src/lib/schemas.ts`, `src/main/settings.ts`, `src/utils/codebase.ts`, `src/ipc/handlers/token_count_handlers.ts`, `src/ipc/handlers/debug_handlers.ts`.

## Test Realignment Backlog

1. Replace `setUpDyadPro` test setup path used across e2e.
   - Primary files: `e2e-tests/helpers/page-objects/PageObject.ts`, `e2e-tests/helpers/page-objects/components/Settings.ts`.
   - Affected suites: `e2e-tests/engine.spec.ts`, `e2e-tests/visual_editing.spec.ts`, `e2e-tests/context_manage.spec.ts`, `e2e-tests/turbo_edits_v2.spec.ts`, all `e2e-tests/local_agent_*.spec.ts`, plus other suites listed in `proprietary-surface-map.md`.
2. Keep and validate OSS deep-link test:
   - `e2e-tests/add_prompt_deep_link.spec.ts` and its snapshot should remain valid after pro-route removal.
3. Rework quota-specific e2e expectations:
   - `e2e-tests/free_agent_quota.spec.ts`, `e2e-tests/thinking_budget.spec.ts`, and related snapshots.
