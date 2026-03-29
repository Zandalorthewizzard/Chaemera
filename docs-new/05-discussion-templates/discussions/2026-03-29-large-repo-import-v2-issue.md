---
id: chaemera-issue-large-repo-import-v2-2026-03-29
title: Large-Repo Import v2 for Existing External and Legacy App Folders
type: issue
status: open
tags: [issue, import, tauri, rust, monorepo, windows]
related:
  [
    [../README.md],
    [../../04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md],
    [
      ../../04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md,
    ],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Large-Repo Import v2 for Existing External and Legacy App Folders

## Description

1. The current local app import path is implemented as a direct recursive folder copy followed by app registration in SQLite.
2. This is fragile for large existing repositories, especially Windows pnpm workspaces and multi-repo trees that contain `node_modules`, reparse points, junctions, caches, and already-initialized `.git` state.
3. In that shape, import can partially copy data into `chaemera-apps` but still fail before the `apps` table insert, which leaves the user with no visible app entry and little explanation.

## Discovery Context

1. The issue surfaced during packaged Tauri smoke work while testing migration from existing local app folders, including a real project under `C:\Users\zand\dyad-apps\IV`.
2. Smaller local projects imported successfully, which narrowed the problem away from "legacy Dyad app format" and toward the implementation details of the copy pipeline itself.
3. The current release-safe import path is good enough for small repos, but it is not a reliable onboarding path for the kind of large real-world repos that users already run inside Dyad.

## Impact

1. This weakens Chaemera's migration story for existing users with large workspaces.
2. It creates a bad failure mode on Windows: the filesystem can be modified before the app is registered, and the UI gets no trustworthy structured explanation of what happened.
3. It also makes copy-mode import do too much work by default when the user may only need one of three different behaviors:
   - attach an existing repo in place,
   - copy only source state into `chaemera-apps`,
   - or perform a full clone of the installed working tree.

## Proposed Resolution

1. Replace the current single-mode importer with a Rust-owned `Import v2` pipeline that makes the strategy explicit.
2. The Rust layer should expose three import strategies:
   - `attach_in_place`
   - `managed_source_copy`
   - `full_clone`
3. The Rust layer should perform a `preflight` scan before any mutation:
   - detect `.git`
   - detect `node_modules`
   - detect symlinks, junctions, and reparse points
   - estimate file count and size
   - detect common workspace shapes such as pnpm, turbo, or nx
4. The Rust layer should execute copy-based imports through a `staging transaction`:
   - copy into a temp directory under the managed app root
   - validate the copied result
   - atomically move the staged result into the final app directory
   - only then insert the app/chat rows into SQLite
   - clean up staged output on failure
5. `managed_source_copy` should be the default copy mode and should exclude installed and generated trees by policy, including at minimum:
   - `node_modules`
   - `.next`
   - `dist`
   - `build`
   - `coverage`
   - `.turbo`
   - similar cache outputs
6. Reparse points and symlinks must be handled deliberately in Rust rather than through best-effort raw recursion:
   - preserve safe links where policy allows,
   - or fail with structured diagnostics,
   - but do not silently half-copy the tree.
7. The renderer should receive a structured import result:
   - chosen strategy
   - copied path
   - skipped paths
   - warnings
   - reinstall-needed hint
   - final app id only after successful registration

## Decision Status

1. Status: `OPEN`
2. This is the correct long-term fix for large existing repo onboarding, but it is bigger than the current narrow smoke-fix loop.
3. Until `Import v2` exists, current import behavior should be treated as limited and not relied on for robust migration of large installed pnpm workspaces.

## Evidence

- path: `src/components/ImportAppDialog.tsx`
  symbol: `Import dialog sends path and skip_copy choice through ipc.import.importApp`
  lines: 252-258
- path: `src/components/ImportAppDialog.tsx`
  symbol: `Successful import assumes the backend returned an app id and then navigates immediately`
  lines: 268-270
- path: `src-tauri/src/wave_ad_domains.rs`
  symbol: `import_app chooses managed apps path and performs copy before registration`
  lines: 93-121
- path: `src-tauri/src/wave_ad_domains.rs`
  symbol: `SQLite registration happens only after copy and git setup succeed`
  lines: 132-160
- path: `src-tauri/src/sqlite_support.rs`
  symbol: `copy_dir_recursive creates destination eagerly and copies every file recursively`
  lines: 260-310
- path: `docs-new/04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md`
  symbol: `Current smoke checklist already treats import as a primary release validation surface`
  lines: 150-166

## Links

- [[../README.md]]
- [[../../04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md]]
- [[../../04-sprint-workflow/specs/2026-03-29-non-chat-release-smoke-checklist.md]]
