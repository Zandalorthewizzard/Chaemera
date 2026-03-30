# 2026-03-29 Codex-Logos Phase Foundation

Status: working note, non-canonical.

## What Changed

- A new separated documentation lane now exists under `docs-new/07-codex-logos-phase/`.
- The active mainline architecture is no longer framed as `post-release only`.
- The active mainline direction is now:
  - `Codex as-is`
  - headless daemon
  - Chaemera as host/UI
  - OpenCode Desktop as explicit topology inspiration
- Legacy XML/chat-runtime repair remains active only on a separate feature branch and is not the mainline path.

## Canonical Docs Added

1. `docs-new/07-codex-logos-phase/README.md`
2. `docs-new/07-codex-logos-phase/2026-03-29-codex-logos-daemon-first-roadmap.md`
3. `docs-new/07-codex-logos-phase/2026-03-29-legacy-chat-runtime-capability-audit-matrix.md`
4. `docs-new/07-codex-logos-phase/2026-03-29-chat-ui-post-xml-surface-inventory.md`

## Historical Reclassification

- `docs-new/04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
- `docs-new/04-sprint-workflow/specs/2026-03-28-post-release-agent-core-boundary-and-host-daemon-architecture.md`

Both are now intentionally marked `historical` to avoid split-brain roadmap ownership.

## Branch Proposal Recorded

- checkpoint tag:
  - `checkpoint-2026-03-29-pre-codex-logos-pivot`
- checkpoint branch:
  - `checkpoint/2026-03-29-pre-codex-logos-pivot`
- new mainline daemon branch:
  - `feature/codex-logos-daemon`
- isolated legacy repair branch:
  - `feature/legacy-chat-runtime-repair`

## What The New Docs Already Lock

- OpenCode is named explicitly as inspiration for daemon plus desktop topology.
- The capability audit now has:
  - matrix structure,
  - strict statuses,
  - scenario list,
  - execution order.
- The post-XML UI inventory now has:
  - `keep`,
  - `adapter`,
  - `delete-candidate`,
  - `unknown`
    classifications.

## Next Likely Canonical Docs

1. host/daemon protocol boundary spec
2. session truth and persistence model spec
3. agent terminal vs app console boundary spec
4. capability gateway spec
5. first daemon integration slice spec

## Practical Resume Point

- Do not reopen discussion about whether legacy XML repair is the mainline direction.
- The mainline question is now:
  - what host-owned surfaces remain,
  - what protocol boundary Chaemera needs,
  - and what minimum structured event contract is required to drive the reused UI.
