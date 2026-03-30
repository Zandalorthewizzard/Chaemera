# 2026-03-30 Phase 1 Packaging Architecture Notes

## Context

- Started implementation from `docs-new/07-codex-logos-phase/2026-03-30-release-line-mvp-roadmap.md`.
- Current workstream: `Phase 1 - Packaging and startup unblock`.

## Architecture read before code changes

- `package.json` currently runs Tauri CLI from repository root:
  - `start:tauri = npx @tauri-apps/cli dev --config src-tauri/tauri.conf.json`
  - `package:tauri = npx @tauri-apps/cli build --config src-tauri/tauri.conf.json`
- `src-tauri/tauri.conf.json` is valid and points frontend output/resources back to the repository root.
- Actual Rust crate lives at `src-tauri/Cargo.toml`.
- `src-tauri/src/chat_worker_host.rs` and `src-tauri/src/wave_f_domains.rs` both resolve runtime assets from:
  - workspace-root dev paths, then
  - packaged resource dir.
- `src-tauri/src/lib.rs` already has a centralized startup hook via `runtime_lifecycle::initialize(&app.handle())`.

## Reproduced packaging problem

- `npm run package:tauri` from repo root fails immediately with:
  - `failed to watch C:\Work\proj\Chaemera\Cargo.toml: Input watch path is neither a file nor a directory.`
- Running the Tauri CLI from `src-tauri/` instead gets past the watch-path failure and proceeds into real build work.

## Current diagnosis

- The packaging failure is not a Rust compile failure.
- It is a Tauri CLI project-root resolution problem.
- The CLI is treating the repository root as the Rust project root when invoked from the repository root, even though the real crate lives under `src-tauri/`.
- The most conservative fix is to make the Tauri CLI run from the real Tauri project root instead of teaching the repo to pretend a root `Cargo.toml` exists.

## Planned implementation direction

- Add a small Node wrapper script that:
  - launches `@tauri-apps/cli` from `src-tauri/`,
  - uses `tauri.conf.json` relative to that directory,
  - preserves passthrough args,
  - and becomes the canonical entrypoint for both `start:tauri` and `package:tauri`.
- After that, validate whether packaged startup exposes any missing worker/resource preflight issues.
- If startup still has fragile asset resolution, fold the next fix into Rust-side preflight rather than papering over it in scripts.

## Implemented result

- Added `scripts/run-tauri-cli.js` as a canonical Tauri CLI wrapper rooted at `src-tauri/`.
- Rewired `package.json`:
  - `start:tauri`
  - `package:tauri`
- First wrapper attempt using direct `npx.cmd` spawn failed on Windows with `spawn EINVAL`.
- Replaced it with a Windows `cmd.exe /c npx ...` launch path.
- Validation result:
  - `node scripts/run-tauri-cli.js build --no-bundle` succeeds.
  - `npm run package:tauri` now succeeds.
  - The original `failed to watch ... Cargo.toml` failure is gone.

## Remaining Phase 1 follow-up

- Packaging path resolution is fixed.
- Still need later packaged-app launch verification and any Rust preflight tightening if runtime asset startup problems appear when exercising the built exe.

## Resume point

- Implement the wrapper script.
- Rewire `package.json` Tauri scripts to use it.
- Re-run `npm run package:tauri`.
- Then inspect any remaining startup/packaging failures beyond project-root resolution.
