---
id: chaemera-spec-aura-visual-edit-re-pipeline-plan-2026-04-20
title: Aura Visual Edit Reverse Engineering Pipeline Plan
type: spec
status: active
tags: [spec, aura, reverse-engineering, visual-editing, research, mcp, codex]
related:
  [
    [README.md],
    [re_pipeline.txt],
    [../00-navigation/INDEX.md],
    [../../notes/2026-03-26-select-component-vs-visual-editing-status.md],
    [../03-templates/strict-spec.template.md],
  ]
depends_on:
  [[re_pipeline.txt], [../../notes/2026-03-26-select-component-vs-visual-editing-status.md]]
generated: false
source_of_truth: research-plan
outline: []
---

# Aura Visual Edit Reverse Engineering Pipeline Plan

1. Start Here

- This document fixes the first bounded reverse-engineering plan for `Aura` visual edit research.
- The active goal is not to "understand Aura in general", but to produce an evidence-backed model of:
  - the edit-panel surface,
  - the write-path of representative controls,
  - and the gap between universal-looking UI and actual underlying semantics.
- This research lane is external and comparative:
  - it is not part of the current Chaemera release-line scope;
  - it exists to inform later structured editing and visual-selection design.
- Current operating baseline:
  - use `Codex CLI` as the primary execution lane in this Windows workspace;
  - use browser `MCP` as the primary instrumentation layer;
  - treat `Codex app` Computer Use as optional, not baseline.

2. Intent + Non-goals

- Intent:
  - turn the imported discussion into an executable research plan with explicit phases, artifacts, and tooling requirements;
  - keep the first pass bounded enough to produce real evidence instead of broad speculative notes;
  - define the minimum stack required before any serious `Aura` probing starts.
- Non-goals:
  - no claim that one `button` specimen proves the entire internal model of `Aura`;
  - no attempt to reverse-engineer the full `Aura` architecture in the first wave;
  - no requirement to build a custom Chaemera desktop client before the first evidence pass;
  - no screenshot-only or impressionistic analysis without DOM, network, storage, or persistence evidence.

3. Target Outcome

- The first research wave is successful when all of the following are true:
  - one `button` element has a full documented panel inventory;
  - one `button` element has a control-by-control matrix with evidence refs;
  - the relation between `EDIT`, `PROMPT`, and `CODE` is recorded for the tested controls;
  - at least two minimal contrast probes exist for `heading` and `container/div`;
  - the final findings doc explicitly separates:
    - observed,
    - inferred,
    - contradicted,
    - and not yet proven.

4. Locked Decisions

1. The first serious execution lane is `Codex CLI + browser MCP`, not a future custom app.
1. A dedicated `Aura` browser profile is required so storage, auth state, and extension noise stay controlled.
1. `Browser MCP` is mandatory for the first instrumented wave because the pipeline depends on DOM inspection, snapshots, screenshots, script evaluation, and network capture.
1. `Codex app` Computer Use is optional sidecar tooling only:
   - use it later for exploratory GUI work on supported environments;
   - do not make it a prerequisite for the Windows baseline.
1. `App Server` is optional and deferred:
   - use it only if the research lane later needs a custom cockpit, remote operator flow, or server-driven orchestration UI.
1. The primary specimen is `button`.
1. The minimum contrast specimens are `heading` and `container/div`.
1. A control matrix is mandatory:
   - without it, the research lane is not considered reproducible.
1. An identical-looking panel does not count as evidence of identical semantics.
1. The first wave must stay bounded to one deep specimen plus two short contrast probes.

### 4.1. Minimum required stack

- `Codex CLI`
- one browser `MCP` server with, at minimum, these capabilities:
  - open/navigate page
  - click/fill/type
  - DOM or accessibility snapshot
  - evaluate in-page JavaScript
  - screenshot capture
  - network request listing and request inspection
- one dedicated browser profile for `Aura`
- one research workspace, preferably shaped as:
  - `notes`
  - `tasks`
  - `captures`
  - `scripts`
  - `matrices`
  - `findings`
- three baseline capture scripts:
  - `capture_dom_state`
  - `capture_visual_state`
  - `capture_storage_and_network_state`
- one task template
- one findings template
- one master controls matrix

### 4.2. Optional stack

- `Codex app` for exploratory navigation and GUI-only edge cases on supported environments
- `Codex App Server` for:
  - custom research clients,
  - remote operator mode,
  - or event-driven orchestration beyond the terminal
