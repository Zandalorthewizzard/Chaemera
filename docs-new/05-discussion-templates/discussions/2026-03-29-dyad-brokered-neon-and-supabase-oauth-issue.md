---
id: chaemera-issue-dyad-brokered-neon-and-supabase-oauth-2026-03-29
title: Dyad-Brokered Neon and Supabase OAuth
type: issue
status: deferred
tags: [issue, oauth, integrations, byok, mvp]
related:
  [
    [../README.md],
    [2026-03-01-tauri-release-cutover-vs-regression.md],
    [../../04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md],
  ]
depends_on: []
generated: false
source_of_truth: discussion
outline: []
---

# Dyad-Brokered Neon and Supabase OAuth

## Description

1. The current Neon and Supabase integration flows still depend on Dyad-owned OAuth broker endpoints for token refresh and fake deep-link return payloads.
2. This is not compatible with Chaemera's `BYOK-first` and `independent desktop host` positioning.
3. The user is meant to connect their own Neon and Supabase accounts, but the current trust boundary still routes critical auth flow pieces through `oauth.dyad.sh` and `supabase-oauth.dyad.sh`.

## Discovery Context

1. The issue was rediscovered during MVP release triage while reviewing the remaining `dyad.sh` dependencies that survived the Tauri cutover.
2. The current renderer UX already avoids invoking those real broker flows for regular users and sends them to the local `/help` route instead.
3. That means the codebase already implicitly treats the old broker path as unsuitable for the public Chaemera release line.

## Impact

1. Keeping this path active would leave a confusing and high-trust external dependency in a product that does not otherwise advertise Dyad account sync, hosted auth, or cross-device project ownership.
2. It weakens the product story for `BYOK-first`, because the user's provider accounts are still partially mediated by infrastructure Chaemera does not control.
3. It also creates an availability risk for Neon and Supabase integrations if the external broker endpoints change or disappear.

## Proposed Resolution

1. Do not ship Dyad-brokered OAuth as an active public runtime path.
2. Keep the current MVP line on the safer posture:
   - legacy broker flows are effectively unavailable in the public UI,
   - legacy broker references are tracked as deferred technical debt,
   - and the release uses explicit reset/recovery UX for old credentials rather than pretending the old auth path is supported.
3. Revisit this only after the MVP ships, with one of these explicit replacements:
   - a Chaemera-owned OAuth broker,
   - a native desktop OAuth + PKCE flow,
   - or a conscious decision to leave these integrations disabled.

## Decision Status

1. Status: `DEFERRED`
2. Product lock as of `2026-03-29`:
   - this is not part of the current MVP scope,
   - the issue is intentionally parked behind the release-critical Tauri parity and detox work,
   - and any future implementation must replace or remove the Dyad broker rather than restoring it as-is.

## Evidence

- path: `src-tauri/src/wave_aa_domains.rs`
  symbol: `NEON_REFRESH_URL and fake Neon OAuth deep-link payload`
  lines: 15-15, 726-727
- path: `src-tauri/src/wave_z_domains.rs`
  symbol: `SUPABASE_REFRESH_URL and fake Supabase OAuth deep-link payload`
  lines: 14-14, 730-731
- path: `src/components/NeonConnector.tsx`
  symbol: `Non-test Neon connect path routes users to local help`
  lines: 99-99
- path: `src/components/SupabaseConnector.tsx`
  symbol: `Non-test Supabase connect path routes users to local help`
  lines: 159-159
- path: `docs-new/04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md`
  symbol: `Release roadmap calls out dyad.sh dependencies and legacy secret parity`
  lines: 102-102, 149-149, 239-239

## Links

- [[../README.md]]
- [[2026-03-01-tauri-release-cutover-vs-regression.md]]
- [[../../04-sprint-workflow/specs/2026-03-28-prod-mvp-release-roadmap.md]]
