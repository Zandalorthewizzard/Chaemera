---
id: chaemera-discussion-ts-rust-leptos-layer-boundaries-2026-03-02
title: TypeScript, Rust, and Leptos Layer Boundaries
type: discussion
status: active
tags: [discussion, architecture, typescript, rust, leptos, tauri]
related:
  [
    [../discussion-template.md],
    [2026-02-23-tauri2-leptos-migration-strategy.md],
    [2026-03-01-leptos-ui-wrapper-baseline.md],
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

# TypeScript, Rust, and Leptos Layer Boundaries

1. Context

- Chaemera is actively removing Electron as the required desktop runtime.
- During this migration, a large amount of logic still remains in TypeScript.
- This is expected and should be treated as an architectural choice, not as evidence that the migration is conceptually off track.
- The target architecture is not "rewrite everything in Rust".
- The target architecture is:
  - `Tauri` as the desktop runtime and native shell,
  - `Leptos` as the target UI framework,
  - `Rust` for native/runtime responsibilities,
  - `TypeScript` kept where it remains pragmatic and does not block the cutover.

2. Problem

- It is easy to confuse three separate goals:
  1. removing Electron,
  2. introducing Tauri,
  3. reducing TypeScript.
- These are related, but not identical.
- If we incorrectly optimize for "remove all TS", we risk an unnecessary rewrite that slows the migration and increases breakage.
- If we keep too much desktop-critical logic in legacy Electron-only TypeScript, then the cutover is incomplete even if the UI still works.

3. Goals

- Clarify which parts of the system can remain in TypeScript without undermining the migration.
- Clarify which parts should move to Rust/Tauri because they are runtime or native-shell responsibilities.
- Clarify which parts should move into Leptos because they are target UI responsibilities.
- Preserve a pragmatic migration rule:
  - move what must move for the new stack,
  - do not rewrite everything merely for language purity.

4. Alternatives

1. Full Rust rewrite

- Pro: maximum language unification.
- Con: very expensive, high-risk, and not required for product parity.

2. Keep most logic in TypeScript indefinitely

- Pro: fastest short-term path.
- Con: risks leaving native/runtime responsibilities in the wrong layer and diluting the Tauri cutover.

3. Layered migration by responsibility (selected)

- Pro: moves the desktop-critical and UI-critical boundaries first while keeping pragmatic TS where appropriate.
- Con: temporary mixed-language architecture must be documented and consciously managed.

5. Decision

- Electron is being removed faster than TypeScript.
- This is intentional.
- The migration is judged primarily by whether Electron remains a required foundation, not by how much TypeScript still exists.
- TypeScript is allowed to remain where it is still the most practical implementation layer.

  5.1. What should remain acceptable in TypeScript

These are good candidates to remain in TS for now, and some may remain there long-term:

1. renderer-side transition logic

- temporary compatibility wrappers
- route composition
- existing hooks and query orchestration

2. shared product logic that is not desktop-native

- formatting
- validation
- prompt assembly helpers
- non-native business rules

3. preview-side and web-facing logic

- iframe orchestration
- browser-side preview UI behavior
- web tooling glue

4. test and harness layers

- Playwright
- Vitest
- smoke harness logic

5. workers and TS-native build tooling where there is no strong reason to port them immediately

5.2. What should preferentially move to Rust / Tauri

These are the layers where keeping Electron-era TS as the authority would weaken the migration:

1. desktop runtime commands

- file system operations
- process control
- app runtime lifecycle
- native dialogs
- OS integration

2. app/workspace data operations that must be enforced at the native boundary

- app CRUD
- chat CRUD
- git operations
- integration-bound mutations

3. native shell responsibilities

- protocol handling
- packaging
- release runtime
- updater direction
- platform bundle behavior

4. any transport or privileged behavior previously owned by Electron main/preload

5.3. What should move into Leptos

These are the layers that belong in the target UI framework:

1. route shells and page structure
2. reusable UI primitives and component wrappers
3. target workspace surfaces as React compatibility layers are retired
4. long-term UI composition for settings, library, chat, app details, preview chrome, and related product surfaces

5.4. What should explicitly disappear with Electron

These are not "keep in TS" items. These are legacy Electron-specific responsibilities that should be removed or isolated away:

1. `electron-forge` as the primary packaging path
2. Electron main/preload as the required runtime foundation
3. `update-electron-app`
4. `electron-squirrel-startup`
5. Electron IPC as the primary desktop transport

5.5. Practical migration rule

Use this rule when deciding whether to port or keep a piece of code:

1. If it is desktop-native, privileged, or packaging/runtime critical:

- move it to Rust/Tauri.

2. If it is target UI composition:

- move it to Leptos.

3. If it is product logic, browser-oriented logic, harness logic, or temporary compatibility glue:

- TS is acceptable unless it blocks the cutover.

  5.6. Recommended evaluation lens

The important question is not:

- "How much TypeScript is left?"

The important question is:

- "Does Electron still remain a required architectural foundation?"

If the answer trends toward "no", the migration is structurally succeeding even while TS still exists in large parts of the codebase.

5.7. Practical performance and footprint expectations

1. What Tauri gives

- The main expected gain comes from removing Electron as the required desktop runtime, not from rewriting every remaining TypeScript file.
- The most likely wins are:
  - smaller packaged desktop artifacts,
  - lower idle RAM,
  - fewer background runtime processes,
  - better startup behavior,
  - a tighter native and privileged boundary.
- The biggest structural gain is architectural: Electron stops being the mandatory foundation for file system, process, protocol, git, and packaging responsibilities.

2. What Leptos gives

- Leptos is useful in this migration, but it should be understood as a moderate UI/runtime improvement rather than a magic performance switch.
- The strongest benefits are:
  - lower long-term UI runtime overhead for route and page composition,
  - a cleaner target stack aligned with Tauri,
  - removal of React compatibility debt over time,
  - a better foundation for the post-migration UI redesign track.
- In practice, Leptos is most valuable for route shells, page structure, reusable primitives, settings/library/chat chrome, and other long-lived product surfaces.

3. What gives almost no immediate gain

- Browser-heavy surfaces will not improve dramatically merely because the desktop shell changed.
- The weakest immediate gain areas are:
  - iframe-driven preview behavior,
  - Monaco and editor-heavy surfaces,
  - browser-only tooling glue,
  - network-bound integration calls,
  - any path still dominated by third-party JS libraries or WebView cost.
- These areas may still benefit later from cleanup, but not primarily from the Electron-to-Tauri cutover itself.

4. What still must be measured after the first full Tauri release build

- Exact packaged-size reduction remains `UNKNOWN` until a full Tauri desktop bundle exists that is comparable to the current Electron packaging output.
- Exact RAM reduction also remains `UNKNOWN` until apples-to-apples runtime measurements are taken.
- The first reliable comparison pass should measure:
  - packaged installer/bundle size,
  - unpacked app size,
  - idle RAM,
  - startup RAM,
  - process count,
  - cold and warm startup time,
  - memory and CPU with workspace, preview, chat, and git/integration flows active.
- Until those measurements exist, the current performance expectation is directional and architectural, not numerically locked.

6. Unknown / Deferred

1. How much renderer-side React compatibility code should be kept after the first full Leptos body cutover remains to be decided.
1. Whether some shared TS business logic should later be moved to Rust for stronger native guarantees remains a secondary optimization question.
1. The exact long-term split between Leptos-owned UI state and remaining TS helper layers should be revisited after the final Electron release path is retired.

## Evidence

- path: `package.json`
  symbol: `Scripts and product metadata`
  lines: 1-220
- path: `src-tauri/Cargo.toml`
  symbol: `Tauri crate and Rust runtime dependencies`
  lines: 1-220
- path: `src-tauri/src/lib.rs`
  symbol: `Registered Tauri command surface`
  lines: 1-260
- path: `src/main.ts`
  symbol: `Remaining Electron runtime responsibilities`
  lines: 1-220
- path: `src/routes/home.tsx`
  symbol: `Leptos route-shell cut-in example`
  lines: 1-120
- path: `src/routes/chat.tsx`
  symbol: `Leptos core route-shell example`
  lines: 1-120
- path: `src/routes/app-details.tsx`
  symbol: `Leptos app-details route-shell example`
  lines: 1-160
- path: `src/components/preview_panel/PreviewIframe.tsx`
  symbol: `Preview/browser-side compatibility logic`
  lines: 1-220
- path: `playwright.config.ts`
  symbol: `Playwright smoke and regression harness`
  lines: 1-220
- path: `docs-new/05-discussion-templates/discussions/2026-02-23-tauri2-leptos-migration-strategy.md`
  symbol: `Migration strategy discussion`
  lines: 1-260

## Links

- [[../discussion-template.md]]
- [[2026-02-23-tauri2-leptos-migration-strategy.md]]
- [[2026-03-01-leptos-ui-wrapper-baseline.md]]
- [[../../04-sprint-workflow/specs/2026-02-23-tauri2-leptos-migration-master-plan.md]]
- [[../../04-sprint-workflow/sprints/sprint-11-final-cutover-and-electron-cleanup.md]]
