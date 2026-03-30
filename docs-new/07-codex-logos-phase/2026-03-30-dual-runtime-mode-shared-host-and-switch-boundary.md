---
id: chaemera-spec-dual-runtime-mode-shared-host-and-switch-boundary-2026-03-30
title: Dual Runtime Mode Shared Host and Switch Boundary
type: spec
status: active
tags: [spec, codex, logos, legacy, xml, runtime, settings, boundary]
related:
  [
    [README.md],
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
    [2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Dual Runtime Mode Shared Host and Switch Boundary

1. Start Here

- This document defines how `Legacy XML` and `Codex/Logos` can coexist as alternate runtime modes in one desktop app.
- The main requirement is to keep one Chaemera host/UI shell while preventing the runtime split from leaking across the entire renderer.
- The mode switch must happen at one narrow runtime gateway, not as many small conditionals spread through chat UI, routing, and app shell code.

2. Intent + Non-goals

- Intent:
  - define what remains shared between the two modes;
  - define the exact boundary where runtime mode dispatch should happen;
  - prevent the Codex/Logos integration from inheriting XML-era coupling by accident.
- Non-goals:
  - no requirement that both modes share the same internal persistence implementation;
  - no requirement that both modes share the same raw event grammar internally;
  - no requirement to keep XML parser semantics in the Codex/Logos lane.

3. Target Outcome

- The desktop shell stays unified.
- Users can choose a runtime mode in settings.
- Chat UI talks to one normalized session-facing adapter.
- Under that adapter, runtime work is dispatched to either:
  - the legacy XML host/worker runtime,
  - or the new Codex/Logos daemon adapter.

4. Locked Decisions

1. One app, two runtime modes, one shared host/UI shell.
1. The runtime mode switch lives at the session execution gateway, not in `ChatPanel`, `ChatInput`, or route components.
1. `selectedChatMode` remains a legacy-mode concern and must not become the global selector for `Legacy XML` vs `Codex/Logos`.
1. Add a separate top-level runtime setting for mode selection, e.g. `agentRuntimeMode: legacy-xml | codex-logos`.
1. The shared renderer contract should be normalized enough that transcript shells, routing, and app shell state do not care which backend produced the session.
1. XML parsing remains isolated to the legacy assistant-body rendering path.

1. What Stays Shared Between Legacy XML and Codex/Logos

These surfaces should remain common host/UI infrastructure.

### 5.1. Desktop shell and route-level state

- app selection and selected-app state
- route entry and deep-link behavior
- `home`, `chat`, and `app-details` shell structure
- `Open in Chat` and imported-app landing behavior

### 5.2. Chat shell and operator surfaces

- `ChatPanel`
- `MessagesList`
- `ChatInput` compose shell
- attachments UI and pending-file UX
- selected-component UI
- version pane and preview shell
- chat history shell and tab management

### 5.3. Settings and persistent user preference infrastructure

- settings fetch and update flow
- search, storage, and hydration of user settings
- runtime-mode selection setting itself
- provider or model setup UI where still relevant to the selected backend

### 5.4. Shared event-facing UI surfaces

- transcript shell for user and assistant messages
- error strip and completion notifications
- consent UI surfaces
- token/context UI only if fed from a normalized adapter event
- generic tool/status/todo surfaces only if the new runtime emits structured equivalents

### 5.5. App-aware host capabilities

- import and app-root handling
- preview/app run-stop-restart shell
- app console shell
- version/history shell
- existing app/integration metadata surfaces

6. Where The Mode Switch Should Happen

The switch should happen in one dedicated session gateway immediately below the renderer-facing chat submission layer.

### 6.1. Recommended boundary

- `useStreamChat` should submit to one runtime gateway interface.
- That gateway chooses the backend implementation based on `agentRuntimeMode`.
- The gateway returns normalized stream/session events back to the existing chat UI state layer.

Recommended shape:

1. `ChatInput` and `HomeChatInput` remain mostly unaware of the backend.
2. `useStreamChat` targets one adapter-facing runtime API.
3. The runtime gateway dispatches to:

- `legacyXmlRuntimeAdapter`
- or `codexLogosRuntimeAdapter`

4. Each adapter converts its internal transport/events into one shared UI session model.

### 6.2. Where the switch should not happen

- not in route components like `src/pages/home.tsx` or `src/pages/chat.tsx`
- not inside `ChatPanel`
- not inside `MessagesList`
- not by sprinkling runtime checks across every `ipc.*` caller
- not inside XML parser components

### 6.3. Assistant-body rendering split

- the transcript shell stays shared
- assistant body rendering may branch one layer lower:

- legacy mode -> XML-aware parser path
- Codex/Logos mode -> structured event plus plain markdown renderer

- this is a presentation adapter split, not the primary mode-switch boundary

7. Recommended Adapter Contract

The shared host/UI layer should normalize around these concepts:

1. session start
2. message delta or transcript update
3. completion
4. error
5. cancel acknowledgement
6. approval request and resolution
7. optional task or tool activity events
8. optional context/token updates

This contract should be rich enough for both modes to project into the same UI shell while leaving XML-specific parsing behind the legacy adapter.

8. Requirement -> Task -> Test -> Gate

1. Requirement: two runtimes must not fork the desktop into two apps.

- Task: keep one shared host/UI shell and route-level state model.
- Test: the same `home`, `chat`, and `app-details` shell works regardless of runtime mode.
- Gate: runtime choice changes behavior, not app structure.

2. Requirement: the mode switch must stay narrow.

- Task: add one runtime gateway below `useStreamChat`.
- Test: mode-specific logic is concentrated in adapters instead of widespread renderer conditionals.
- Gate: backend swap point is explicit and reviewable.

3. Requirement: Codex/Logos must not inherit XML-era control-plane coupling.

- Task: isolate XML parser/render behavior to the legacy adapter path.
- Test: Codex/Logos path does not depend on `ActionMarkdownParser` or Dyad custom-tag parsing as transport truth.
- Gate: XML is not the default shared contract.

9. Acceptance and Tests

- This document is accepted when:
  - the shared host/UI list is fixed,
  - the switch boundary is fixed,
  - and the banned split points are explicit.
- Future implementation specs should fail review if they place the runtime split above the session gateway or let XML semantics leak into the Codex/Logos default path.

10. Promotion Artifacts

- host/daemon boundary spec
- first runtime gateway implementation spec
- structured event adapter spec for assistant-body rendering

11. Risks and Rollback

- Risks:
  - mode checks spread through the renderer;
  - settings and chat-mode concepts get conflated;
  - the Codex/Logos path inherits XML parser coupling by convenience.
- Rollback:
  - keep the switch at one gateway;
  - treat renderer-wide mode branching as a design failure;
  - keep XML rendering and remediation strictly behind the legacy adapter.

12. Agent Guardrails

- Do not use `selectedChatMode` as the top-level runtime selector.
- Do not place backend branching in every chat UI component.
- Do not require the Codex/Logos path to emit XML or fake XML for parity.

## Evidence

- path: `../../src/components/ChatPanel.tsx`
  symbol: `Shared chat shell with header, transcript, error strip, input placement, and version pane`
  lines: 11-24, 31-226
- path: `../../src/components/chat/ChatInput.tsx`
  symbol: `Shared compose shell including attachments, consent banner, todo list, context, token bar, and queue behavior`
  lines: 23-117, 144-185
- path: `../../src/components/chat/ChatMessage.tsx`
  symbol: `Shared message shell with XML-aware assistant body rendering currently isolated in ActionMarkdownParser`
  lines: 1-18, 86-177
- path: `../../src/hooks/useSettings.ts`
  symbol: `Shared settings fetch and update infrastructure`
  lines: 24-100
- path: `../../src/main/settings.ts`
  symbol: `Current default settings including selectedChatMode as a separate concept from any future top-level runtime mode`
  lines: 22-46, 71-80
- path: `../../src/ipc/types/chat.ts`
  symbol: `Current shared chat stream contract centered on chatId-keyed chunk, end, and error events`
  lines: 232-301
- path: `../../src/pages/home.tsx`
  symbol: `Shared route and app-landing behavior already independent of runtime engine details`
  lines: 132-199
- path: `2026-03-29-chat-ui-post-xml-surface-inventory.md`
  symbol: `Keep vs adapter vs delete-candidate inventory for chat UI surfaces`
  lines: 43-199
- path: `2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`
  symbol: `Audit conclusion that host shell survives while runtime brain is replaceable`
  lines: 188-217

## Links

- [[README.md]]
- [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
- [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md]]
- [[2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md]]
- [[../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md]]
