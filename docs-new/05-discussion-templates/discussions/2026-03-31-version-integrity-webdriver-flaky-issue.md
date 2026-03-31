---
id: chaemera-issue-version-integrity-webdriver-flaky-2026-03-31
title: Version Integrity Tauri Webdriver Coverage Is Flaky and Does Not Match Packaged User Flow
type: issue
status: open
tags: [issue, tauri, webdriver, version-history, release, testing]
related:
  [
    [../README.md],
    [../../07-codex-logos-phase/2026-03-30-release-line-mvp-roadmap.md],
    [../../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Version Integrity Tauri Webdriver Coverage Is Flaky and Does Not Match Packaged User Flow

## Description

1. `testing/tauri-webdriver/specs/version-integrity.e2e.mjs` currently produces false negatives and is no longer trusted as a blocking runtime signal.
2. The automated scenario performs external git mutations and then expects the UI automation path to reflect version state in a way that does not consistently match packaged user behavior.
3. The spec is now classified as `manual/unstable` coverage and excluded from the default runtime suite.

## Discovery Context

1. The issue surfaced while widening MCP-adjacent runtime verification after the worker-path MCP fixes were already green.
2. The rest of the default Tauri webdriver runtime suite passed, which narrowed the red signal to this single spec rather than a broader release-line regression.
3. A later packaged manual smoke pass confirmed normal Version History behavior on the real `.exe` path, including imported seed versions, externally created commits, and AI-created file versions.

## Impact

1. Leaving this spec in the default suite creates release-noise and can misclassify a healthy build as broken.
2. The current automated scenario obscures the distinction between a real Version History product bug and a test harness synchronization problem.
3. Release readiness should continue to rely on the packaged manual signal until the automated path is rewritten to reflect real user navigation and refresh behavior.

## Proposed Resolution

1. Keep `version-integrity.e2e.mjs` out of the blocking default runtime suite.
2. Treat the current test as manual or exploratory coverage only until it is rewritten.
3. Rewrite the automation path later so it mirrors the packaged manual flow more closely:
   - import through the same supported path,
   - open the versions UI through the real user surface,
   - distinguish stale header-count behavior from stale version-list behavior,
   - and assert only on behavior that is stable in packaged usage.
4. Decide separately whether header-count staleness before opening the versions UI is acceptable UX or should receive explicit invalidation logic.

## Decision Status

1. Status: `OPEN`
2. Current disposition: non-blocking release follow-up.
3. The packaged release path remains acceptable for MVP because manual verification shows Version History working in normal usage.

## Evidence

- path: `testing/tauri-webdriver/run-suite.mjs`
  symbol: `Manual/unstable version-integrity exclusion from default runtime suite`
  lines: 47-56
- path: `testing/tauri-webdriver/specs/version-integrity.e2e.mjs`
  symbol: `Spec-level note that this coverage is manual/unstable only`
  lines: 13-17
- path: `notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md`
  symbol: `2026-03-31 packaged Version History smoke result`
  lines: 56-72
- path: `docs-new/07-codex-logos-phase/2026-03-30-release-line-mvp-roadmap.md`
  symbol: `Phase 5 MVP cut and release readiness review`
  lines: 217-226

## Links

- [[../README.md]]
- [[../../07-codex-logos-phase/2026-03-30-release-line-mvp-roadmap.md]]
- [[../../../notes/2026-03-30-phase-4-mcp-runtime-verification-notes.md]]
