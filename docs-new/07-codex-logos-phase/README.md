---
id: chaemera-codex-logos-phase-hub
title: Codex-Logos Phase Hub
type: hub
status: active
tags: [hub, codex, logos, daemon, roadmap]
related:
  [
    [../00-navigation/INDEX.md],
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
    [2026-03-30-release-line-mvp-roadmap.md],
    [2026-03-31-github-promotion-roadmap.md],
    [2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md],
    [2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
  ]
depends_on: [[../01-concepts/discussion-first.md]]
generated: false
source_of_truth: governance
outline: []
---

# Codex-Logos Phase Hub

This folder is the separated documentation layer for the new mainline architecture phase that begins on 2026-03-29.

It exists to keep three things cleanly separated:

1. mainline `Codex as-is headless daemon + Chaemera host/UI` work,
2. isolated legacy chat-runtime repair work on a separate feature branch,
3. historical pre-reset roadmap and post-release assumptions.

## Canonical Sequence

1. [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
2. [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
3. [[2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
4. [[2026-03-30-release-line-mvp-roadmap.md]]
5. [[2026-03-31-github-promotion-roadmap.md]]
6. [[2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md]]
7. [[2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
8. [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
9. [[2026-03-31-agent-oriented-mvp-release-cut-checklist.md]]

## Purpose

1. Lock the new architectural direction and roadmap.
2. Record the capability-audit matrix needed before daemon integration work starts.
3. Record the audit conclusions and Codex cut line after the first real Tauri runtime pass.
4. Define the release-line MVP execution sequence through packaged Tauri, legacy XML stabilization, and final `MCP` completion.
5. Define the GitHub-facing public shell and minimum promotion surfaces for the release-line MVP.
6. Define the shared-host plus mode-switch boundary for `Legacy XML` and `Codex/Logos`.
7. Define the release-line hardening plan for the legacy XML mode.
8. Record the chat UI reuse/orphan/delete inventory after the XML parser layer is removed.
9. Define the agent-facing release-cut and triage workflow for the MVP verdict.

## Links

- [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
- [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
- [[2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
- [[2026-03-30-release-line-mvp-roadmap.md]]
- [[2026-03-31-github-promotion-roadmap.md]]
- [[2026-03-30-dual-runtime-mode-shared-host-and-switch-boundary.md]]
- [[2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
- [[2026-03-31-agent-oriented-mvp-release-cut-checklist.md]]
- [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[../00-navigation/INDEX.md]]
- [[../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
- [[../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md]]
