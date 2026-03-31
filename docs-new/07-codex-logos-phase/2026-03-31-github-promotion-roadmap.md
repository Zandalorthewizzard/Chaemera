---
id: chaemera-spec-github-promotion-roadmap-2026-03-31
title: GitHub Promotion Roadmap For Release-Line MVP
type: spec
status: active
tags: [spec, github, promotion, release, mvp, community]
related:
  [
    [README.md],
    [2026-03-30-release-line-mvp-roadmap.md],
    [2026-03-31-agent-oriented-mvp-release-cut-checklist.md],
    [../../README.md],
    [../../package.json],
    [../../CONTRIBUTING.md],
    [../../SECURITY.md],
    [../../CLA.md],
    [../../.github/workflows/release-tauri.yml],
    [../../.github/ISSUE_TEMPLATE/bug_report.md],
  ]
depends_on:
  [
    [2026-03-30-release-line-mvp-roadmap.md],
    [2026-03-31-agent-oriented-mvp-release-cut-checklist.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# GitHub Promotion Roadmap For Release-Line MVP

## 1. Start Here

1. This document defines the minimum GitHub-facing promotion and public-presentation work required before or alongside the current MVP release cut.
2. It exists because the product is close to release-ready, but the public GitHub shell still shows mixed identity, legacy links, and incomplete trust surfaces.
3. It is intentionally narrower than a full website launch or broad social-media campaign.
4. The controlling question is simple:

- if a new user lands on the GitHub repo first, can they understand what Chaemera is, trust it, download it, and tell what is and is not shipping in MVP?

## 2. Intent + Non-goals

1. Intent:

- turn GitHub into a credible first public landing surface for the MVP;
- define the ordered GitHub-promotion tasks we can review and approve one by one;
- separate `must fix before public MVP`, `strongly recommended`, and `post-release polish`;
- prevent the release from reading like a lightly renamed Dyad fork with conflicting signals.

2. Non-goals:

- no full website or multi-network campaign is required before this roadmap is useful;
- no claim that future `Codex/Logos` runtime work ships in the MVP;
- no rewrite of the underlying release-line MVP scope;
- no assumption that every GitHub setting can be versioned inside the repo tree.

## 3. Target Outcome

1. The repo should work as a coherent MVP landing page:

- the top-level product identity reads as `Chaemera`;
- the first screen explains the value proposition in under 30 seconds;
- the visitor can find download or install steps immediately;
- community-health and contributor or legal surfaces do not contradict the product identity;
- release notes and support expectations are visible enough that the MVP looks intentional rather than accidental.

2. The promotion shell is successful when:

- the repo can be linked publicly without an apology or extra explanation;
- the README and release page do not redirect users to Dyad-owned product surfaces as the default next step;
- and the GitHub page reflects the real release-line promise instead of future architecture ambitions.

## 4. Locked Decisions

1. GitHub is the primary public surface for the first MVP promotion pass.
2. The public MVP narrative must lead with what ships now:

- packaged `Tauri` desktop app;
- local-first posture;
- `OSS-first`;
- `BYOK-first`;
- and the supported release-line `Legacy XML` plus `MCP` scope.

3. The public GitHub narrative must not lead with future `Codex/Logos` architecture as if it already ships.
4. README is the primary landing asset and must be treated as product copy, not only contributor documentation.
5. Public GitHub surfaces must either be:

- Chaemera-owned and aligned;
- explicitly historical;
- or clearly deferred.

6. Any remaining Dyad-branded or Dyad-routed public file must be classified as:

- replace before MVP;
- temporarily keep with explicit reason;
- or defer only if it is not part of the public-facing landing path.

7. Manual repo settings outside the repo tree must still be tracked in this roadmap as checklist items:

- `About` description;
- homepage URL;
- topics;
- social preview image;
- pinned release, issue, or discussion choices.

## 5. Release Fit

1. The active release-line roadmap already locks the product-side MVP scope to packaged `Tauri`, stable `Legacy XML`, and final-phase `MCP`.
2. This promotion roadmap does not reopen that scope.
3. Its job is to translate the current release-line truth into a public GitHub shell that matches what is actually shipping.
4. That matters because the current public repo shows split identity:

- product metadata and release workflow are already Chaemera-owned;
- but README, contributing, security, CLA, and issue filing still expose Dyad-branded copy or Dyad-routed links.

5. This is release work, not cosmetic cleanup:

- mixed public identity weakens trust;
- confuses the fork thesis;
- and makes MVP launch messaging harder than it needs to be.

## 6. Current Surface Audit

| Surface                                                               | Current observed state                                                                     | Public impact                                     | Roadmap disposition        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------- |
| Root `README.md`                                                      | Opens as `Dyad`, links to `dyad.sh`, and points community flow to `r/dyadbuilders`         | Wrong first impression and broken fork identity   | `P0 replace`               |
| `package.json`                                                        | Repo metadata and product name already say `Chaemera`                                      | Positive identity anchor                          | `keep`                     |
| Tauri release workflow                                                | Release tags and names already use `Chaemera`                                              | Positive release anchor                           | `keep`                     |
| `CONTRIBUTING.md`                                                     | Still describes the project as Dyad and Electron-based                                     | Contributor confusion                             | `P0 align`                 |
| `SECURITY.md`                                                         | Still tells users security support belongs to Dyad and points advisories to `dyad-sh/dyad` | Trust and reporting confusion                     | `P0 align`                 |
| `CLA.md`                                                              | Still grants rights to `Dyad Tech, Inc.` and defines the project as Dyad                   | Legal mismatch risk, not just branding debt       | `P0 legal classification`  |
| Issue templates                                                       | Present, but bug-report guidance still points to `dyad.sh` help docs                       | Public support path still leaks upstream          | `P0 align`                 |
| `CODE_OF_CONDUCT.md`                                                  | No file found in repo root or `.github/` from local tree inspection on `2026-03-31`        | Missing community-health surface for OSS launch   | `P1 add or explicit defer` |
| Repo `About` block, homepage, topics, social preview, pinned surfaces | `UNKNOWN` from repo tree alone because they live in GitHub settings                        | Cannot be silently assumed complete               | `P0 manual checklist`      |
| GitHub Discussions setup                                              | `UNKNOWN` from repo tree alone                                                             | Optional community funnel, but must be deliberate | `P1 decide or defer`       |

## 7. Implementation Tasks (ordered)

### 7.1. Phase 0 - Public MVP positioning lock

1. Approve one short GitHub description line for the repo.
2. Approve one README headline and one-paragraph product thesis.
3. Approve one short `Why this fork exists` block.
4. Lock the public split between:

- `ships in MVP now`;
- `planned after MVP`;
- and `future Codex/Logos mainline`.

5. Decide whether the first public GitHub release posture is:

- `public MVP`;
- `public beta`;
- or `draft release for controlled testing`.

6. Exit criteria:

- no split messaging between README, release notes, and issue templates;
- no unresolved ambiguity about whether `Codex/Logos` is current or future.

### 7.2. Phase 1 - P0 GitHub landing surface

1. Rewrite root `README.md` as the product landing page.
2. Replace first-screen Dyad branding, Dyad-only links, and default upstream routing.
3. Add a fast visitor flow in README:

- what Chaemera is;
- why it exists;
- current MVP scope;
- how to download or install;
- what platforms are supported;
- and where to get help.

4. Add a visible `Why Chaemera` or `Why this fork exists` section.
5. Add a minimal `Now` versus `After MVP` roadmap block so future work does not masquerade as shipped functionality.
6. Prepare the manual GitHub settings checklist for:

- `About` description;
- homepage URL;
- topics;
- and social preview image.

7. Exit criteria:

- a first-time visitor can understand the repo without external explanation;
- the repo no longer opens with `# Dyad`.

### 7.3. Phase 2 - P0 public trust and community-health surfaces

1. Align `CONTRIBUTING.md` with Chaemera identity and the current Tauri-based release line.
2. Align `SECURITY.md` so security reporting does not default to upstream Dyad ownership.
3. Classify `CLA.md` explicitly as one of:

- keep because it is legally intentional for this fork;
- rewrite to Chaemera ownership;
- or disable the CLA workflow until legal ownership is clear.

4. Audit issue templates and remove default Dyad doc links or Dyad-only support language.
5. Decide whether to add `CODE_OF_CONDUCT.md` before MVP or explicitly defer it with written rationale.
6. Exit criteria:

- no public contributor, support, or legal file tells users they are interacting with Dyad by default unless that fact is explicit and intentional.

### 7.4. Phase 3 - P0 release surface

1. Prepare a release-note structure for the first GitHub MVP release.
2. Confirm the GitHub release page will clearly answer:

- what changed;
- how to install;
- which platforms are supported;
- whether the release is MVP, beta, or stable;
- and what the known limitations are.

3. Confirm asset naming stays Chaemera-owned and matches the Tauri release workflow.
4. Decide whether README should point users to:

- GitHub Releases directly;
- or an external homepage that is actually Chaemera-owned and ready.

5. Exit criteria:

- the first public release page does not require out-of-band explanation to install or evaluate the app.

### 7.5. Phase 4 - P1 proof and trust polish

1. Add one hero GIF or screenshot set to README.
2. Add a short comparison section such as:

- `Why not just Dyad?`
- `Why local-first?`
- or `What is in scope for this MVP?`

3. Add a minimal FAQ if repeated confusion remains likely.
4. Decide whether to enable and pin a GitHub Discussion for:

- showcase builds;
- release feedback;
- or MVP support questions.

5. Exit criteria:

- the repo feels deliberate and not merely cleaned enough to ship.

### 7.6. Phase 5 - P2 post-release growth loop

1. Add ongoing release-digest cadence on GitHub Releases.
2. Add a showcase or examples lane once real community output exists.
3. Add optional repo-level funding, website, or deeper docs surfacing later.
4. Revisit Discussions structure once inbound traffic justifies moderation overhead.

## 8. Requirement -> Task -> Test -> Gate

1. Requirement: the repo identity must read as Chaemera.

- Task: rewrite public root and support files that still default to Dyad.
- Test: README, contributing, security, and issue filing no longer introduce the project as Dyad by default.
- Gate: no public MVP push while the root GitHub page still opens with `# Dyad`.

2. Requirement: a first-time visitor must find the install or download path quickly.

- Task: add clear README and release navigation to the real install surface.
- Test: a GitHub visitor can reach release assets or approved install instructions in one click.
- Gate: no public release announcement with a missing or indirect install path.

3. Requirement: public scope must match shipped scope.

- Task: describe current MVP and future roadmap separately.
- Test: README and release notes do not present `Codex/Logos` mainline work as shipped functionality.
- Gate: no misleading future-architecture promise on the landing page.

4. Requirement: community-health and legal surfaces must be coherent.

- Task: align `CONTRIBUTING.md`, `SECURITY.md`, `CLA.md`, issue templates, and the code-of-conduct decision.
- Test: contributor and security paths no longer contradict repo ownership or product identity.
- Gate: no silent retention of inaccurate legal or security ownership text.

5. Requirement: GitHub promotion work must stay reviewable.

- Task: track each `P0` item with an explicit disposition.
- Test: every `P0` item is either `approved`, `published`, or `deferred with reason`.
- Gate: no public GitHub sweep done ad hoc from memory.

## 9. Acceptance and Tests

1. `P0` promotion acceptance requires all of the following:

- README rewrite approved;
- GitHub settings checklist written down;
- `CONTRIBUTING.md`, `SECURITY.md`, `CLA.md`, and issue-template dispositions recorded;
- first release-note structure prepared;
- and the install or download path made explicit.

2. `P1` promotion acceptance requires:

- a hero GIF or screenshot set;
- a short comparison or FAQ block;
- and a deliberate Discussions or pinned-surface decision.

3. Manual verification checklist:

- open the repo as a first-time visitor;
- verify the first three screenfuls answer:
  - what is this;
  - why does it exist;
  - what ships now;
  - how do I install it;
  - and where do I get help;
- open the issue filing flow and verify the text does not push the user upstream accidentally;
- open the intended release page and verify the install and limitation story is clear.

## 10. Promotion Artifacts

1. Approved root `README.md` rewrite.
2. Approved repo `About` line, homepage URL, topics list, and social-preview checklist.
3. Approved first MVP release-note template or draft.
4. Updated contributor, security, legal, and issue-template surfaces, or explicit defer records for each.
5. Optional hero screenshot or GIF pack.
6. Optional launch-post copy for GitHub Release body, pinned discussion, or first public announcement.

## 11. Risks and Rollback

1. Risks:

- mixed Dyad and Chaemera identity makes the launch look careless;
- legal or security text may be inaccurate, not merely cosmetically outdated;
- future `Codex/Logos` work may be oversold and damage trust;
- too many secondary surfaces may be polished before the core README and release path are fixed;
- manual GitHub settings may be forgotten because they do not live in the repo tree.

2. Rollback and containment:

- if a legal surface cannot be corrected quickly, classify it explicitly instead of pretending it is fine;
- if screenshots or GIFs lag, ship a text-complete README first;
- use GitHub as the MVP landing surface before widening scope into a full marketing-site dependency;
- keep `P0` narrow and decisive.

## 12. Agent Guardrails

1. Do not market post-MVP `Codex/Logos` work as current MVP functionality.
2. Do not rewrite public legal or security text as if ownership is settled when it is not.
3. Do not treat manual repo settings as complete just because in-repo files were updated.
4. Do not keep Dyad branding in first-screen GitHub surfaces by accident.
5. Do not broaden this roadmap into full social-media campaign management.

## Evidence

- path: `../../README.md`
  symbol: `Current GitHub landing page still opens as Dyad and routes users to dyad.sh`
  lines: 1-29
- path: `../../package.json`
  symbol: `Repo metadata and product name already identify the project as Chaemera`
  lines: 2-23, 192-195
- path: `../../.github/workflows/release-tauri.yml`
  symbol: `Draft GitHub release workflow already publishes Chaemera-named Tauri assets`
  lines: 1-79
- path: `../../CONTRIBUTING.md`
  symbol: `Contributor guide still describes the project as Dyad and Electron-based`
  lines: 1-16, 52-60, 98-105
- path: `../../SECURITY.md`
  symbol: `Security policy still names Dyad and points advisories to dyad-sh/dyad`
  lines: 1-9
- path: `../../CLA.md`
  symbol: `CLA still grants rights to Dyad Tech, Inc. and defines the project as Dyad`
  lines: 1-21, 38-72
- path: `../../.github/ISSUE_TEMPLATE/bug_report.md`
  symbol: `Bug-report template still points users to dyad.sh help docs`
  lines: 1-14
- stack_equivalent: `2026-03-31 local tree inspection: Get-ChildItem -Recurse .github and repo root`
  observation: `Issue templates and release workflows exist; no CODE_OF_CONDUCT.md was found in repo root or .github; manual GitHub repo settings remain unobservable from the repo tree`

## Links

- [[README.md]]
- [[2026-03-30-release-line-mvp-roadmap.md]]
- [[2026-03-31-agent-oriented-mvp-release-cut-checklist.md]]
- [[../../README.md]]
- [[../../package.json]]
- [[../../CONTRIBUTING.md]]
- [[../../SECURITY.md]]
- [[../../CLA.md]]
- [[../../.github/workflows/release-tauri.yml]]
- [[../../.github/ISSUE_TEMPLATE/bug_report.md]]
