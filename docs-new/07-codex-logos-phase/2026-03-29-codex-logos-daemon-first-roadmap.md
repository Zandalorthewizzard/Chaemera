---
id: chaemera-spec-codex-logos-daemon-first-roadmap-2026-03-29
title: Codex-Logos Daemon-First Roadmap
type: spec
status: historical
tags: [spec, roadmap, codex, logos, daemon, opencode, architecture]
related:
  [
    [README.md],
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [2026-03-29-chat-ui-post-xml-surface-inventory.md],
    [../03-templates/strict-spec.template.md],
    [
      ../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md,
    ],
    [
      ../04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md,
    ],
    [
      ../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md,
    ],
  ]
depends_on:
  [
    [../01-concepts/discussion-first.md],
    [
      ../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
    [
      ../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Codex-Logos Daemon-First Roadmap

1. Start Here

- Historical notice:
  - this document records the stronger daemon-first planning stance from before the completed legacy runtime audit changed the release-line priority;
  - it is retained as important historical context, not as the current project-level consensus;
  - read it together with `docs-new/07-codex-logos-phase/2026-03-30-legacy-chat-runtime-audit-conclusions-and-codex-cut-line.md`, `docs-new/07-codex-logos-phase/2026-03-30-legacy-xml-release-mode-hardening-and-rust-reliability-plan.md`, and the `META-CONSENSUS` section in `AGENTS.md`.
- This document is the canonical roadmap for the new mainline architecture phase beginning on 2026-03-29.
- It supersedes the older assumption that the agent daemon and Codex-derived runtime are strictly `post-release only`.
- The mainline architecture is now:
  - `Codex core taken as-is`
  - `run headless as a daemon`
  - `Chaemera remains the desktop host, app-aware shell, and primary UI`
- Legacy chat-runtime repair remains active only on a separate feature branch and is not the new mainline architecture path.
- OpenCode Desktop is the explicit inspiration reference for topology:
  - server plus clients,
  - desktop as a host/UI surface,
  - and client attachment to an existing headless server.

2. Intent + Non-goals

- Intent:
  - establish a new mainline documentation lane for `Codex as-is daemon + Chaemera host/UI`;
  - separate that lane from legacy XML/chat-runtime rescue work;
  - author the audit and UI-inventory artifacts needed before daemon implementation begins;
  - keep OpenCode explicit as a topology reference for inspiration, not as a hidden assumption.
- Non-goals:
  - no attempt to rescue the legacy XML runtime as the new default architecture;
  - no attempt to cut apart or partially re-implement the Codex core before the host boundary is understood;
  - no assumption that the legacy repair branch must merge into main or into release planning;
  - no requirement to expose every Codex feature in the first Chaemera daemon wave;
  - no provider-expansion program in the first architecture wave beyond what is needed to validate the daemon path.

3. Target Outcome

- Chaemera gets a new mainline architecture lane centered on a headless Codex daemon.
- Documentation is split clearly enough that mainline daemon work and legacy runtime repair no longer share one roadmap.
- The repository has a canonical capability-audit matrix for the current legacy chat-runtime slice.
- The repository has a canonical chat UI inventory that shows:
  - what survives the XML parser removal,
  - what can be reused with a structured-event adapter,
  - and what becomes delete-candidate debris.
- Branching strategy is explicit before implementation begins.

4. Locked Decisions

1. The new mainline architecture begins now, not after the legacy runtime release line is resolved.
1. Codex is taken as-is as the core runtime and is intended to run headless as a daemon.
1. Chaemera is the primary desktop host and UI, not a thin TUI wrapper and not a Codex CLI skin.
1. OpenCode Desktop is the explicit inspiration reference for server-desktop topology and client attachment.
1. Using only a subset of Codex capabilities is acceptable; cutting apart the core before host boundaries are specified is not the starting assumption.
1. Legacy chat-runtime repair remains isolated on a separate feature branch and is not an implicit gate for mainline daemon work.
1. The XML parser/tag pipeline is no longer the architectural center of gravity for mainline work.
1. Existing host surfaces that already work in Chaemera should be reused where possible:

- preview,
- app lifecycle,
- console/log surfaces,
- import and app-path handling,
- existing integrations,
- and desktop-native commands.

9. The first daemon wave may be narrower in provider support than the long-term product direction, as long as the limitation is explicit and temporary.
10. Historical roadmap/spec documents remain in the repo as historical evidence, but they are no longer the active mainline architecture source of truth.

11. Architecture Fit

- The current release-line blocker is the legacy chat-runtime execution slice, not the whole desktop shell.
- The repository already has working host-side surfaces for:
  - app selection and app-root resolution,
  - app run/stop/restart,
  - preview and proxy URLs,
  - app console output,
  - import and absolute-path handling,
  - and integration-linked app metadata.
- The new mainline roadmap therefore does not start from "rebuild the whole desktop".
- It starts from:
  - keep the host shell,
  - replace the runtime brain/control plane,
  - and specify the boundary so the host can talk to a headless Codex daemon cleanly.

6. External References

- OpenCode Server docs:
  - `https://opencode.ai/docs/server/`
- OpenCode Troubleshooting docs:
  - `https://opencode.ai/docs/troubleshooting/`
- OpenCode SDK docs:
  - `https://opencode.ai/docs/sdk/`
- These references are used for topology inspiration only:
  - headless server,
  - client-only attachment,
  - desktop around a server boundary.
- They are not the source of truth for Chaemera runtime behavior.

7. Implementation Tasks (ordered)

1. Establish the new docs lane.

- Keep new daemon-first artifacts under `docs-new/07-codex-logos-phase/`.
- Mark older roadmap/architecture docs as historical or superseded where they would otherwise create split-brain planning.

2. Finish the legacy chat-runtime capability audit.

- Use the current runtime scope inventory as the audit source.
- Compare the old known-good packaged Tauri baseline against the current branch.
- Record capability status and the likely Codex-lane disposition of each capability.

3. Finish the chat UI post-XML surface inventory.

- Record which chat UI surfaces are:
  - reusable almost unchanged,
  - reusable with an adapter,
  - or delete candidates after XML parser removal.

4. Author the Codex host/daemon boundary spec.

- Lock session model, event model, approval routing, and host capability gateway expectations before implementation.

5. Author the terminal and console separation spec.

- Keep `Agent Terminal` and `App Console` as distinct architectural surfaces.

6. Author the first daemon integration slice spec.

- Narrow the first implementation slice before any code work:
  - server startup/attachment,
  - session bootstrap,
  - event streaming,
  - approvals,
  - and minimal usable tool surface.

7. Freeze the current repository state before branch divergence.

- Suggested immutable checkpoint tag:
  - `checkpoint-2026-03-29-pre-codex-logos-pivot`
- Suggested checkpoint branch:
  - `checkpoint/2026-03-29-pre-codex-logos-pivot`

8. Create the two working branches.

- New mainline daemon branch:
  - `feature/codex-logos-daemon`
- Separate legacy repair branch:
  - `feature/legacy-chat-runtime-repair`

9. Begin implementation only after the docs gates are complete.

- The roadmap, audit matrix, UI inventory, and host boundary specs must exist before daemon implementation begins.

8. Requirement -> Task -> Test -> Gate

1. Requirement: the new mainline direction must be separated from legacy runtime rescue.

- Task: use a dedicated docs lane and separate git branches.
- Test: roadmap, audit, and UI inventory all live under the new lane and branch plan is explicit.
- Gate: no mainline spec treats legacy runtime repair as the main architecture path.

2. Requirement: Codex must be treated as an as-is headless daemon, not as a codebase to half-port before boundaries are known.

- Task: author host/daemon specs before implementation.
- Test: first implementation specs talk about daemon attachment and host adaptation, not core surgery.
- Gate: no mainline task begins with "rewrite or cut Codex core" as step 1.

3. Requirement: current legacy runtime scope must be understood before replacement decisions are made.

- Task: complete the capability-audit matrix.
- Test: every major legacy capability has a status, proof method, and `Codex Lane Disposition`.
- Gate: replacement decisions stop being hand-wavy.

4. Requirement: chat UI reuse must be understood before parser removal and daemon integration work begins.

- Task: complete the post-XML UI surface inventory.
- Test: component surfaces are classified as `keep`, `adapter`, or `delete`.
- Gate: XML removal no longer threatens silent UI orphaning.

5. Requirement: branch discipline must protect both the new mainline and the isolated legacy rescue lane.

- Task: checkpoint current state and create dedicated branches.
- Test: there is a clear freeze point and both working branches are named and documented.
- Gate: no branch ambiguity remains about where daemon work or legacy repair belongs.

9. Acceptance and Tests

- This roadmap is accepted when:
  - `docs-new/07-codex-logos-phase/README.md` exists,
  - the daemon-first roadmap exists,
  - the capability-audit matrix exists,
  - the chat UI post-XML inventory exists,
  - superseded pre-reset docs are clearly marked,
  - and navigation/meta files are synchronized.
- No implementation work is accepted under this roadmap until the above documentation gates are complete.

10. Promotion Artifacts

- `2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
- `2026-03-29-chat-ui-post-xml-surface-inventory.md`
- Future follow-up specs:
  - host/daemon protocol,
  - session and persistence model,
  - terminal and console behavior,
  - capability gateway,
  - and first implementation slice.

11. Risks and Rollback

- Risks:
  - split-brain planning between historical release-line docs and the new daemon-first lane;
  - premature changes to Codex core before host requirements are fixed;
  - underestimating the UI and event-boundary work after removing XML parsing;
  - allowing the legacy repair branch to drift back into mainline assumptions.
- Rollback and containment:
  - keep older docs as historical references rather than deleting them;
  - keep the new docs lane explicit and separate;
  - keep the legacy repair branch isolated;
  - checkpoint the repository before divergence.

12. Agent Guardrails

- Do not reopen the XML/tag pipeline as the default mainline control plane.
- Do not treat the legacy repair branch as a hidden prerequisite for mainline daemon work.
- Do not start by cutting or forking Codex core internals unless a later boundary spec proves it is necessary.
- Do not parse TUI/CLI text as the primary integration contract.
- Do not leave branch strategy implicit.
- Keep navigation, progress, and validation synced when this lane changes.

## Evidence

- path: `../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Historical pre-reset roadmap`
  lines: 1-260
- path: `../04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`
  symbol: `Historical post-release-only daemon boundary`
  lines: 1-420
- path: `../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md`
  symbol: `Historical codex-like transfer framing`
  lines: 1-260
- path: `../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md`
  symbol: `Release-line runtime slice critique`
  lines: 1-180
- path: `../04-sprint-workflow/specs/2026-03-29-chat-runtime-service-layer-scope-and-boundaries.md`
  symbol: `Legacy chat-runtime capability inventory`
  lines: 1-220
- path: `../../src/paths/paths.ts`
  symbol: `App-root resolution and managed-vs-absolute path handling`
  lines: 1-31
- path: `../../src/hooks/useRunApp.ts`
  symbol: `Existing app lifecycle, preview URL, and app console flow`
  lines: 1-220
- path: `../../src/components/preview_panel/PreviewPanel.tsx`
  symbol: `Existing preview and console shell`
  lines: 1-170
- path: `../../src/components/chat/ChatMessage.tsx`
  symbol: `Current assistant message shell and ActionMarkdownParser dependency`
  lines: 1-245
- path: `../../src/components/chat/ActionMarkdownParser.tsx`
  symbol: `Current XML/tag parser layer and action-card dispatch`
  lines: 1-756

## Links

- [[README.md]]
- [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
- [[2026-03-29-chat-ui-post-xml-surface-inventory.md]]
- [[../03-templates/strict-spec.template.md]]
- [[../04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md]]
- [[../04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md]]
- [[../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md]]
