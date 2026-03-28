---
id: chaemera-sprint-0-proprietary-surface-map
title: Sprint 0 Proprietary Surface Map
type: artifact
status: active
tags: [sprint-0, oss, proprietary]
related:
  [
    [../sprint-0-baseline-scope-freeze.md],
    [removal-candidate-list.md],
    [decision-matrix.md],
    [phase-gates.md],
  ]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 0 Proprietary Surface Map

Scope: Agent 2 only (`pro/paid/deeplink/budget/branding`) based on `src/**`, `e2e-tests/**`, `README.md`.

Decision lock applied: `D-0007` keeps OSS deep links (`supabase-oauth-return`, `neon-oauth-return`, `add-mcp-server`, `add-prompt`) and removes pro deep link (`dyad-pro-return`).

## Runtime and Backend Surfaces

| ID     | Path                                            | Type    | Surface                                                                   | Action Candidate                            |
| ------ | ----------------------------------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| PS-001 | `src/main.ts`                                   | runtime | Deep-link router includes `dyad-pro-return` and OSS routes                | `replace` (drop pro route, keep OSS routes) |
| PS-002 | `src/main/pro.ts`                               | runtime | Pro return handler writes pro API key and enables pro mode                | `remove`                                    |
| PS-003 | `src/main/settings.ts`                          | runtime | Pro defaults (`enableProLazyEditsMode`, `enableProSmartFilesContextMode`) | `review`                                    |
| PS-004 | `src/ipc/handlers/pro_handlers.ts`              | backend | `get-user-budget` via `api.dyad.sh` credits endpoint                      | `remove`                                    |
| PS-005 | `src/ipc/types/system.ts`                       | backend | `get-user-budget` contract and `UserBudgetInfo` schema                    | `replace`                                   |
| PS-006 | `src/ipc/utils/get_model_client.ts`             | backend | Dyad Pro engine override and gateway behavior                             | `replace`                                   |
| PS-007 | `src/ipc/shared/language_model_constants.ts`    | backend | Pro subscription website references                                       | `replace`                                   |
| PS-008 | `src/ipc/handlers/token_count_handlers.ts`      | backend | Token logic gated by pro smart-context settings                           | `review`                                    |
| PS-009 | `src/ipc/handlers/debug_handlers.ts`            | backend | Debug payload includes pro/budget fields                                  | `review`                                    |
| PS-010 | `src/ipc/handlers/chat_stream_handlers.ts`      | backend | Free-agent quota checks and `FREE_AGENT_QUOTA_EXCEEDED`                   | `review`                                    |
| PS-011 | `src/ipc/handlers/free_agent_quota_handlers.ts` | backend | Free-tier quota runtime and server-time trust path                        | `review`                                    |
| PS-012 | `src/ipc/types/free_agent_quota.ts`             | backend | Free quota IPC contracts                                                  | `review`                                    |
| PS-013 | `src/ipc/preload/channels.ts`                   | runtime | Free quota channels exposed to renderer                                   | `review`                                    |
| PS-014 | `src/ipc/ipc_host.ts`                           | backend | Registers pro/quota handlers at startup                                   | `replace`                                   |
| PS-015 | `src/ipc/deep_link_data.ts`                     | backend | Deep-link payload types for MCP/prompt                                    | `review` (OSS keep)                         |
| PS-016 | `src/ipc/types/misc.ts`                         | backend | Deep-link event schema + pro-related settings fields                      | `review`                                    |
| PS-017 | `src/ipc/types/index.ts`                        | backend | Exports pro/quota/deep-link client surfaces                               | `review`                                    |
| PS-018 | `src/db/schema.ts`                              | backend | `usingFreeAgentModeQuota` persistence column                              | `review`                                    |
| PS-019 | `src/lib/schemas.ts`                            | backend | `enableDyadPro`, pro-mode flags, budget fields                            | `replace`                                   |
| PS-020 | `src/lib/queryKeys.ts`                          | backend | Query keys for `userBudget` and `freeAgentQuota`                          | `review`                                    |
| PS-021 | `src/utils/codebase.ts`                         | backend | Pro smart-context gating in codebase selection                            | `review`                                    |

## Frontend Surfaces