- export/import helpers if `Aura` exposes project export surfaces
- additional diff helpers for storage dumps, HTML snapshots, and screenshots

5. Architecture Fit

- This plan intentionally fits the current Chaemera reality instead of ignoring it.
- Chaemera's own current local note already distinguishes:
  - `select component as chat context`,
  - from full `visual editing save-to-source`.
- That note also records that the current Chaemera full visual-editing backend appears incomplete in both Electron and Tauri codepaths.
- Therefore this `Aura` lane should be treated as comparative product research:
  - not as evidence that Chaemera should immediately widen release scope;
  - and not as permission to assume a full builder-grade visual editing system already exists locally.

6. External References (optional)

- Official Codex MCP docs, retrieved `2026-04-20`:
  - `https://developers.openai.com/codex/mcp`
  - relevant because the official docs state that `MCP` configuration lives in `config.toml` and is shared between the CLI and IDE extension.
- Official Codex app Computer Use docs, retrieved `2026-04-20`:
  - `https://developers.openai.com/codex/app/computer-use`
  - relevant because the official docs describe Computer Use as a GUI tool for visual inspection tasks, but also state that this launch surface is currently `macOS`-only.
- Official Codex App Server docs, retrieved `2026-04-20`:
  - `https://developers.openai.com/codex/app-server`
  - relevant because they document a server-initiated event stream and approval flow suitable for a later custom harness.
- Official Codex CLI features docs, retrieved `2026-04-20`:
  - `https://developers.openai.com/codex/cli/features`
  - relevant because they document resume behavior and remote TUI to App Server, which matters only if this lane later expands beyond a local terminal-first workflow.

7. Implementation Tasks (ordered)

### 7.1. Phase 0 - Bootstrap the research harness

- Goal:
  - make the environment reproducible before probing `Aura`.
- Tasks:
  - configure browser `MCP`;
  - create or isolate the dedicated `Aura` browser profile;
  - create the research workspace structure;
  - create the three baseline capture scripts;
  - create the task template, findings template, and controls matrix skeleton.
- Deliverables:
  - one working browser `MCP` configuration
  - one repeatable browser profile
  - empty but usable workspace folders
  - script placeholders or implementations

### 7.2. Phase 1 - Surface inventory on the primary specimen

- Goal:
  - enumerate the complete panel surface for one `button`.
- Tasks:
  - open `Aura`;
  - select one representative `button`;
  - traverse `EDIT`, `PROMPT`, and `CODE`;
  - expand every visible accordion section;
  - capture screenshots and panel inventory notes.
- Deliverables:
  - `button_panel_inventory.md`
  - section screenshots
  - one first-pass list of all visible controls

### 7.3. Phase 2 - Static UI schema reconstruction

- Goal:
  - describe the panel as a form, not just as screenshots.
- Tasks:
  - classify each control type;
  - record default values;
  - record disabled or hidden states;
  - record conditional visibility if present.
- Deliverables:
  - `button_edit_schema.json`
  - `button_edit_schema.md`

### 7.4. Phase 3 - Stimulus mapping

- Goal:
  - identify what each control actually writes to or changes.
- Tasks:
  - mutate one control at a time using distinctive marker values;
  - capture before/after DOM;
  - capture before/after computed-style changes;
  - capture class-list differences;
  - capture network differences;
  - capture storage differences;
  - check reload persistence.
- Deliverables:
  - matrix rows for tested controls
  - before/after artifact set for each control pass

### 7.5. Phase 4 - Identity and ownership

- Goal:
  - determine how `Aura` knows which canvas element is currently selected.
- Tasks:
  - inspect data attributes, synthetic ids, overlay markers, and DOM anchors;
  - inspect the relation between canvas overlays and the right-side panel;
  - record hypotheses about selection identity.
- Deliverables:
  - one ownership/selection note with evidence refs

### 7.6. Phase 5 - Persistence model

- Goal:
  - determine where edits actually persist.
- Tasks:
  - test reload, reopen, duplicate, and export behavior where possible;
  - compare network, storage, and visible project state before and after;
  - classify whether the observed path looks closer to:
    - raw DOM editing,
    - style abstraction,
    - or JSON-backed builder state.
- Deliverables:
  - one persistence findings doc

### 7.7. Phase 6 - Semantics vs implementation split

- Goal:
  - separate semantic controls from low-level implementation escape hatches.
