---
id: chaemera-guide-promotion-governance
title: Promotion Governance Principles
type: guide
status: draft
tags: [promotion, rollback]
related:
  [[operations/acceptance-testing.md], [operations/documentation-sync.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Promotion Governance Principles

1. Promotion is gated.
2. Rollback unit is explicit.
3. Artifacts are required (release descriptor, gate summary, acceptance report).
4. Conditional-pass outcomes must track follow-up tasks.

## Evidence

- path: `e2e-tests/README.md`
  symbol: `E2E expectations`
  lines: 1-220

## Links

- [[operations/acceptance-testing.md]]
- [[operations/documentation-sync.md]]