| ID     | Path                                                   | Type     | Surface                                              | Action Candidate    |
| ------ | ------------------------------------------------------ | -------- | ---------------------------------------------------- | ------------------- |
| PS-022 | `src/renderer.tsx`                                     | frontend | App bootstrap fetches user budget for pro users      | `replace`           |
| PS-023 | `src/hooks/useUserBudgetInfo.ts`                       | frontend | User budget query hook                               | `remove`            |
| PS-024 | `src/hooks/useTrialModelRestriction.ts`                | frontend | Trial restrictions based on pro budget info          | `replace`           |
| PS-025 | `src/hooks/useFreeAgentQuota.ts`                       | frontend | Free quota query and refresh loop                    | `review`            |
| PS-026 | `src/hooks/useStreamChat.ts`                           | frontend | Invalidates free-quota query on stream events        | `review`            |
| PS-027 | `src/hooks/useSettings.ts`                             | frontend | Pro-status persistence/telemetry tag                 | `review`            |
| PS-028 | `src/contexts/DeepLinkContext.tsx`                     | frontend | Global deep-link event bridge                        | `review` (OSS keep) |
| PS-029 | `src/app/layout.tsx`                                   | frontend | Installs `DeepLinkProvider`                          | `review`            |
| PS-030 | `src/app/TitleBar.tsx`                                 | frontend | Handles `dyad-pro-return`, pro badge, credit display | `replace`           |
| PS-031 | `src/pages/home.tsx`                                   | frontend | Setup/manage pro buttons and quota-gated defaults    | `replace`           |
| PS-032 | `src/pages/library.tsx`                                | frontend | `add-prompt` deep-link intake                        | `review` (OSS keep) |
| PS-033 | `src/components/ProBanner.tsx`                         | frontend | Primary pro upsell banner and pro links              | `remove`            |
| PS-034 | `src/components/ProModeSelector.tsx`                   | frontend | Pro mode toggle and upsell affordances               | `remove`            |
| PS-035 | `src/components/SetupBanner.tsx`                       | frontend | Pro trial CTA in setup banner                        | `replace`           |
| PS-036 | `src/components/DyadProTrialDialog.tsx`                | frontend | Trial paywall dialog                                 | `remove`            |
| PS-037 | `src/components/DyadProSuccessDialog.tsx`              | frontend | Pro activation success dialog                        | `remove`            |
| PS-038 | `src/components/settings/ProviderSettingsPage.tsx`     | frontend | Enable/toggle Dyad Pro UX                            | `replace`           |
| PS-039 | `src/components/settings/ProviderSettingsHeader.tsx`   | frontend | Pro subscription setup/manage labels                 | `replace`           |
| PS-040 | `src/components/settings/ToolsMcpSettings.tsx`         | frontend | `add-mcp-server` deep-link intake                    | `review` (OSS keep) |
| PS-041 | `src/components/SupabaseConnector.tsx`                 | frontend | `supabase-oauth-return` deep-link intake             | `review` (OSS keep) |
| PS-042 | `src/components/NeonConnector.tsx`                     | frontend | `neon-oauth-return` deep-link intake                 | `review` (OSS keep) |
| PS-043 | `src/components/preview_panel/AnnotatorOnlyForPro.tsx` | frontend | Annotator paywall view                               | `replace`           |
| PS-044 | `src/components/ModelPicker.tsx`                       | frontend | Trial-mode gating and upgrade links                  | `replace`           |
| PS-045 | `src/components/ContextFilesPicker.tsx`                | frontend | Pro smart-context gate in context picker             | `review`            |
| PS-046 | `src/components/ChatModeSelector.tsx`                  | frontend | Basic Agent quota countdown in mode list             | `replace`           |
| PS-047 | `src/components/DefaultChatModeSelector.tsx`           | frontend | Default mode logic depends on quota/pro status       | `replace`           |
| PS-048 | `src/components/ChatPanel.tsx`                         | frontend | Shows free-quota-exceeded banner                     | `review`            |
| PS-049 | `src/components/ChatList.tsx`                          | frontend | Chat defaults depend on free quota availability      | `review`            |
| PS-050 | `src/components/chat/FreeAgentQuotaBanner.tsx`         | frontend | Quota-exceeded upsell banner                         | `replace`           |
| PS-051 | `src/components/chat/TokenBar.tsx`                     | frontend | Pro smart-context promo copy/link                    | `replace`           |
| PS-052 | `src/components/chat/PromoMessage.tsx`                 | frontend | Pro marketing message blocks                         | `remove`            |
| PS-053 | `src/components/chat/ChatErrorBox.tsx`                 | frontend | Pro upsell for quota/rate-limit/invalid key          | `replace`           |
| PS-054 | `src/components/chat/ChatInput.tsx`                    | frontend | Pro-enabled props and upgrade CTA links              | `review`            |
| PS-055 | `src/components/chat/MessagesList.tsx`                 | frontend | Message rendering branches on budget/pro state       | `review`            |
| PS-056 | `src/components/HelpDialog.tsx`                        | frontend | Debug export contains pro fields                     | `review`            |
| PS-057 | `src/components/AIGeneratorTab.tsx`                    | frontend | Feature visibility gated by `userBudget`             | `review`            |

