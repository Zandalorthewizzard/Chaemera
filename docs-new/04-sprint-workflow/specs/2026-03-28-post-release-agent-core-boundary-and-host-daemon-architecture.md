---
id: chaemera-spec-post-release-agent-core-boundary-and-host-daemon-architecture-2026-03-28
title: Post-Release Agent Core Boundary and Host-Daemon Architecture
type: spec
status: historical
tags:
  [
    spec,
    agent,
    architecture,
    codex,
    logos,
    post-release,
    daemon,
    terminal,
    historical,
  ]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [../../07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-02-chaemera-next-phase-product-roadmap.md],
    [2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md],
    [
      ../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md,
    ],
    [
      ../../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md,
    ],
  ]
depends_on:
  [
    [2026-03-02-chaemera-next-phase-product-roadmap.md],
    [2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Post-Release Agent Core Boundary and Host-Daemon Architecture

1. Start Here

- Historical notice:
  - this document records the pre-pivot assumption that the daemon architecture was `post-release only`;
  - that timing assumption was superseded on 2026-03-29 by the active mainline roadmap in `docs-new/07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md`;
  - keep this file as historical evidence for the earlier boundary model, not as the active implementation sequence.
- This document is the canonical source of truth for the future Chaemera agent-layer architecture after the current release line ships.
- `NOT MVP SCOPE`: this spec does not expand the current MVP or release scope.
- The current MVP remains the already accepted release line:
  - production-ready `Tauri 2` cutover,
  - `OSS-first` and `BYOK-first` posture,
  - and only the minimum product and functionality work needed to ship that line cleanly.
- New agent-layer implementation work described here should begin only after that release is accepted.
- The purpose of this spec is to prevent two bad outcomes:
  - extending the current XML-centered Dyad runtime into the future by inertia,
  - or replacing that debt with a desktop wrapper that depends on Codex CLI-shaped behavior instead of owning its own architecture.

2. Intent + Non-goals

- Intent:
  - define the post-release architecture boundary for a structured Chaemera agent core before implementation starts;
  - preserve the current release strategy instead of letting future agent work leak into MVP execution;
  - promote the accepted direction that Chaemera should become a desktop host around an agent daemon rather than remain a chat shell with XML actions;
  - keep a clean path from a Codex-derived operational core toward a future Logos core without forcing that product split now;
  - preserve the useful strengths of old Dyad XML only as an explicit legacy or expert capability.
- Non-goals:
  - no new daemon, terminal, or structured-agent implementation in the current release line;
  - no widening of MVP into a full agent-platform build before `Tauri 2` release readiness is complete;
  - no attempt to integrate the desktop directly with Codex CLI stdout, TUI assumptions, or CLI UX semantics;
  - no requirement to deliver multi-agent, plugin parity, web tooling, or hosted services in the first post-release wave;
  - no reinstatement of hosted-first, premium-shaped, or coercive product behavior.

3. Context + Problem

- The current live AI path in Chaemera is still the XML-tagged `build` runtime, while `ask`, `plan`, and `local-agent` remain scaffolded but unavailable in OSS.
- The current roadmap already locks two important release truths:
  - no full product reinvention before the current cutover is stable,
  - and the long-term context model must become retrieval-first instead of whole-codebase-first.
- The current release posture is already locked as `BYOK-first OSS`, not hosted-first.
- The current product shell is app-centric rather than generic-directory-centric:
  - apps are normally rooted under `dyad-apps`,
  - imports can also remain at absolute paths,
  - preview and runtime logs already exist as first-class product surfaces.
- The current shell and console model is not a true coding terminal:
  - shell IPC only opens URLs or reveals files in folders,
  - the visible console is a preview-log surface, not a general execution runtime.
- The product direction discussed and accepted outside the current codebase moves further than simple XML replacement:
  - Chaemera should remain an AI app-builder shell with preview and richer app-aware surfaces;
  - the agent daemon should be the real intelligence and source of truth;
  - and any Codex-derived runtime should live behind a Chaemera-owned protocol boundary so that Logos remains possible later.

4. Target Outcome

- After the current release line ships, Chaemera should evolve into a `local agent platform with desktop host`.
- The future architecture should have five explicit parts:
  - `Chaemera Desktop Host`
  - `Agent Core Daemon`
  - `Host Capability Gateway`
  - `Legacy XML Executor`
  - `Session Event Model`
- In that future state:
  - the desktop owns app/workspace UX, preview, visual and terminal surfaces, and host mediation;
  - the core daemon owns session truth, planning/execution flow, tool orchestration, and model/provider abstraction;
  - the gateway exposes host-specific capabilities to the core in a formal, tool-addressable way;
  - XML survives only behind an expert wall or compatibility boundary;
  - and the default agent workflow becomes structured, retrieval-first, tool-driven, and verification-capable.

5. Locked Decisions

1. This architecture is post-release only and must not be pulled into the current MVP scope.
1. The current MVP remains:
   - `Tauri 2` cutover,
   - `OSS-first`,
   - `BYOK-first`,
   - and minimal functionality work required to ship that line.
1. The future agent architecture uses a host/daemon split, not an in-process extension of the current XML runtime.
1. The agent daemon is the primary intelligence surface.
1. Session truth belongs to the agent core, not to renderer state.
1. Chat history, tool activity, approvals, patches, terminal output, and preview updates must be treated as projections of one canonical session timeline, not as unrelated state stores.
1. Approval and sandbox policy semantics belong to the core orchestration model.
1. Host-specific machine and app-surface enforcement still happens at the host capability boundary even when intent originates in the core.
1. `CLI` is not the canonical owner of the system:
   - it may exist later as another client or as a hidden operational surface,
   - but it must not define the product contract.
1. The core may be derived from Codex runtime lineage, but the desktop must not depend on Codex CLI UX shape, stdout shape, or internal event naming.
1. The protocol between desktop and core must be provider-neutral and Codex-shape-resistant.
1. The future default agent path must be structured-tool-driven and retrieval-first.
1. The future default agent path must not depend on whole-repo context by default.
1. `AppEnvironment` is the canonical execution context, not plain `cwd`.
1. Host-specific surfaces such as preview, app lifecycle, import semantics, runtime logs, and future visual editing context must be exposed as first-class capabilities.
1. Dyad XML is preserved only as:

- a legacy expert mode behind a settings wall,
- or a compatibility-oriented batch executor.

17. Dyad XML must not remain the reasoning substrate or default control plane of the future agent.
18. `App Console` and `Agent Terminal` are separate architectural surfaces even if later rendered close together in the UI.
19. The architecture should be designed so that a later Logos extraction is possible, but Chaemera is still the active product shell and not merely a thin client.

20. Architecture Fit

- This spec fits the already accepted next-phase roadmap rather than replacing it.
- It preserves `Track 1` discipline by explicitly preventing post-release agent ambitions from expanding the current release line.
- It fits `Track 2` because retrieval-first context, targeted file reads, diffs, include/exclude controls, and inspectable context composition are direct prerequisites for a sane structured agent.
- It fits the accepted `BYOK-first OSS` product posture because the new agent architecture is not framed around hosted entitlement or premium gating.
- It also fits the current code constraints:
  - the present local-agent runtime is unavailable in OSS,
  - the live XML build path should be treated as legacy runtime debt to isolate,
  - and the current preview shell gives Chaemera stronger app-aware host surfaces than a generic coding CLI.

7. External References (optional)

- An external design discussion at `C:\Work\SYNC\MIND8\70_PROJECTS\Chaemera\disc-codex_logos_cli-core.md` informed this spec.
- That external file is not canonical after this promotion.
- This spec promotes the accepted conclusions into the repository's governed documentation set.
- The most important promoted conclusions are:
  - Chaemera should be treated as an app-builder host around an agent daemon;
  - session truth belongs to the core;
  - the protocol boundary must be local, stable, and provider-neutral;
  - and the correct lesson from Codex/OpenCode is to borrow the topology, not the ontology.

8. System Roles

8.1. Chaemera Desktop Host

- Owns:
  - app and workspace surfaces,
  - preview surfaces,
  - future visual editing surfaces,
  - terminal UI surfaces,
  - user-facing approvals UI,
  - local UI state and projection rendering,
  - host mediation to the local machine and app runtime.
- Must not own:
  - the canonical session timeline,
  - agent planning logic,
  - the default tool orchestration loop,
  - core model/provider logic.

    8.2. Agent Core Daemon

- Owns:
  - session truth,
  - planning and execution loop,
  - tool orchestration,
  - prompt layering and instruction assembly,
  - model/provider abstraction,
  - approval intent flow,
  - sandbox policy semantics,
  - structured editing and verification logic,
  - optional later subagents.
- Must not own:
  - direct assumptions about Chaemera renderer layout,
  - hardcoded preview UI behavior,
  - hidden XML-first reasoning,
  - desktop-only state as its system contract.

    8.3. Host Capability Gateway

- Owns:
  - exposing host-side capabilities to the daemon,
  - binding the daemon to a concrete `AppEnvironment`,
  - machine and app-surface enforcement,
  - mediation for preview, lifecycle, import, logs, assets, and future visual context,
  - translating host-native operations into formal callable capabilities.
- This gateway is the required boundary that prevents Chaemera-specific behavior from leaking into the generic core as hardcoded runtime debt.

  8.4. Legacy XML Executor

- Owns:
  - opt-in XML legacy workflow,
  - batch-oriented XML or XML-compatible execution artifacts,
  - backward-compatible Dyad-style expert behavior where retained.
- Must not own:
  - default discovery,
  - default planning,
  - default edit semantics,
  - or the canonical structured agent contract.

    8.5. Optional CLI or Headless Clients

- May exist later as clients of the same daemon boundary.
- Must not become the canonical owner of state or protocol.
- Must use the same core contract as the desktop rather than forcing the desktop to adapt to CLI-shaped semantics.

9. Session Truth and Persistence Model

- The future system must have one canonical session timeline.
- The minimum canonical entities are:
  - `Session`
    - a durable agent interaction timeline bound to one active `AppEnvironment`;
  - `Turn`
    - one user or system initiation unit inside a session;
  - `TaskRun`
    - one execution attempt or orchestrated work cycle inside the session;
  - `Event`
    - the smallest persisted or streamable operation record;
  - `Artifact`
    - a durable result such as a patch proposal, tool result reference, approval record, selected file set, or runtime log attachment.
- The chat transcript, terminal stream, tool log, plan cards, preview updates, and hidden machine-oriented bookkeeping are all projections over that one timeline.
- Renderer state is allowed to cache or hide parts of that timeline, but it must not become the primary truth store.
- Re-attach must be a first-class requirement:
  - desktop restart with daemon alive should allow session re-attachment;
  - daemon restart should be represented explicitly as session interruption or failure, not as silent renderer drift.
- Exact persistence technology is deferred:
  - SQLite,
  - append-only event log,
  - or hybrid storage
    remain open implementation questions.
- The architectural decision that is already locked is the shape:
  - one canonical timeline,
  - one owning core,
  - many UI projections.

10. AppEnvironment Contract

- The core must not receive only a plain directory and guess everything else.
- Each live session must bind to an explicit `AppEnvironment`.
- The current minimum descriptor shape is:

```text
AppEnvironment {
  workspace_id
  app_id
  root_path
  writable_roots[]
  runtime_profiles[]
  preview_endpoints[]
  import_mode
  asset_roots[]
  env_binding_refs[]
  host_capabilities[]
}
```

- Field intent:
  - `workspace_id`
    - stable host identity for the workspace container;
  - `app_id`
    - host-level identity for the selected app entity;
  - `root_path`
    - canonical filesystem root used by the current environment;
  - `writable_roots[]`
    - explicit write boundaries the core may target;
  - `runtime_profiles[]`
    - available run or verification profiles such as preview dev server, test, or build modes;
  - `preview_endpoints[]`
    - current preview addresses or host handles where relevant;
  - `import_mode`
    - whether the app is copied into the managed root or remains at an imported external path;
  - `asset_roots[]`
    - host-recognized asset locations for future richer editing workflows;
  - `env_binding_refs[]`
    - environment or secret binding references without forcing the core to discover them indirectly;
  - `host_capabilities[]`
    - the host-specific callable surfaces available for this environment.
- This contract is necessary because current Chaemera behavior already distinguishes:
  - managed `dyad-apps` roots,
  - absolute imported roots,
  - and preview/runtime surfaces beyond plain filesystem access.

11. Capability Gateway and Tool Model

- The future core should expose one formal tool contract to the model, even if tools come from different implementation layers.
- That means the model-visible tool surface should be unified while the implementation remains split between:
  - generic core tools,
  - host-provided capabilities,
  - and optional legacy compatibility executors.
- Minimum first-wave core tools after release should be close to the already accepted retrieval-first target:
  - `list_files`
  - `grep`
  - `read_file`
  - `shell_command`
  - `apply_patch`
- Expected host-provided tools or capabilities include:
  - run, stop, and restart app preview,
  - inspect runtime logs,
  - resolve import/copy behavior,
  - inspect app metadata and environment bindings,
  - expose future visual selection context,
  - manage asset surfaces where applicable.
- XML, if still present, should appear only as an explicit capability or executor path such as:
  - `legacy_xml_execute`
  - or a batch-manifest application tool.
- Enforcement rule:
  - approval and sandbox policy semantics may originate in the core,
  - but the host capability gateway remains the enforcement boundary for machine-specific and app-specific rights.
- This split preserves the product owner's desired core-centric control model without allowing the daemon to bypass the host's real boundaries.

12. Protocol Boundary and Event Model

- The desktop must not integrate by parsing Codex CLI stdout, stderr, textual approvals, or terminal-only event assumptions.
- The required architecture is:
  - `Chaemera Desktop Host -> Chaemera-owned local protocol boundary -> Codex-derived runtime`
- If a CLI exists later, it should use the same boundary:
  - `CLI -> Chaemera-owned local protocol boundary -> the same runtime`
- The protocol must be:
  - local,
  - versionable,
  - provider-neutral,
  - stable across runtime upgrades,
  - and resistant to Codex-specific naming leakage.
- The exact transport remains open:
  - local HTTP,
  - gRPC,
  - JSON-RPC,
  - socket plus event stream,
  - or a hybrid.
- The minimum event taxonomy should be Chaemera-owned rather than borrowed blindly.
- A candidate baseline event family is:

```text
session.create
session.resume
task.submit
message.user
message.agent
plan.proposed
approval.requested
approval.resolved
tool.call.started
tool.call.finished
patch.proposed
patch.applied
preview.refresh.requested
preview.updated
runtime.log
artifact.selected
session.failed
session.completed
```

- The names above are a boundary example, not a locked final wire protocol.
- What is locked is the principle:
  - the desktop talks to a Chaemera protocol,
  - not to Codex CLI behavior.

13. Terminal and Console Surfaces

- Chaemera should explicitly separate:
  - `App Console`
  - `Agent Terminal`
- `App Console` is for:
  - preview runtime logs,
  - app server output,
  - client or server issues tied to the running app.
- `Agent Terminal` is for:
  - shell execution initiated by the agent,
  - later optional user-entered commands under policy,
  - approval prompts tied to command execution,
  - command stdout and stderr,
  - execution status and retry flow.
- They may be rendered near each other in the product, but they are not the same architectural surface.
- This split matters because the current `Console` and `PreviewPanel` already prove that Chaemera has an app-log surface, but not yet a general coding terminal.
- Future UX details such as whether approvals appear inline, in side panels, or as task cards are deferred.
- The structural requirement is not deferred:
  - app logs and agent command execution must not be mixed into one noisy undifferentiated console.

14. Editing and Patch Semantics

- The future default edit path must be structured and deterministic.
- The intended shape is closer to `apply_patch`-style editing than to free-form diff text or XML-emitted file rewrites.
- Minimum stages in the default path should be:
  - inspect,
  - propose,
  - preview when needed,
  - apply,
  - verify,
  - record rollback metadata.
- This does not mean every edit must require a visible manual approval card.
- It does mean the runtime contract must separate:
  - patch intent,
  - patch application,
  - and verification results.
- The default edit path must not depend on:
  - XML tags embedded in assistant text,
  - best-effort search-replace repair loops,
  - or whole-file rewrites as the normal editing semantics.
- Exact rollback granularity remains deferred.
- The architectural decision that is locked is that the future agent must not inherit XML-tag repair debt as its core edit model.

15. Legacy XML Expert Mode

- Dyad XML is preserved only as a legacy or expert path.
- It should live behind a settings wall or similarly explicit opt-in boundary.
- Its value proposition is limited and specific:
  - high-fanout batch generation,
  - deliberate token-cost control for power users,
  - compatibility with old Dyad-style workflows where still valuable.
- It is not the default answer for:
  - discovery,
  - iterative editing,
  - verification loops,
  - or general agent orchestration.
- If XML is retained, it must be isolated enough that the new structured agent core can operate without importing:
  - XML prompt contracts,
  - XML tag parsing,
  - XML recovery loops,
  - or XML-first mental models.
- If a future structured agent triggers XML-compatible batch execution, that should happen through a tool boundary or executor boundary, not by making the agent think in XML.

16. Ordered Post-Release Implementation Plan

1. Phase 0 - No implementation before release.

- Before release, this spec authorizes documentation, audits, and boundary planning only.
- It does not authorize daemon implementation, terminal implementation, or protocol implementation as part of MVP work.

2. Phase 1 - Core boundary and protocol spec.

- Author the formal host/core contract.
- Lock session, task, approval, artifact, and event semantics.
- Decide transport technology.

3. Phase 2 - AppEnvironment and session foundation.

- Implement `AppEnvironment` binding.
- Implement core-owned session truth and re-attach model.
- Implement projection rules for desktop state.

4. Phase 3 - Minimal structured tool runtime.

- Ship retrieval-first file tools.
- Ship structured `shell_command`.
- Ship structured `apply_patch`.
- Add prompt and instruction layering for project guidance.

5. Phase 4 - Agent terminal and execution surfaces.

- Add first-class `Agent Terminal`.
- Keep `App Console` as a separate surface.
- Stream execution, approvals, and logs through the new event model.

6. Phase 5 - Host capability gateway.

- Expose preview and app lifecycle controls.
- Expose import semantics and runtime inspection.
- Bind host rights to explicit capability mediation.

7. Phase 6 - Route future `ask`, `plan`, and `agent` to the structured core.

- Replace the dormant OSS stub path with the new daemon-backed path.
- Keep the current XML build runtime out of the default agent flow.

8. Phase 7 - Legacy XML extraction and expert-mode containment.

- Move XML behind its expert wall and explicit executor path.
- Remove XML assumptions from the default structured runtime.

9. Phase 8 - Later expansion.

- Consider subagents only after the single-agent path is stable.
- Consider batch-manifest execution beyond XML compatibility.
- Evaluate when the core has become clean enough to extract as part of Logos.

17. Requirement -> Task -> Test -> Gate

1. Requirement: this future architecture must not expand the current MVP.

- Task: keep all agent-core implementation work deferred until after the current release line.
- Test: release tasks, sprint plans, and implementation specs do not pull daemon or terminal build work into the active MVP.
- Gate: no post-release agent runtime implementation is treated as a current release dependency.

2. Requirement: future session truth must belong to the core.

- Task: define one canonical session timeline with projection rules.
- Test: desktop restart and daemon re-attach scenarios work without split-brain state.
- Gate: UI state is never the only truth store for a live agent session.

3. Requirement: the future agent must be app-aware rather than plain-cwd-aware.

- Task: implement `AppEnvironment` and host capability binding.
- Test: managed apps and imported absolute-path apps both work through the same structured contract.
- Gate: core runtime does not require invisible Chaemera-specific prompt glue to understand where it is allowed to operate.

4. Requirement: the desktop must not depend on Codex CLI-shaped behavior.

- Task: own the protocol boundary and event taxonomy.
- Test: runtime upgrades do not require desktop parsing changes to CLI-specific text output.
- Gate: desktop integrates with a Chaemera protocol, not terminal client behavior.

5. Requirement: XML must be isolated from the future default runtime.

- Task: keep XML behind a legacy executor or expert mode only.
- Test: structured agent sessions can run discovery, edits, verification, and shell execution without any XML-tag contract.
- Gate: XML absence does not break the default agent path.

18. Acceptance and Tests

- This spec is considered accepted when future implementation planning treats it as the canonical boundary document for the agent layer.
- Future post-release implementation acceptance should include:
  - contract tests for the host/core protocol;
  - session re-attach and crash-recovery tests;
  - integration tests for `AppEnvironment` handling on both managed and imported apps;
  - structured tool execution tests for read, search, patch, and shell flows;
  - UI tests confirming `App Console` and `Agent Terminal` remain distinct surfaces;
  - tests confirming legacy XML mode is opt-in and not used by default agent sessions.
- No current MVP test plan is changed by this document.

19. Promotion Artifacts

- Before implementation begins, future work must produce dedicated follow-up specs for:
  - the host/core protocol;
  - session and persistence model;
  - terminal surface behavior;
  - capability gateway and host-tool contract;
  - legacy XML expert-mode behavior and migration boundary.
- Any post-release sprint or task spec touching the future agent runtime must link back to this document.

20. Risks and Rollback

- Risks:
  - scope creep could turn this post-release architecture into a hidden MVP expansion;
  - session truth could split between renderer state and daemon state;
  - Codex-derived runtime work could drift into Codex-shaped integration debt;
  - Chaemera-specific host behavior could leak into the core as hardcoded assumptions;
  - XML could sneak back into the structured core through convenience shortcuts;
  - Logos ambitions could trigger premature over-abstraction before Chaemera's post-release agent path is actually proven.
- Rollback and containment:
  - keep the boundary owned by Chaemera rather than by Codex CLI;
  - keep XML isolated behind an expert wall or explicit executor;
  - keep host capabilities behind a gateway rather than direct core assumptions;
  - keep the current MVP untouched by this post-release plan;
  - defer open implementation details until they can be spec'd with evidence.

21. Agent Guardrails

- Do not start implementing the new agent daemon during the current MVP release push.
- Do not treat this architecture as permission to delay or reopen the accepted `Tauri 2` and `BYOK-first OSS` release line.
- Do not integrate the future desktop by parsing CLI text, TUI output, or tool chatter from a terminal client.
- Do not let `App Console` become a substitute for a true agent terminal.
- Do not let XML return as the default control plane because it is convenient for a subset of workflows.
- Do not design the future core around whole-repo context by default.
- Do not smuggle hosted-entitlement or premium-shaped assumptions back into the future agent core.
- Borrow topology from Codex/OpenCode when useful, but do not blindly import their ontology.

## Evidence

- path: `docs-new/04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Track order, no full reinvention before stable cutover, and retrieval-first direction`
  lines: 34-40, 45-52, 58-71, 117-145, 165-194
- path: `docs-new/04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md`
  symbol: `Current BYOK-first OSS posture`
  lines: 24-27, 46-57, 72-74, 148-156
- path: `docs-new/05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md`
  symbol: `Live XML build flow and stubbed OSS local-agent path`
  lines: 25-55
- path: `docs-new/05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md`
  symbol: `Selected direction: structured default plus legacy XML expert mode`
  lines: 23-47, 64-119
- path: `docs-new/05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md`
  symbol: `Legacy XML runtime localization and extraction boundary`
  lines: 23-86
- path: `docs-new/05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md`
  symbol: `Codex capability envelope and Chaemera transfer constraints`
  lines: 23-120
- path: `src/paths/paths.ts`
  symbol: `dyad-apps base directory and absolute app-path handling`
  lines: 5-23
- path: `src/ipc/handlers/import_handlers.ts`
  symbol: `Import flow and skip-copy absolute-root behavior`
  lines: 47-112
- path: `src/ipc/handlers/shell_handler.ts`
  symbol: `Current shell IPC scope is not a general terminal`
  lines: 1-34
- path: `src/components/preview_panel/Console.tsx`
  symbol: `Current console is preview-log oriented`
  lines: 66-119, 151-175
- path: `src/components/preview_panel/PreviewPanel.tsx`
  symbol: `Console placement under preview panel`
  lines: 24-69, 141-170
- path: `src/ipc/handlers/local_agent/local_agent_handler.ts`
  symbol: `OSS local-agent stub`
  lines: 24-42
- path: `C:\Work\SYNC\MIND8\70_PROJECTS\Chaemera\disc-codex_logos_cli-core.md`
  symbol: `Accepted host-daemon direction, AppEnvironment sketch, and protocol-boundary conclusions`
  lines: 120-128, 184-217, 260-343, 363-465, 773-789

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-03-02-chaemera-next-phase-product-roadmap.md]]
- [[2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-current-ai-runtime-state.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-structured-agent-core-with-legacy-xml-mode.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md]]
- [[../../05-discussion-templates/discussions/2026-03-28-codex-like-agent-core-reference-and-transfer-plan.md]]
