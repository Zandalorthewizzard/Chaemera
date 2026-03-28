---
id: chaemera-sprint-2-interface-lock
title: Sprint 2 Interface Lock
type: artifact
status: active
tags: [sprint-2, interface, lock]
related: [[ownership-map.md], [../sprint-2-tauri2-bootstrap.md]]
depends_on: []
generated: false
source_of_truth: governance
outline: []
---

# Sprint 2 Interface Lock

## Locked Interfaces for Sprint 2

1. Renderer consumption shape stays stable for core bootstrap paths.
2. Existing IPC client function names remain available via compatibility layer.
3. Agent 1 cannot modify TypeScript bridge files owned by Agent 2.
4. Agent 3 cannot modify shell or bridge runtime code.
5. Slice agents do not update sprint documentation during active slice execution.
6. Test execution is postponed until all Sprint 2 slices are fully implemented.

## Allowed Change Under Lock

1. New adapter internals and plumbing that preserve public function names.
2. Additional tooling scripts that do not alter runtime contracts.

## Reopen Procedure

1. If lock must be broken, file handoff request and pause dependent slice.