## I18n Surfaces

| ID     | Path                                   | Type | Surface                                                | Action Candidate |
| ------ | -------------------------------------- | ---- | ------------------------------------------------------ | ---------------- |
| PS-058 | `src/i18n/locales/en/settings.json`    | i18n | `enableDyadPro`, `thinkingBudget`, subscription labels | `replace`        |
| PS-059 | `src/i18n/locales/en/home.json`        | i18n | Pro manage/setup/get strings and annotator pro copy    | `replace`        |
| PS-060 | `src/i18n/locales/en/chat.json`        | i18n | Pro smart-context, upgrade, credits-used copy          | `replace`        |
| PS-061 | `src/i18n/locales/pt-BR/settings.json` | i18n | PT-BR pro/budget/settings strings                      | `replace`        |
| PS-062 | `src/i18n/locales/pt-BR/home.json`     | i18n | PT-BR pro CTA and annotator paywall copy               | `replace`        |
| PS-063 | `src/i18n/locales/pt-BR/chat.json`     | i18n | PT-BR upgrade/credits/subscription copy                | `replace`        |
| PS-064 | `src/i18n/locales/zh-CN/settings.json` | i18n | ZH-CN pro/budget/settings strings                      | `replace`        |
| PS-065 | `src/i18n/locales/zh-CN/home.json`     | i18n | ZH-CN pro CTA and annotator paywall copy               | `replace`        |
| PS-066 | `src/i18n/locales/zh-CN/chat.json`     | i18n | ZH-CN upgrade/credits/subscription copy                | `replace`        |

## Test Surfaces

