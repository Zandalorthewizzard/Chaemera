---
id: chaemera-discussion-tauri-release-cutover-vs-regression-2026-03-01
title: Tauri Release Cutover vs Wider Regression
type: discussion
status: historical
tags: [discussion, tauri, release, regression, sprint-11]
related:
  [
    [../discussion-template.md],
    [2026-02-23-tauri2-leptos-migration-strategy.md],
    [2026-03-01-help-bot-oss-equivalent-issue.md],
    [
      ../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md,
    ],
    [
      ../../04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md,
    ],
  ]
depends_on: [[../../01-concepts/discussion-first.md]]
generated: false
source_of_truth: discussion
outline: []
---

# Tauri Release Cutover vs Wider Regression

Historical notice:

1. This discussion records an earlier release-cutover framing during the migration period.
2. Keep it as migration history and reasoning context, not as the current release-line control discussion.

User request:

1. Copy the assistant response in full for later reading.

Copied assistant response:

Имею в виду пункты `2` и `3` из последних “следующих шагов”.

**2. Полноценный Tauri release cutover**
Это уже не про runtime-миграцию, а про выпуск приложения как продукта.

Что это значит practically:

1. Перестать считать Electron release основным.
2. Сделать `Tauri` главным путем сборки и публикации.
3. Либо удалить legacy Electron release сразу, либо оставить его как временный fallback, но уже вторичным.

Что сюда входит:

1. Перевести release pipeline с `.github/workflows/release.yml` на Tauri-first.
2. Решить подпись и notarization для Tauri-бандлов по платформам.
3. Переделать проверку release-артефактов из `scripts/verify-release-assets.js` под Tauri output.
4. Разобраться с автообновлением.

Почему автообновление здесь важно:

1. В `src/main.ts` все еще сидят `electron-squirrel-startup` и `update-electron-app`.
2. Это чисто Electron-специфичный хвост.
3. Пока он есть, “полный release cutover” честно не завершен.

То есть шаг `2` это примерно такой набор работ:

1. Ввести production-grade Tauri release workflow на базе preview workflow из `.github/workflows/release-tauri-preview.yml`.
2. Определить asset naming и release verification для Tauri.
3. Решить update story:
   - либо временно отключить auto-update в новом Tauri release,
   - либо внедрять Tauri updater отдельно.
4. После этого уже убирать/архивировать `.github/workflows/release.yml` и legacy `electron-forge` release path.

Почему это отдельный большой шаг:

1. Тут легко сломать не код приложения, а доставку приложения.
2. Это уже инфраструктурный cutover, а не просто “еще один IPC bridge”.

**3. Более широкий regression beyond `tauri-smoke`**
Это уже не новая миграция, а подтверждение, что мы не развалили систему после последних волн.

Что такое “шире, чем `tauri-smoke`”:

1. `tauri-smoke` проверяет только короткий Tauri path:
   - shell жив,
   - bridge жив,
   - ключевые route surfaces открываются.
2. Но он не покрывает большую часть реальных пользовательских сценариев.

Что сюда разумно включить:

1. Несколько ключевых Playwright сценариев по workspace:
   - открытие app
   - chat/workspace navigation
   - settings/themes/library/help routes
2. Проверки preview/workspace flows.
3. Несколько git/GitHub сценариев.
4. Возможно несколько app/chat CRUD сценариев, которые мы только что перенесли.
5. При необходимости выборочный `electron-regression`, пока legacy еще существует.

Что это даст:

1. Убедимся, что Tauri migration не просто “компилируется”.
2. Поймаем интеграционные регрессии до финального release cutover.
3. Получим реальную картину, где еще слабые места.

Но важный нюанс с учетом вашей цели:

1. Это не должен быть огромный тормозящий “full historical regression”.
2. Нужен именно milestone-level regression suite.
3. То есть короткий, но содержательный набор сценариев под текущее состояние миграции.

**Как я это вижу по приоритету**
Сейчас рациональнее так:

1. Сделать `3`, но в узком pragmatic варианте.
   Не весь древний E2E парк, а целевой milestone regression.
2. Потом идти в `2`.
   Потому что полноценный release cutover без такой проверки рискован.

Почему:

1. Packaging и release мы уже сильно подвинули.
2. Следующий большой риск теперь не “не хватает bridge”, а “что-то сломано на стыке”.
3. Лучше поймать это до замены release pipeline.

**Коротко**

1. `2` = сделать Tauri основным путем выпуска приложения.
2. `3` = доказать, что текущее migrated состояние реально живое на ключевых сценариях.
3. Я бы сначала сделал `3`, потом `2`.
