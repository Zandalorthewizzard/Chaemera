---
id: chaemera-sprint-1-interface-lock
title: Sprint 1 Interface Lock
type: artifact
status: active
tags: [sprint-1, interface, lock]
related: [[ownership-map.md], [../sprint-1-oss-detox.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 1 Interface Lock

## Locked Interfaces for Sprint 1

1. Channel names and contract IDs in `src/ipc/types/**` remain stable.
2. Existing deep-link non-pro routes in `src/main.ts` must keep behavior:
   - `supabase-oauth-return`
   - `neon-oauth-return`
   - `add-mcp-server`
   - `add-prompt`
3. Only pro-specific paths may be removed/disabled.
4. Slice agents do not update sprint documentation during active slice execution.
5. Test execution is postponed until all Sprint 1 slices are fully implemented.

## Allowed Change Under Lock

1. Internal implementation changes that do not alter external contract names.
2. Removal of pro-only branches and endpoints.

## Reopen Procedure

1. If a lock must be broken, file handoff request and pause dependent slice.
