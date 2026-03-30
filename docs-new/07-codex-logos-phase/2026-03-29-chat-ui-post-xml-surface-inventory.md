---
id: chaemera-spec-chat-ui-post-xml-surface-inventory-2026-03-29
title: Chat UI Post-XML Surface Inventory
type: spec
status: active
tags: [spec, chat, ui, xml, codex, logos, inventory]
related:
  [
    [README.md],
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [2026-03-29-legacy-chat-runtime-capability-audit-matrix.md],
    [
      ../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md,
    ],
  ]
depends_on:
  [
    [2026-03-29-codex-logos-daemon-first-roadmap.md],
    [
      ../05-discussion-templates/discussions/2026-03-29-tauri-chat-runtime-layer-reality-check.md,
    ],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Chat UI Post-XML Surface Inventory

1. Start Here

- This document is the canonical UI inventory for the mainline daemon-first phase after the XML parser layer is removed from the default chat path.
- It answers four questions:
  - what current chat UI surfaces clearly survive,
  - what can survive with an adapter,
  - what becomes orphan-prone after parser removal,
  - and what should be treated as delete-candidate debris from the XML era.
- The goal is not to preserve XML under a new name.
- The goal is to keep valuable chat UI surfaces while replacing the XML-centered render contract with structured events from a headless Codex daemon.

2. Current Render Chain

- The current assistant render chain is:
  - `ChatPanel`
  - `MessagesList`
  - `ChatMessage`
  - `ActionMarkdownParser`
- That chain means the dominant coupling point is not the full chat panel.
- The dominant coupling point is the parser layer that:
  - scans assistant markdown for Dyad custom tags,
  - repairs unclosed tags,
  - hides selected internal tags,
  - and dispatches many `Action*` cards by XML tag name.

3. Disposition Vocabulary

- Use only these dispositions:
  - `keep`
  - `adapter`
  - `delete-candidate`
  - `unknown`
- Meanings:
  - `keep`
    - current surface should survive largely unchanged in the new daemon lane;
  - `adapter`
    - keep the UI surface but feed it from a structured event or new data model instead of XML parsing;
  - `delete-candidate`
    - XML-era glue or remediation surface that should not survive the new mainline;
  - `unknown`
    - insufficient evidence or dependent on future daemon protocol decisions.

4. Locked Decisions

1. Removing XML tags and the parser layer from the default path must not silently orphan useful chat UI.
1. The new mainline default path is:
   - Codex core as-is,
   - headless daemon,
   - Chaemera as host and UI,
   - structured event adaptation instead of XML tag parsing.
1. The assistant-message shell is not itself the main problem.
1. `ActionMarkdownParser` and XML tag repair are the main current coupling point.
1. Existing chat UI that is already about:
   - transcript display,
   - compose flow,
   - queueing,
   - consents,
   - selected components,
   - token visibility,
   - and version browsing
     should be preserved where possible.

1. Surface Inventory

## 5.1 Transcript Shell

| Surface                      | Current Role                                                                                  | XML Coupling | Disposition | Notes                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ------------ | ----------- | -------------------------------------------------------------------------- |
| `ChatPanel`                  | Owns chat shell, header, transcript layout, version pane toggle, error strip, input placement | Low          | `keep`      | Main chat container remains useful with a new daemon-backed data source    |
| `MessagesList`               | Owns transcript rendering, virtualization, undo/retry footer actions, setup banners           | Low          | `keep`      | Needs new runtime data but not XML semantics                               |
| `ChatMessage` outer shell    | Owns assistant/user bubble chrome, timestamps, request-id copy, model label, metadata footer  | Medium       | `adapter`   | The message body render path changes, but shell and metadata remain useful |
| `PlainMarkdownParser`        | Renders normal markdown for user content and non-action prose                                 | None         | `keep`      | Remains useful for plain transcript content                                |
| `StreamingLoadingAnimation`  | Shows initial and in-stream assistant activity                                                | None         | `keep`      | Independent of XML                                                         |
| `ChatError` / `ChatErrorBox` | Displays stream or proposal errors and recovery affordances                                   | Low          | `keep`      | Runtime source changes, surface remains valid                              |

## 5.2 Composer and Operator Surfaces

| Surface                     | Current Role                                                                                                                      | XML Coupling | Disposition | Notes                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- | ------------------------------------------------------------ |
| `ChatInput` compose shell   | Owns prompt input, submit/cancel, attachment flow, queue controls, context banners, selected components, consent banner placement | Low          | `keep`      | High reuse value for mainline daemon work                    |
| `LexicalChatInput`          | Rich editor surface for composing prompts                                                                                         | None         | `keep`      | Runtime-agnostic compose surface                             |
| `AttachmentsList`           | Shows pending file attachments                                                                                                    | None         | `keep`      | Still useful for daemon-backed attachments                   |
| `DragDropOverlay`           | Drag-and-drop affordance                                                                                                          | None         | `keep`      | Runtime-agnostic                                             |
| `FileAttachmentTypeDialog`  | Confirms attachment classification                                                                                                | None         | `keep`      | Runtime-agnostic                                             |
| `QueuedMessagesList`        | Multi-message queue UI while a run is active                                                                                      | Low          | `keep`      | Valuable if daemon path preserves queued submission behavior |
| `AgentConsentBanner`        | Displays consent requests and collects decisions                                                                                  | Low          | `keep`      | Strong fit for structured approval events                    |
| `TodoList`                  | Displays active task/todo state                                                                                                   | Low          | `keep`      | Valuable if new daemon streams task or plan items            |
| `QuestionnaireInput`        | Displays runtime-requested questionnaire input                                                                                    | Low          | `adapter`   | Keep if new daemon uses structured request-for-input events  |
| `SelectedComponentsDisplay` | Shows selected visual components attached to prompt                                                                               | None         | `keep`      | Host/UI-specific surface remains valid                       |
| `ContextLimitBanner`        | Shows context-window warning                                                                                                      | Low          | `adapter`   | Keep, but feed from new daemon or new counting path          |
| `TokenBar`                  | Displays token and context details                                                                                                | Medium       | `adapter`   | Reuse likely, but depends on future token/context model      |
| `AuxiliaryActionsMenu`      | Entry point for attachments and context controls                                                                                  | Low          | `keep`      | Useful regardless of XML removal                             |

## 5.3 Version and History Surfaces

| Surface                                 | Current Role                                                      | XML Coupling | Disposition | Notes                                                                           |
| --------------------------------------- | ----------------------------------------------------------------- | ------------ | ----------- | ------------------------------------------------------------------------------- |
| `VersionPane`                           | Git-style version timeline, checkout, restore, DB snapshot badges | Low          | `adapter`   | Likely reusable, but depends on how the daemon line projects edits and versions |
| `HistoryNavigation`                     | Chat history navigation UI                                        | None         | `keep`      | Independent of XML parsing                                                      |
| `DeleteChatDialog` / `RenameChatDialog` | Chat management dialogs                                           | None         | `keep`      | Unaffected by parser removal                                                    |

## 5.4 Assistant Action Cards

| Surface Group                                                                                                                                                          | Current Role                                                     | XML Coupling                     | Disposition | Notes                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `ActionCardPrimitives`                                                                                                                                                 | Generic visual building blocks for action cards                  | Low                              | `keep`      | Useful under any structured event adapter                                   |
| File and code cards: `ActionRead`, `ActionGrep`, `ActionListFiles`, `ActionCodeSearch`, `ActionCodeSearchResult`, `ActionCodebaseContext`                              | Show read/search/context operations                              | High today, low after adaptation | `adapter`   | Good candidates for a new event-to-card adapter registry                    |
| Edit cards: `ActionWrite`, `ActionEdit`, `ActionSearchReplace`, `ActionRename`, `ActionDelete`, `ActionAddDependency`                                                  | Show file mutation intent or result                              | High today, low after adaptation | `adapter`   | Keep presentational surfaces if the new daemon emits structured edit events |
| Output and status cards: `ActionOutput`, `ActionProblemSummary`, `ActionStatus`, `ActionCompaction`, `ActionThink`                                                     | Show warnings, errors, status, compaction, thinking-style events | High today, low after adaptation | `adapter`   | Keep only if event semantics remain useful                                  |
| MCP and web cards: `ActionMcpToolCall`, `ActionMcpToolResult`, `ActionWebSearch`, `ActionWebSearchResult`, `ActionWebCrawl`                                            | Show tool activity and external-query results                    | High today, low after adaptation | `adapter`   | Valuable if tool activity is projected visibly in the new daemon lane       |
| Data and integration cards: `ActionDatabaseSchema`, `ActionSupabaseTableSchema`, `ActionSupabaseProjectInfo`, `ActionAddIntegration`, `ActionExecuteSql`, `ActionLogs` | Show domain-specific operations                                  | High today, low after adaptation | `adapter`   | Keep only if these operation types still exist in mainline runtime          |
| Plan cards: `ActionWritePlan`, `ActionExitPlan`                                                                                                                        | Show plan-mode plan/exit-plan outputs                            | High today, low after adaptation | `adapter`   | Survive only through a structured planning protocol, not XML                |

## 5.5 XML-Era Glue and Debris

| Surface                                 | Current Role                                                                  | XML Coupling | Disposition        | Notes                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------ | ------------------ | ------------------------------------------------------------------------------- |
| `ActionMarkdownParser`                  | Parses assistant markdown, extracts Dyad custom tags, dispatches action cards | Total        | `delete-candidate` | Main XML coupling point that should not survive default mainline path           |
| `DYAD_CUSTOM_TAGS` registry             | Enumerates XML-like assistant tags                                            | Total        | `delete-candidate` | Replace with structured event schema, not a tag allowlist                       |
| `preprocessUnclosedTags`                | Repairs unclosed XML tags during streaming                                    | Total        | `delete-candidate` | Repairing malformed XML should not remain part of the default render contract   |
| `parseCustomTags`                       | Splits markdown and custom-tag content pieces                                 | Total        | `delete-candidate` | Replace with event projection, not tag parsing                                  |
| `renderCustomTag`                       | Maps tag names to action card components                                      | Total        | `delete-candidate` | Replace with event adapter registry keyed by structured event type              |
| `dyad-chat-summary` hidden-tag behavior | Hides internal XML summary tags from transcript                               | Total        | `delete-candidate` | New runtime should expose summaries structurally, not as hidden transcript tags |
| `FixAllErrorsButton` XML flow           | Parser-triggered follow-up built around multiple XML error outputs            | Total        | `delete-candidate` | Revisit only if a new structured recovery UX is justified                       |
| `WriteCodeProperlyButton`               | Re-prompts assistant to use correct `<dyad-write>` tags                       | Total        | `delete-candidate` | Pure XML-era recovery affordance                                                |
| `write-code-properly` suggested action  | Shortcut into XML-tag remediation                                             | Total        | `delete-candidate` | Remove from mainline once XML default path is gone                              |

6. Orphan-Risk Index

The following surfaces are most likely to become orphaned if XML is removed without an explicit adapter plan:

| Orphan Risk                           | Why It Becomes Orphaned                                               | Needed Replacement                                                                           |
| ------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Action*` cards as a family           | Today they are reached almost entirely through XML tag dispatch       | A structured event-to-card adapter registry                                                  |
| `ChatMessage` assistant body renderer | It currently assumes XML-aware markdown parsing for assistant content | A new assistant body renderer that combines plain markdown with structured event projections |
| `QuestionnaireInput`                  | It depends on runtime requests that may not map 1:1 to current flow   | Structured daemon input-request events                                                       |
| `VersionPane`                         | It assumes current commit/version semantics and proposal lifecycle    | A daemon-to-version-history projection contract                                              |
| `TokenBar` and `ContextLimitBanner`   | They depend on current token counting and context accounting model    | A new context-budget and token-inspection contract                                           |

7. Minimum Adapter Plan

Before default XML removal, the mainline daemon lane should provide at least:

1. `message.agent.markdown`

- Plain assistant prose body.

2. `tool.call.started` / `tool.call.finished`

- Generic visible tool activity.

3. `patch.proposed` / `patch.applied`

- Structured edit and patch surfaces.

4. `approval.requested` / `approval.resolved`

- Consent and approval flow.

5. `task.plan.updated`

- Todo and planning surfaces if retained.

6. `context.stats.updated`

- Token and context budget surfaces.

7. `version.artifact.created`

- Version pane continuity if edit history remains visible.

8. Acceptance and Tests

- This inventory is accepted when:
  - the dispositions are fixed,
  - orphan risks are explicit,
  - and XML removal no longer implies hidden UI loss.
- Before implementation starts, any chat UI work that removes `ActionMarkdownParser` must also specify:
  - how assistant body rendering works afterward,
  - how action cards are fed,
  - and which delete-candidate surfaces are actually being removed.

9. Risks and Guardrails

- Risks:
  - underestimating how much of the current assistant experience passes through parser dispatch;
  - accidentally deleting useful action-card visuals with the parser;
  - preserving XML-era repair UX under new names;
  - assuming version, token, and questionnaire surfaces will automatically survive.
- Guardrails:
  - do not keep parser-era glue just because the cards are useful;
  - do not delete the cards until the structured event adapter exists;
  - do not let `delete-candidate` mean "delete immediately without replacement planning";
  - keep Chaemera-owned UI surfaces even when Codex owns runtime truth.

## Evidence

- path: `../../src/components/ChatPanel.tsx`
  symbol: `Chat shell with header, transcript, input, and version pane`
  lines: 1-203
- path: `../../src/components/chat/MessagesList.tsx`
  symbol: `Transcript virtualization, retry and undo controls, setup banner placement`
  lines: 1-345
- path: `../../src/components/chat/ChatMessage.tsx`
  symbol: `Assistant and user message shell with ActionMarkdownParser dependency`
  lines: 1-245
- path: `../../src/components/chat/ActionMarkdownParser.tsx`
  symbol: `XML parser, custom tag registry, unclosed-tag repair, and action-card dispatch`
  lines: 1-756
- path: `../../src/components/chat/ChatInput.tsx`
  symbol: `Chat compose shell including attachments, consent, queue, todos, token UI, and proposal actions`
  lines: 1-1313
- path: `../../src/components/chat/VersionPane.tsx`
  symbol: `Version history pane and restore flow`
  lines: 1-240

## Links

- [[README.md]]
- [[2026-03-29-codex-logos-daemon-first-roadmap.md]]
- [[2026-03-29-legacy-chat-runtime-capability-audit-matrix.md]]
- [[../05-discussion-templates/discussions/2026-03-28-legacy-xml-agent-surface-audit-and-extraction-boundary.md]]