| ID     | Path                                                                                                            | Type  | Surface                                           | Action Candidate |
| ------ | --------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------- | ---------------- |
| PS-067 | `src/__tests__/local_agent_handler.test.ts`                                                                     | tests | Unit tests assume `enableDyadPro` requirement     | `replace`        |
| PS-068 | `src/__tests__/readSettings.test.ts`                                                                            | tests | Defaults/assertions include pro mode flags        | `review`         |
| PS-069 | `e2e-tests/helpers/page-objects/PageObject.ts`                                                                  | tests | `setUpDyadPro` flow used by most e2e suites       | `replace`        |
| PS-070 | `e2e-tests/helpers/page-objects/components/Settings.ts`                                                         | tests | Dyad provider setup helper                        | `replace`        |
| PS-071 | `e2e-tests/free_agent_quota.spec.ts`                                                                            | tests | Free-tier quota behavior contract                 | `review`         |
| PS-072 | `e2e-tests/thinking_budget.spec.ts`                                                                             | tests | Budget selector behavior in pro setup             | `review`         |
| PS-073 | `e2e-tests/add_prompt_deep_link.spec.ts`                                                                        | tests | OSS deep-link behavior (`add-prompt`)             | `review` (keep)  |
| PS-074 | `e2e-tests/engine.spec.ts`                                                                                      | tests | Uses `setUpDyadPro` in setup path                 | `replace`        |
| PS-075 | `e2e-tests/default_chat_mode.spec.ts`                                                                           | tests | Default mode tied to pro/quota setup              | `replace`        |
| PS-076 | `e2e-tests/context_manage.spec.ts`                                                                              | tests | Uses `setUpDyadPro` and smart-context assumptions | `replace`        |
| PS-077 | `e2e-tests/context_compaction.spec.ts`                                                                          | tests | Uses pro/local-agent setup                        | `replace`        |
| PS-078 | `e2e-tests/smart_context_balanced.spec.ts`                                                                      | tests | Uses pro setup                                    | `replace`        |
| PS-079 | `e2e-tests/smart_context_deep.spec.ts`                                                                          | tests | Uses pro setup                                    | `replace`        |
| PS-080 | `e2e-tests/smart_context_options.spec.ts`                                                                       | tests | Uses pro setup                                    | `replace`        |
| PS-081 | `e2e-tests/plan_mode.spec.ts`                                                                                   | tests | Uses pro setup for local-agent mode               | `replace`        |
| PS-082 | `e2e-tests/mention_app.spec.ts`                                                                                 | tests | Uses pro setup                                    | `replace`        |
| PS-083 | `e2e-tests/visual_editing.spec.ts`                                                                              | tests | Uses pro setup                                    | `replace`        |
| PS-084 | `e2e-tests/turbo_edits_v2.spec.ts`                                                                              | tests | Uses pro setup                                    | `replace`        |
| PS-085 | `e2e-tests/turbo_edits_options.spec.ts`                                                                         | tests | Uses pro setup                                    | `replace`        |
| PS-086 | `e2e-tests/themes_management.spec.ts`                                                                           | tests | Uses pro setup                                    | `replace`        |
| PS-087 | `e2e-tests/annotator.spec.ts`                                                                                   | tests | Uses pro setup and pro-annotator assumptions      | `replace`        |
| PS-088 | `e2e-tests/local_agent_advanced.spec.ts`                                                                        | tests | Uses pro setup                                    | `replace`        |
| PS-089 | `e2e-tests/local_agent_ask.spec.ts`                                                                             | tests | Uses pro setup                                    | `replace`        |
| PS-090 | `e2e-tests/local_agent_auto.spec.ts`                                                                            | tests | Uses pro setup                                    | `replace`        |
| PS-091 | `e2e-tests/local_agent_basic.spec.ts`                                                                           | tests | Uses pro setup                                    | `replace`        |
| PS-092 | `e2e-tests/local_agent_code_search.spec.ts`                                                                     | tests | Uses pro setup                                    | `replace`        |
| PS-093 | `e2e-tests/local_agent_consent.spec.ts`                                                                         | tests | Uses pro setup                                    | `replace`        |
| PS-094 | `e2e-tests/local_agent_file_upload.spec.ts`                                                                     | tests | Uses pro setup                                    | `replace`        |
| PS-095 | `e2e-tests/local_agent_grep.spec.ts`                                                                            | tests | Uses pro setup                                    | `replace`        |
| PS-096 | `e2e-tests/local_agent_list_files.spec.ts`                                                                      | tests | Uses pro setup                                    | `replace`        |
| PS-097 | `e2e-tests/local_agent_read_logs.spec.ts`                                                                       | tests | Uses pro setup                                    | `replace`        |
| PS-098 | `e2e-tests/local_agent_run_type_checks.spec.ts`                                                                 | tests | Uses pro setup                                    | `replace`        |
| PS-099 | `e2e-tests/local_agent_search_replace.spec.ts`                                                                  | tests | Uses pro setup                                    | `replace`        |
| PS-100 | `e2e-tests/local_agent_summarize.spec.ts`                                                                       | tests | Uses pro setup                                    | `replace`        |
| PS-101 | `e2e-tests/local_agent_todo_followup.spec.ts`                                                                   | tests | Uses pro setup                                    | `replace`        |
| PS-102 | `e2e-tests/snapshots/supabase_branch.spec.ts_supabase-branch-selection-works-1.aria.yml`                        | tests | Snapshot includes pro smart-context promo text    | `replace`        |
| PS-103 | `e2e-tests/snapshots/add_prompt_deep_link.spec.ts_add-prompt-via-deep-link-with-base64-encoded-data-1.aria.yml` | tests | Deep-link prompt snapshot (OSS route)             | `review` (keep)  |

## Notes

1. `README.md` scan: no direct pro/paid/deeplink/budget branding references found in this slice.
2. `REVIEW` marks ambiguous surfaces that might be product policy rather than proprietary lock-in.
3. This artifact intentionally excludes Agent 1 baseline matrix and Agent 3 risk ownership content.
