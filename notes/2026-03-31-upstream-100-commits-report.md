# Отчёт по 100 коммитам апстрима (dyad-sh/dyad)

**Дата анализа:** 2026-03-31
**Период коммитов:** 2026-02-23 — 2026-03-31
**Дистрибутив:** 1070 файлов изменено, +60 246 / −83 134 строк
**Версии:** v0.37.0 → v0.38.0-beta.1 → v0.39.0 → v0.40.0 → v0.41.0
**Источник сравнения:** `origin/main` (Zandalorthewizzard/Chaemera) vs `upstream/main` (dyad-sh/dyad)

---

## 1. Мультимедиа и генерация изображений (7 коммитов)

| PR | Описание |
|---|---|
| #2789 | Image generation tool — новый инструмент генерации изображений |
| #3055 | Image generation from chat — генерация картинок прямо из чата |
| #2717 | Image selection and swapping in the visual editor |
| #2918 | Preview generated images |
| #2950 | Media library — полноценная медиатека |
| #2842 | Cleanup routine for media files |
| #2892 | Image utilities + improved web crawl token handling |

**Крупная фича-эпик:** полный цикл генерации, превью, медиатеки и очистки изображений.

---

## 2. Web Fetching Tool (2 коммита)

| PR | Описание |
|---|---|
| #2920 | Web fetching tool — инструмент получения веб-контента |
| #2801 | plan: web-fetch-local-agent implementation plan |

---

## 3. Планирование и аннотации (3 коммита)

| PR | Описание |
|---|---|
| #2566 | Planning questionnaire in agent mode |
| #3028 | Notification for planning questionnaire |
| #3043 | Plan annotator |

---

## 4. Голосовой ввод (1 коммит)

| PR | Описание |
|---|---|
| #2344 | Voice input with transcription support |

---

## 5. Чат / UX / Рантайм-фичи (11 коммитов)

| PR | Описание |
|---|---|
| #2712 | Refactor Prompt Library — slug-based skills & slash commands |
| #2713 | Persist todos across chat turns |
| #2832 | Allow selecting an app in home chat input |
| #2964 | Gate home chat app selector behind experiment setting |
| #2825 | Multiple apps running concurrently + garbage collection |
| #2875 | User can choose which directory to save Dyad apps |
| #2900 | Max tool call steps setting |
| #3053 | Increase default max tool call steps 50→100 |
| #2828 | Increase tool call limit to 50 + pause message |
| #3005 | Tooltip on app name button in title bar |
| #2901 | Tip banner for chat notification |

---

## 6. Производительность / IPC (3 коммита)

| PR | Описание |
|---|---|
| #2988 | Incremental streaming updates via IPC (вместо полного массива) |
| #2987 | Improve chat responsiveness during streamed code output |
| #3035 | Batch and throttle IPC app output to prevent log flooding |

---

## 7. Багфиксы (23 коммита)

| PR | Описание |
|---|---|
| #3074 | Project hover visibility |
| #3098 | ContextFilesPicker dialog input focus |
| #3073 | View plan button not working |
| #3027 | Continuation retry uses user message instead of assistant prefill |
| #3044 | Retry transient local agent server errors |
| #3029 | Queued chat editing — link component selections & annotations |
| #2991 | 'nothing to commit' error — check staged changes first |
| #2983 | Error message handling in local agent responses |
| #2931 | Firing queued messages when in other chat |
| #2956 | Refresh user budget on pro deep link |
| #2910 | Handle branch deletion when branch doesn't exist locally |
| #2887 | Preview iframe URL error |
| #2912 | Prevent duplicate release notes checks |
| #2890 | Sanitize tool-call inputs (LiteLLM invalid dict) |
| #2859 | Block unsafe root-like delete_file paths |
| #2821 | Prevent supabase org credentials loss from stale settings |
| #2841 | Prevent concurrent file copying |
| #2853 | Local agent connection recovery |
| #2803 | Todo persistence regression |
| #2781 | Stable Monaco model path in file editor |
| #2771 | Hide Fix with AI button while streaming |
| #2707 | gitAdd skip .gitignored files |
| #2757 | Improving file attachment handling |
| #2877 | Improve terminated stream retry telemetry + bump retries to 3 |

---

## 8. AI-модели / Провайдеры (5 коммитов)

