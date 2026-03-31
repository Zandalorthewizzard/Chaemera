---
id: logos-docs-progress
title: LOGOS Documentation Progress
type: utility
status: active
tags: [progress, changelog, logos]
related:
  [[validation.md], [inventory.json], [INDEX.md], [../07-logos-phase/README.md]]
depends_on: []
generated: false
source_of_truth: progress
outline: []
---

# LOGOS Documentation Progress

## 2026-03-31 GitHub Promotion Roadmap

1. Added `07-codex-logos-phase/2026-03-31-github-promotion-roadmap.md` as the public GitHub-shell roadmap for the release-line MVP.
2. Locked the current GitHub promotion stance as:

- GitHub is the primary public landing surface for the first MVP pass;
- the README and release page must lead with shipped `Tauri` plus `OSS-first` and `BYOK-first` reality;
- and future `Codex/Logos` work must stay visibly post-MVP.

3. Recorded the current public-surface audit:

- root `README.md` is still Dyad-branded;
- `CONTRIBUTING.md`, `SECURITY.md`, `CLA.md`, and the bug-report template still contain upstream Dyad identity or links;
- while `package.json` metadata and the Tauri release workflow are already Chaemera-owned anchors.

4. Updated `07-codex-logos-phase/README.md`, `00-navigation/INDEX.md`, `00-navigation/inventory.json`, and `00-navigation/validation.md` so the GitHub promotion roadmap is part of the active release-line guidance.

## 2026-03-31 Agent-Oriented MVP Release Cut Checklist

1. Added `07-codex-logos-phase/2026-03-31-agent-oriented-mvp-release-cut-checklist.md` as the agent-facing release-readiness workflow for the MVP cut.
2. Locked the operating rule that an agent must first record, classify, and separate failures before deciding whether to fix them immediately.
3. Made the triage stance explicit:

- first prove what works;
- mark blockers, non-blockers, and deferred work separately;
- and avoid derailing the MVP pass by solving every discovered problem on the spot.

4. Updated `07-codex-logos-phase/README.md`, `00-navigation/INDEX.md`, and `00-navigation/inventory.json` so the checklist is part of the active release-line guidance.

## 2026-03-31 Legacy XML MCP Heavy-Server Readiness Note

1. Added `07-codex-logos-phase/2026-03-31-legacy-xml-mcp-post-release-heavy-server-readiness.md` to record the current release-line position on `MCP` under the `Legacy XML` workflow.
2. Locked the current stance as:

- core `MCP` viability is proven enough for MVP;
- heavy operational servers such as `Vercel` and `Supabase` are not treated as an MVP blocker;
- and their validation belongs to a post-release scenario bucket.

3. Recorded the specific post-release risks worth testing:

- context-volume pressure,
- external-state drift,
- multi-step orchestration,
- and large-result shaping.

4. Updated `00-navigation/INDEX.md` and `00-navigation/inventory.json` so the new release-line discussion is discoverable from the active docs layer.

## 2026-03-31 Legacy XML Tag Namespace Migration Spec

1. Added `04-sprint-workflow/specs/2026-03-31-legacy-xml-tag-namespace-compatibility-migration-spec.md` as the detailed implementation spec for safely renaming legacy `dyad-*` XML tags to a Chaemera-owned namespace.
2. Locked the migration shape as `dual-read / new-write`:

- parser, renderer, executor, and clipboard keep accepting `dyad-*`;
- new build-mode emission moves to `chm-*`;
- no hard cut or historical transcript backfill is required for the first landing.

3. Recorded file-level implementation tasks across:

- prompt emission,
- XML parsing,
- execution,
- transcript rendering,
- clipboard/export,
- fixtures,
- and packaged regression verification.

4. Updated `00-navigation/INDEX.md`, `00-navigation/inventory.json`, and `00-navigation/validation.md` so the new spec is part of the active documentation layer instead of an orphaned task document.

## 2026-03-30 Release-Line MVP Roadmap

1. Added `07-codex-logos-phase/2026-03-30-release-line-mvp-roadmap.md` as the new execution roadmap from the completed runtime audit to the release-line MVP cut.
2. Locked the current MVP definition in docs as:

- ship-ready packaged Tauri,
- stable `Legacy XML` runtime,
- and `MCP` delivered as the final MVP workstream.

3. Recorded explicit `in scope` versus `out of scope` boundaries so `local-agent`, full Rust rewrite, and future `Codex/Logos` work do not silently reenter the release line.
4. Updated `07-codex-logos-phase/README.md`, `00-navigation/INDEX.md`, and `00-navigation/inventory.json` so the roadmap is part of the active canonical sequence.

## 2026-03-30 Docs Stabilization Pass

1. Added `00-navigation/archive-map.md` to classify current canonical docs versus historical or superseded roadmap and sprint artifacts.
2. Updated `00-navigation/INDEX.md` so the main entrypoint now points to:

- current canonical release-line documents,
- the archive map,
- and the older `07-codex-logos-phase` lane as retained context instead of silent split-brain.

3. Added the archive map and retained release-line documents back into `00-navigation/inventory.json` so the current nav layer can see both the active Logos lane and the audited legacy release-line lane.
4. Marked the most misleading pre-audit documents as historical or superseded in-place rather than moving files.
5. Extended the same historical labeling to the completed `non-chat smoke` checklist and the old `Phase 1 foundation` implementation slice so they remain readable as execution history without competing with the current post-audit release docs.
6. Extended the stabilization pass to older release-cutover discussions, XML-surface audit discussions, Codex-reference transfer planning, and the completed `Sprint 1` artifact so they now read as historical context instead of active control documents.
7. Added an explicit `Older Active Docs Intentionally Kept Active` section to `archive-map.md` so the remaining active migration and runtime documents are clearly justified rather than looking like missed cleanup.

## 2026-03-30

1. Bootstrapped `docs-new/` in LOGOS from Documentation System Pack v2.0.
2. Added project-level `AGENTS.md` and a `notes/` working-memory layer.
3. Added `docs-new/02-guides/working-notes.md` to formalize proactive agent notes.
4. Created `docs-new/07-logos-phase/` as the current architecture lane.
5. Distributed imported Logos planning docs from `input-docs-temp/` into the new doc system.
6. Added empty-context navigation meta-files for future agents.

## Deferred

1. Narrow imported working docs into smaller canonical specs as implementation advances.
2. Add deeper evidence-backed docs for persistence, resume, and tool-runtime extraction after research completes.
3. Revisit long-term folder placement for future provider-specific deep dives.

## Evidence

- path: `../../AGENTS.md`
  symbol: `LOGOS Agent Guide`
  lines: 1-200
- path: `../07-logos-phase/README.md`
  symbol: `LOGOS Architecture Phase Hub`
  lines: 1-200
- path: `../../notes/README.md`
  symbol: `Agent Working Notes`
  lines: 1-200

## Links

- [[validation.md]]
- [[inventory.json]]
- [[INDEX.md]]
- [[../07-logos-phase/README.md]]
