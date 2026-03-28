---
id: chaemera-spec-prod-mvp-release-roadmap-2026-03-28
title: Production MVP Release Roadmap
type: spec
status: active
tags: [spec, roadmap, prod, mvp, release, tauri, detachment]
related:
  [
    [../spec-template.md],
    [../../03-templates/strict-spec.template.md],
    [2026-03-02-chaemera-next-phase-product-roadmap.md],
    [2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
    [2026-03-28-rust-logging-backend-contract-and-migration-plan.md],
    [
      ../../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md,
    ],
  ]
depends_on:
  [
    [2026-03-02-chaemera-next-phase-product-roadmap.md],
    [2026-03-28-final-tauri-host-capability-cutover.md],
  ]
generated: false
source_of_truth: governance
outline: []
---

# Production MVP Release Roadmap

1. Start Here

- This document is the canonical orientational roadmap for what still needs to be done before the first production MVP release of Chaemera.
- It translates the current state of the repository, current release strategy, and current open gaps into one release-scoped checklist.
- It is release scope, not post-release architecture work.
- It is intentionally narrower than the broader next-phase roadmap.
- The release target remains:
  - a production-ready `Tauri 2` desktop application,
  - `OSS-first`,
  - `BYOK-first`,
  - with the minimum additional work needed to ship a clean first Chaemera production version.

2. Intent + Non-goals

- Intent:
  - define the complete release-facing worklist for the first production MVP;
  - separate true ship blockers from important but deferrable cleanup;
  - prevent release scope from being diluted by post-release agent architecture work;
  - make hidden Dyad-hosted and premium-shaped dependencies explicit before release.
- Non-goals:
  - no Codex or Logos-style agent-core build before the first production release;
  - no broader Leptos migration;
  - no post-release structured-agent runtime work;
  - no requirement to replace the isolated logging backend before release if the shipped app already works and the release support path remains intact;
  - no full context-system redesign before release.

3. Current Verified State

- The application already has a live Rust/Tauri backend surface and command registry in [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs).
- The repository already has a Tauri release workflow in [`.github/workflows/release-tauri.yml`](../../.github/workflows/release-tauri.yml).
- The Electron runtime cutover is effectively closed for the shipped app:
  - current observed audit on `2026-03-28` reports `entrypointCount: 0` and `electronImportFileCount: 0`;
  - the remaining support-package tail is isolated to [`src/lib/app_logger.ts`](../../src/lib/app_logger.ts).
- The release strategy is already locked:
  - `Tauri 2` first,
  - current `TypeScript + shadcn` UI is acceptable,
  - broader Leptos work is deferred,
  - and first-order Dyad commercial and identity debt should not ship.
- The main open release debts are no longer generic migration debt.
- They are concentrated in:
  - release validation and real desktop runtime gating;
  - Tauri parity debts around secrets and environment behavior;
  - remaining Dyad-hosted and premium-shaped product dependencies;
  - first-order Dyad identity and wording still visible to users and models.

4. Target Outcome

- The first production MVP should ship as:
  - a Tauri-native desktop app;
  - without Electron runtime dependence;
  - without first-order Dyad branding in core user-visible surfaces;
  - without hidden premium-shaped or hosted-engine behavior as a baseline requirement;
  - with validated core app-builder flows on the desktop runtime.
- The release is successful when:
  - key desktop flows work on the actual packaged runtime;
  - hosted and quota-related behavior has been replaced, disabled, or explicitly accepted as temporary with a recorded decision;
  - the shipped product reads as Chaemera rather than a lightly renamed Dyad fork.

5. Locked Decisions

1. The first production release is still `Tauri 2` on the current TypeScript/shadcn UI baseline.
1. Broader Leptos work is not a release prerequisite.
1. The future structured-agent or Codex-derived architecture is not part of this release.
1. The Rust/Tauri application backend is already part of current release scope and already exists.
1. The isolated logging-backend replacement behind `src/lib/app_logger.ts` is not a blocker unless it proves to break release diagnostics.
1. Release work must focus on:
   - validation,
   - parity,
   - product detachment,
   - branding cleanup,
   - and packaging/operations readiness.
1. Any remaining dependency on `dyad.sh`, `api.dyad.sh`, `engine.dyad.sh`, `oauth.dyad.sh`, or `supabase-oauth.dyad.sh` must be explicitly classified before ship as one of:
   - replace before release,
   - disable before release,
   - or temporarily retain with an explicit decision and user-facing implication.
1. The first production MVP should not ship with first-order `You are Dyad` model identity in its main prompts.
1. The first production MVP should not ship with first-order `Need help with Dyad?`, `Dyad Logo`, or equivalent top-level UX wording in primary user-facing surfaces.

1. Release Scope Classification

6.1. `P0` Must Ship

1. Release validation and desktop runtime gate
2. Tauri parity debt closure for secrets and environment behavior
3. Hosted/premium detachment for baseline product behavior
4. First-order branding and identity cleanup
5. Final release packaging and acceptance sweep

6.2. `P1` Important but not absolute ship blocker

1. Isolated `electron-log` backend replacement
2. Full cleanup of developer/test-only Electron leftovers
3. Wider docs migration and docs governance automation
4. Broader context-system redesign

6.3. Deferred after first production MVP

1. Codex or Logos-style structured agent core
2. Host-daemon split
3. Terminal-first agent runtime
4. New post-release protocol model
5. Leptos stage re-evaluation

6. Implementation Tasks (ordered)

7. Close the release validation gate.

- Make the release gate explicit and reproducible.
- Required baseline commands remain:
  - `npm run ts`
  - `npm run build`
  - `npm run check:tauri`
- In addition, the release must pass:
  - the broader `tauri-regression` lane,
  - and at least one real desktop runtime gate against the Tauri application, not only the browser harness.

2. Close the hard Tauri parity debts.

- Resolve or provide a release-safe migration path for credentials previously stored with Electron `safeStorage`.
- Today the Tauri path still explicitly fails on those legacy encrypted tokens for:
  - Neon
  - Supabase
- Validate GUI-launched shell PATH behavior and Node/PNPM discovery under the actual Tauri desktop runtime.
- Treat preview proxy and `check-problems` as release-critical runtime features and validate them in the native desktop lane, not only through smoke/browser coverage.

3. Classify every remaining Dyad-hosted dependency.

- Build one explicit table for each remaining external Dyad-owned dependency and choose:
  - replace,
  - disable,
  - or explicitly retain for v1.
- This applies at minimum to:
  - hosted engine access,
  - free quota logic,
  - bug/session log upload endpoints,
  - GitHub issue links,
  - docs links,
  - Supabase OAuth endpoints,
  - Neon OAuth endpoints,
  - template API endpoints,
  - release-note URLs.

4. Remove or neutralize premium-shaped and hosted baseline behavior.

- The first production MVP should not depend on `enableDyadPro`, hosted-engine override behavior, or Dyad-controlled quota logic as a baseline product path.
- For any still-retained legacy switch or schema field, separate:
  - storage compatibility,
  - from active product behavior.
- If some naming cannot be safely removed before release, hide or neutralize it in user-facing UX and record the debt explicitly.

5. Remove first-order Dyad identity debt.

- Update main prompts so the model no longer self-identifies as `Dyad`.
- Update primary help and title-bar surfaces so the user no longer sees `Dyad` as the product name.
- Audit other obvious top-level surfaces:
  - help dialogs,
  - error/report links,
  - promo/help text,
  - Cloud AI wording,
  - remaining `Dyad` labels in the main UX.

6. Finalize release operations.

- Validate the Tauri release workflow on the actual target matrix.
- Confirm the expected platform policy for the first release:
  - Windows
  - macOS ARM
  - macOS Intel
  - Linux
- Confirm installer, artifact, and signing/notarization expectations per platform.
- Confirm whether the first prod release is intended to be:
  - a full public release,
  - or a controlled draft/beta release with limited support guarantees.

7. Run the final ship checklist.

- The checklist must cover at least:
  - create app;
  - import app;
  - run/stop/restart app;
  - preview and console;
  - chat/build path;
  - version history and revert;
  - GitHub flows;
  - Supabase flows;
  - Neon flows;
  - Vercel flows;
  - Node detection and custom node path;
  - bug report and session debug bundle.

8. Record explicit release decisions for anything not fixed.

- Nothing should remain as an unclassified hidden dependency.
- If a Dyad-hosted surface survives into the first prod release, record:
  - why it remains;
  - whether the user is exposed to it;
  - what the rollback or replacement plan is.

8. Requirement -> Task -> Test -> Gate

1. Requirement: the first prod MVP must ship as a real Tauri desktop app.

- Task: pass all TypeScript, build, Rust, and desktop runtime gates.
- Test: `npm run ts`, `npm run build`, `npm run check:tauri`, `tauri-regression`, and at least one real desktop runtime lane all pass.
- Gate: no first prod release without a real Tauri desktop runtime validation pass.

2. Requirement: the release must not regress on legacy Electron-secret users.

- Task: migrate, reset, or clearly handle `electron-safe-storage` legacy credentials for Neon and Supabase.
- Test: legacy-secret scenarios are either supported or explicitly surfaced with a safe user recovery path.
- Gate: no silent credential failure path on first launch for upgraded users.

3. Requirement: the release must work under actual desktop environment constraints.

- Task: validate PATH and command-discovery behavior for GUI-launched shells.
- Test: Node and PNPM detection works under packaged or desktop-run conditions on supported platforms.
- Gate: no release if GUI launch can strand the app without a viable Node/PNPM path on a supported platform.

4. Requirement: the product must not ship with hidden Dyad-hosted or premium-shaped core assumptions.

- Task: classify and resolve hosted engine, quota, upload, OAuth, docs, and template dependencies.
- Test: every such dependency is either removed, disabled, replaced, or explicitly accepted by decision record.
- Gate: no unclassified hidden Dyad-hosted dependency remains.

5. Requirement: the shipped product must read as Chaemera.

- Task: remove first-order Dyad wording from core prompts and primary UI surfaces.
- Test: main prompts, title bar, and primary help surfaces no longer present the app as Dyad.
- Gate: no first prod release with obvious Dyad self-identification in top-level user or model surfaces.

9. Acceptance and Tests

- Minimum technical acceptance:
  - `npm run ts`
  - `npm run build`
  - `npm run check:tauri`
  - targeted `vitest`
  - `npm run e2e:tauri-regression`
  - native desktop validation via the Tauri runtime lane
- Minimum product acceptance:
  - app creation/import works;
  - preview/run/restart works;
  - build-mode chat works;
  - version and revert work;
  - debug bundle/help path works;
  - supported integrations either work or are explicitly deferred/disabled;
  - top-level product identity reads as Chaemera.
- Minimum release acceptance:
  - Tauri release workflow is verified on the intended release branch/process;
  - platform support expectations are written down;
  - any remaining Dyad-hosted dependency is explicitly accepted or removed.

10. Promotion Artifacts

- A release checklist document or note for the final ship pass.
- Decision notes for any retained external Dyad-hosted dependency.
- Updated validation records if release scope changes materially.
- Updated navigation metadata after this roadmap is promoted.

11. Risks and Rollback

- Risks:
  - shipping with hidden hosted dependencies that later fail outside the original Dyad environment;
  - treating browser-backed regression as sufficient desktop validation;
  - leaving old encrypted credentials in a broken but non-obvious state;
  - shipping with Chaemera packaging but Dyad-facing language in prompts and UI;
  - broadening scope into post-release agent work and missing the production window.
- Rollback:
  - defer non-essential cleanup instead of widening scope;
  - record explicit keep/defer decisions for hosted surfaces;
  - keep the first release focused on Tauri stability and product detachment, not on reinventing the AI layer.

12. Agent Guardrails

- Do not treat post-release agent architecture as current release work.
- Do not reopen Leptos migration as a prerequisite for this release.
- Do not ship with hidden or unclassified Dyad-hosted dependencies.
- Do not accept browser-only validation as the final desktop release signal.
- Do not confuse `electron-log` backend replacement with the existence of the required Rust/Tauri app backend.

## Evidence

- path: `docs-new/04-sprint-workflow/specs/2026-03-02-chaemera-next-phase-product-roadmap.md`
  symbol: `Track order and current release direction`
  lines: 29-48, 67-109
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-final-tauri-host-capability-cutover.md`
  symbol: `Final current-release Tauri cutover scope`
  lines: 30-44, 111-181, 198-214
- path: `notes/2026-03-13-tauri-cutover-checkpoint.md`
  symbol: `Open gaps and current release strategy`
  lines: 33-54, 142-149
- path: `src-tauri/src/lib.rs`
  symbol: `Registered Tauri application backend commands`
  lines: 47-220
- path: `.github/workflows/release-tauri.yml`
  symbol: `Tauri production release workflow`
  lines: 1-79
- path: `package.json`
  symbol: `Current Tauri build, regression, and runtime scripts`
  lines: 14-64
- path: `src/lib/app_logger.ts`
  symbol: `Remaining isolated electron-log support tail`
  lines: 1-43
- path: `scripts/audit-electron-legacy-surface.js`
  symbol: `Electron legacy surface audit implementation`
  lines: 11-39, 159-175
- path: `src-tauri/src/wave_aa_domains.rs`
  symbol: `Neon legacy electron-safe-storage failure in Tauri path`
  lines: 193-212
- path: `src-tauri/src/wave_z_domains.rs`
  symbol: `Supabase legacy electron-safe-storage failure in Tauri path`
  lines: 211-230
- path: `src-tauri/src/wave_g_domains.rs`
  symbol: `Tauri PATH discovery and Node/PNPM runtime behavior`
  lines: 40-117, 230-314, 361-364
- path: `src/ipc/utils/get_model_client.ts`
  symbol: `Hosted engine override through enableDyadPro and engine.dyad.sh`
  lines: 74-127
- path: `src/ipc/handlers/free_agent_quota_handlers.ts`
  symbol: `Dyad-hosted free quota logic`
  lines: 15-190
- path: `src/components/HelpDialog.tsx`
  symbol: `Dyad-branded help surface, issue flow, and upload endpoint`
  lines: 69-120, 289-447
- path: `src/app/TitleBar.tsx`
  symbol: `Dyad-branded title bar alt text`
  lines: 46-52
- path: `src/prompts/system_prompt.ts`
  symbol: `Build prompt identifies the model as Dyad`
  lines: 62-64
- path: `src/prompts/local_agent_prompt.ts`
  symbol: `Local-agent prompt identifies the model as Dyad`
  lines: 10-13, 143-147
- path: `src/prompts/plan_mode_prompt.ts`
  symbol: `Plan prompt identifies the model as Dyad Plan Mode`
  lines: 1-4
- stack_equivalent: `2026-03-28 local run: node scripts/audit-electron-legacy-surface.js`
  observation: `entrypointCount: 0, electronImportFileCount: 0, supportPackageImportFileCount: 1`

## Links

- [[../spec-template.md]]
- [[../../03-templates/strict-spec.template.md]]
- [[2026-03-02-chaemera-next-phase-product-roadmap.md]]
- [[2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md]]
- [[2026-03-28-final-tauri-host-capability-cutover.md]]
- [[2026-03-28-rust-logging-backend-contract-and-migration-plan.md]]
- [[../../05-discussion-templates/discussions/2026-03-01-tauri-release-cutover-vs-regression.md]]