| PR | Описание |
|---|---|
| #2914 | Dynamic language model catalog support |
| #2876 | Propagate request id for OpenAI Response API (GPT 5.2) |
| #2812 | Bump @ai-sdk/openai to latest |
| #3103 | Remove Anthropic context-1m beta header |
| #2829 + #2797 | Supabase prompt update — execute_sql tool |

---

## 9. Телеметрия / PostHog (4 коммита)

| PR | Описание |
|---|---|
| #3063 | DyadError kinds + PostHog IPC exception filtering |
| #2886 | Capture uncaught IPC handler errors as PostHog exceptions |
| #3022 | Capture IPC exceptions in PostHog |
| #3024 | Filter retry 429 telemetry noise |

---

## 10. CI/CD / Инфраструктура (12 коммитов)

| PR | Описание |
|---|---|
| #3004 | Migrate workflow auth: PAT → GitHub App tokens |
| #2936 | Use GitHub App tokens in Claude workflows |
| #3087 + #3088 | GitHub security advisory alerts workflow |
| #3102 | Daily PR review alerts workflow |
| #2928 | Harden GitHub Actions workflow permissions |
| #2929 | Disable package manager cache in release workflow |
| #2915 | Cancel claude rebase when PR closes |
| #2896 | Homebrew paths for gh on self-hosted macOS runners |
| #2893 | Switch PR review runner to macOS ARM self-hosted |
| #2798 | Cap pr-review responder retries |
| #2955 | Promote-beta-to-stable skill |
| #2786 | Add-models skill |

---

## 11. E2E тесты / Deflake (4 коммита)

| PR | Описание |
|---|---|
| #2996 | Setup flow test reliability for Node.js detection |
| #2907 | Deflake partial_response.spec.ts |
| #2793 | Deflake attach_image + context_compaction |
| #2775 | Deflake github-import.spec.ts |

---

## 12. Рефакторинг (2 коммита)

| PR | Описание |
|---|---|
| #2783 | TokenBar display formatting refactor |
| #2780 | Remove `*` import, fix crash, refactor useParseRouter hook + tests |

---

## 13. Chore / Access / Авторизация ботов (9 коммитов)

| PR | Описание |
|---|---|
| #2963 | Add dyad-assistant to trusted author lists |
| #2899 | Add dyadbot to allowlists |
| #2894 | Add princeaden1 to PR review responder |
| #2882 | Allow wwwillchen-bot in claude PR review |
| #2810 | Update privileged authors |
| #3025 | Stop auto-adding cc request in pr-push |
| #2959 | Enable display_report + deterministic git push |
| #2930 | Remove merge-pr workflow |
| #2773 | Add cc:request label step to pr-push skill |
| #2888 | Make issue title updates more conservative (triage) |

---

## 14. Релизы (8 коммитов)

v0.37.0 → v0.38.0-beta.1 → v0.39.0-beta.1 → v0.39.0 → v0.40.0-beta.1 → v0.40.0 → v0.41.0-beta.1 → v0.41.0

---

## 15. Документация / Планирование (3 коммита)

| PR | Описание |
|---|---|
| #3065 | Empty-branch PR workflow note |
| #3068 | Neon integration plan update |
| #2801 | Web-fetch-local-agent implementation plan |

---

## Итоговая сводка

| Категория | Кол-во |
|---|---|
| Мультимедиа / Изображения | 7 |
| Web fetching | 2 |
| Планирование и аннотации | 3 |
| Голосовой ввод | 1 |
| Чат / UX фичи | 11 |
| Производительность | 3 |
| Багфиксы | 23 |
| AI-модели / Провайдеры | 5 |
| Телеметрия / PostHog | 4 |
| CI/CD / Инфра | 12 |
| E2E Deflake | 4 |
| Рефакторинг | 2 |
| Chore / Bots / Access | 9 |
| Релизы | 8 |
| Документация | 3 |
| **Итого** | **~100** |

---

## Главные эпики апстрима

1. **Мультимедиа-эпик** — генерация изображений, медиатека, визуальный редактор — полностью новая фича
2. **Web fetching tool** — новый инструмент для чата
3. **IPC streaming performance** — инкрементальные обновления вместо полных массивов
4. **Dynamic model catalog** — динамический каталог моделей (GPT 5.2 и др.)
5. **Planning system** — аннотатор планов + questionnaire
6. **CI/CD hardening** — переход с PAT на GitHub App tokens, hardened permissions, self-hosted runners