- Tasks:
  - classify controls such as `Text Content`, `Link`, `Tailwind Classes`, `Inline CSS`, and `Collection Loop`;
  - mark whether a control appears semantic, structural, or low-level;
  - record contradictions where the UI looks universal but behavior diverges.
- Deliverables:
  - one semantic-vs-implementation classification pass

### 7.8. Phase 7 - Minimal contrast probes

- Goal:
  - verify where `Aura` keeps or breaks semantic consistency across element types.
- Tasks:
  - run short focused probes on:
    - `heading`
    - `container/div`
  - test only the high-value controls:
    - text/content
    - link/action
    - layout/spacing
    - loop/structural controls where applicable
- Deliverables:
  - short contrast notes
  - matrix deltas against the `button` specimen

8. Requirement -> Task -> Test -> Gate

1. Requirement: the research lane must be reproducible.

- Task: configure browser `MCP`, dedicated profile, workspace structure, and capture scripts.
- Test: one session can be rerun without guessing hidden setup state.
- Gate: no formal RE pass begins before the baseline harness works.

2. Requirement: the first pass must produce evidence, not screenshots alone.

- Task: capture DOM, style, network, storage, and persistence artifacts alongside images.
- Test: each tested control has artifact refs beyond a screenshot.
- Gate: no control is marked understood if only visual evidence exists.

3. Requirement: the first specimen must be deep, but bounded.

- Task: use `button` as the primary specimen and do the full pass there first.
- Test: the `button` matrix covers the full panel surface and the tested write-paths.
- Gate: do not expand to broader element families before the `button` pass is materially complete.

4. Requirement: the lane must not overclaim from one universal-looking UI.

- Task: add minimal contrast probes for `heading` and `container/div`.
- Test: the final findings note explicitly names where semantics appear shared versus divergent.
- Gate: no "Aura has one universal internal model" claim is accepted without contrast evidence.

5. Requirement: the first wave must not require a custom desktop app.

- Task: use `Codex CLI + browser MCP` as the default lane and keep `App Server` deferred.
- Test: Phases 0 through 7 can be completed from the terminal-first workflow.
- Gate: no app-client build work starts unless the user explicitly asks for a dedicated cockpit.

9. Acceptance and Tests

- This plan is accepted when:
  - the required stack is explicit;
  - the ordered phases are explicit;
  - the primary specimen and contrast specimens are explicit;
  - and the "no desktop app required for the first wave" decision is explicit.
- The first research wave is accepted when:
  - `button` surface inventory is complete;
  - `button` schema and matrix exist;
  - the main tested controls have evidence-backed write-path notes;
  - `heading` and `container/div` contrast probes exist;
  - and one findings document states what is proven versus still open.

10. Promotion Artifacts

- one workspace blueprint doc
- one task template
- one findings template
- one controls matrix template
- one `button` specimen findings doc
- one contrast-probe findings doc

11. Risks and Rollback

- Risks:
  - session contamination from shared browser state;
  - UI drift in `Aura` between sessions;
  - false confidence from screenshot-only interpretation;
  - overclaiming from one primary specimen;
  - getting blocked by opaque persistence or anti-automation behavior;
  - wasting time building a custom client before the baseline harness proves value.
- Rollback and containment:
  - keep the dedicated browser profile isolated;
  - keep the first wave bounded to one deep specimen plus two short contrasts;
  - fall back to manual operator notes when a single control cannot be fully automated;
  - if storage is opaque, rely more heavily on network, export, reload, and visible code-surface evidence;
  - defer custom App Server clients until the terminal-first flow becomes a real bottleneck.

12. Agent Guardrails

- Do not claim that one `button` proves the whole `Aura` editor model.
- Do not rely on screenshots as primary evidence.
- Do not build a desktop app first.
- Do not let this comparative research lane leak into current Chaemera release scope.
- Do not silently replace the control matrix with prose summaries.
- Do not treat an identical panel layout as proof of identical write-path semantics.

## Evidence

- path: `re_pipeline.txt`
  symbol: `Imported Aura reverse-engineering pipeline discussion`
  lines: 15-143, 343-567
- path: `../../notes/2026-03-26-select-component-vs-visual-editing-status.md`
  symbol: `Chaemera distinction between component selection and incomplete full visual editing`
  lines: 7-30, 72-94

## Links

- [[README.md]]
- [[re_pipeline.txt]]
- [[../../notes/2026-03-26-select-component-vs-visual-editing-status.md]]
- [[../00-navigation/INDEX.md]]
- [[../03-templates/strict-spec.template.md]]
