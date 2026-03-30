---
id: logos-docs-archive-map
title: Documentation Archive Map
type: navigation
status: active
tags: [navigation, archive, historical, superseded]
related:
  [
    [INDEX.md],
    [inventory.json],
    [../07-codex-logos-phase/README.md],
    [
      ../07-codex-logos-phase/2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md,
    ],
    [
      ../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md,
    ],
  ]
depends_on: []
generated: false
source_of_truth: navigation
outline: []
---

# Documentation Archive Map

## Purpose

- This file marks which older roadmap, sprint, and planning documents are still active, which are historical context only, and which were superseded by the post-audit release-line stance.
- It is an archive map, not a replacement for `INDEX.md`.

## Active Canonical Set

- `../07-codex-logos-phase/2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
- `../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md`
- `../07-codex-logos-phase/2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md`
- `../07-codex-logos-phase/2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
- `../07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md`
- `../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
- `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`

## Historical Or Superseded Planning Docs

### Superseded by the post-audit release-line consensus

- `../07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md`
  - kept as evidence of the stronger daemon-first planning stance before the completed legacy audit
  - read with the current `META-CONSENSUS` and 2026-03-30 audit docs alongside it
- `../04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  - useful as pre-audit release framing
  - superseded for current release-line runtime planning by the 2026-03-30 audit conclusions and legacy XML hardening plan
- `../04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`
  - useful as pre-pivot daemon architecture thinking
  - superseded in timing and sequencing by the later Codex/Logos lane and then the post-audit release-line correction

### Historical execution history

- `../04-sprint-workflow/sprints/README.md`
  - keep as the execution archive hub for older multi-agent sprint planning
- completed sprint files under `../04-sprint-workflow/sprints/`
  - keep as implementation history, not as active roadmap instructions
- `../04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md`
  - keep as a historical planning artifact from the earlier `single final cutover` assumption
  - do not treat it as the current release-line control document
- `../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md`
  - keep as the completed implementation-slice record for the extraction phase
  - do not treat it as the current release-line roadmap now that the first audit pass is complete
- `../04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md`
  - keep as the closed non-chat smoke-stage record
  - do not treat it as the active release control document for the current legacy chat-runtime finish work
- `../04-sprint-workflow/sprints/sprint-1-oss-detox.md`
  - keep as completed OSS-detachment execution history
  - do not treat it as an active sprint plan

### Historical discussions that still matter as context

- `../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md`
  - keep as the pre-audit runtime-state snapshot that led into the later audit conclusions
- `../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md`
  - keep as XML-surface discovery context behind the later dual-runtime and cut-line docs
- `../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md`
  - keep as earlier Codex-reference thinking before the current release-line consensus narrowed the timing and scope
- `../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md`
  - keep as early release-cutover framing and migration history, not as current release control
- `../05-discussion-templates/discussions/2026-03-01-upstream-patch-adaptation-workflow.md`
  - keep as historical process thinking from the earlier migration stage, not as a current execution driver
- `../05-discussion-templates/discussions/2026-02-23-orchestrator-glue-and-resilience.md`
  - keep as a historical autonomous-orchestrator discussion, not as part of the current release-line planning surface
- `../05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  - keep as the original migration-strategy discussion behind the later master plan, not as the current top-level release consensus

## Older Active Docs Intentionally Kept Active

- `../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md`
  - still useful as the broader migration frame while the refactor itself remains incomplete
- `../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
  - still active because it remains the main release-line migration plan for the legacy chat runtime
- `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
  - still active because it remains the canonical inventory of what the legacy runtime owns
- `../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
  - still active because it remains the most useful architectural reality-check for the current release-line bridge
- `../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md`
  - still active because it aligns with the current dual-runtime direction
- `../05-discussion-templates/discussions/2026-03-02-ts-rust-leptos-layer-boundaries.md`
  - still active as a cross-layer ownership guide while the refactor is unfinished
- `../05-discussion-templates/discussions/2026-03-01-leptos-ui-wrapper-baseline.md`
  - still active as a local UI wrapper guardrail where Leptos surface work remains relevant

## Reading Order For Current Work

1. `../07-codex-logos-phase/2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
2. `../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md`
3. `../07-codex-logos-phase/2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md`
4. `../04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md`
5. `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`

## Links

- [[INDEX.md]]
- [[inventory.json]]
- [[../07-codex-logos-phase/README.md]]
- [[../07-codex-logos-phase/2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
- [[../07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
