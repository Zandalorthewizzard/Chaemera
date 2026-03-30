# Context

This note is the continuity pack for the ongoing discussion about the release-line Tauri chat runtime architecture.

It exists because the current discussion has already gone beyond a simple implementation thread and now includes:

1. architectural critique of the Electron-era build-mode runtime,
2. evaluation of the Phase 1/2/3 migration work,
3. tradeoff analysis between:
   - continuing the current direction,
   - writing a narrower Tauri-native runtime,
   - or attempting a full Rust rewrite,
4. explicit alignment with the longer-term `Logos` / daemon-core direction.

This note is non-canonical working memory.
Canonical architecture and scope conclusions live in `docs-new/`.

# Raw Transcript Archive

The original saved transcript from the desktop is preserved here:

- [2026-03-29-chat-runtime-architecture-chatlog.txt](/C:/Work/proj/Chaemera/notes/artifacts/2026-03-29-chat-runtime-architecture-chatlog.txt)

The archive is a raw copy of the user's file and may display mojibake if opened with the wrong encoding.
It is kept as a byte-preserving artifact, not as the canonical readable summary.

# Canonical Docs To Read First

1. [Tauri Chat Runtime Migration Plan](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-migration-plan.md)
2. [Tauri Chat Runtime Phase 1 Foundation Spec](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-tauri-chat-runtime-phase-1-foundation-spec.md)
3. [Tauri Chat Runtime Layer Reality Check](/C:/Work/proj/Chaemera/docs-new/05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md)
4. [Chat Runtime Service Layer Scope and Boundaries](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md)
5. [Current AI Runtime State](/C:/Work/proj/Chaemera/docs-new/05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md)
6. [Post-Release Agent Core Boundary and Host-Daemon Architecture](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md)

# What Was Settled In This Discussion

1. The current `build-mode` chat runtime should be treated as a legacy release-line runtime, not as the foundation of the future system.
2. The future direction remains aligned with the post-release daemon/core line and the `Logos` trajectory.
3. The current migration work is not a clean one-step inheritance story.
4. The honest description of the current result is:
   - reused TypeScript AI/runtime brain
   - plus rebuilt execution shell around it for Tauri
5. The old pain is not mostly about isolated Electron APIs.
6. The real problem is that the historical runtime was a thick Electron main-process orchestration monolith.
7. `Node worker` in the current slice is a transitional survival mechanism, not proof of a desirable long-term architecture.

# Phase Verdicts

## Phase 1

Keep conceptually.

Why:

1. It extracted the runtime boundary out of `chat_stream_handlers.ts`.
2. It clarified real scope and ownership boundaries.
3. It is useful even if the eventual runtime implementation pivots.

Interpretation:

- real progress
- not wasted work
- not necessarily a forever production layer

## Phase 2

Treat as transitional and disposable if the architecture pivots.

Why:

1. It created a worker shell around the legacy runtime.
2. That shell is useful for a release-line bridge.
3. It should not be confused with the future daemon/core architecture.

Interpretation:

- acceptable as a bridge
- not a strategic foundation
- a likely throwaway if a narrower Tauri-native runtime is chosen

## Phase 3

Partially reusable in ideas, not necessarily in final code.

What still matters:

1. host authority
2. session ownership
3. cancel semantics
4. consent routing
5. event authority at the host layer

What should not be overvalued:

1. current host code as proof that the architecture is right
2. the idea that a Rust host around the legacy worker shell is a long-term answer

# Scope Already Confirmed Inside This Slice

The current runtime slice contains more than prompt streaming.

Confirmed scope includes:

1. user and assistant message persistence
2. placeholder assistant lifecycle
3. `redo`
4. attachments
5. selected components and codebase context
6. prompt assembly and model/settings resolution
7. BYOK provider invocation
8. canned test-response path
9. streaming chunk updates
10. XML cleanup
11. continuation and repair loops
12. auto-fix loops
13. local-agent hooks
14. MCP hooks and consent boundary
15. completion metadata
16. worker protocol and worker session management
17. Rust/Tauri host supervision
18. build and packaging wiring

# Honest Technical Conclusions Reached

1. Continuing the current direction is still the shortest path to a working release-line chat.
2. It is not the cleanest path.
3. A full Rust rewrite of the current build-mode behavior is likely the worst option:
   - too much hidden behavior
   - too much migration risk
   - too much duplicated effort for a legacy layer
4. A narrower Tauri-native runtime is more attractive for long-term sanity than continuing to invest in the current bridge stack.
5. Confidence that the current path can be finished without heavy integration turbulence is not high enough to claim safety.

# The User's Strategic Concerns That Must Be Preserved

These concerns were stated or strongly implied and must remain visible in later discussion:

1. The current release-line legacy runtime should not accidentally become the foundation of the future architecture.
2. The team is intentionally moving toward a future daemon/core line rather than preserving this old XML-heavy runtime forever.
3. The user is dissatisfied with the current direction and wants more discussion before accepting another implementation push.
4. The user specifically challenged whether continuing this migration still makes sense once the layer is understood as legacy.

# Current Open Questions

1. Should the team continue the current release-line migration at all, or freeze it and pivot to a different Tauri-native runtime strategy?
2. If the current line continues, what is the minimum acceptable ship-state before stopping further investment?
3. If the team pivots, which parts of Phase 1/2/3 are kept only as:
   - lessons,
   - reference code,
   - or temporary compatibility scaffolding?
4. How narrow can a Tauri-native release-line chat runtime be while still satisfying MVP expectations?
5. What exact boundary should separate:
   - legacy release-line chat runtime work,
   - and post-release daemon/core work?

# Recommended Resume Order For The Next Discussion

1. Read the canonical discussion:
   - [Tauri Chat Runtime Layer Reality Check](/C:/Work/proj/Chaemera/docs-new/05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md)
2. Read the canonical scope inventory:
   - [Chat Runtime Service Layer Scope and Boundaries](/C:/Work/proj/Chaemera/docs-new/04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md)
3. Read the raw transcript archive if nuance or exact wording matters:
   - [2026-03-29-chat-runtime-architecture-chatlog.txt](/C:/Work/proj/Chaemera/notes/artifacts/2026-03-29-chat-runtime-architecture-chatlog.txt)
4. Only after that, write a new decision/spec for the next direction.

# Resume Point

The next good artifact is not another implementation task yet.

The next good artifact should be a new strict decision/spec that answers:

1. whether the current release-line migration continues,
2. whether the team pivots to a narrower Tauri-native runtime,
3. what parts of Phase 1/2/3 are kept,
4. what parts are frozen as legacy and no longer strategically improved.
