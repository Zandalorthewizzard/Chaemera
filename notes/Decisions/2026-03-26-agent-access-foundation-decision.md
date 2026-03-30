# Agent Access Foundation Decision

Date: `2026-03-26`
Status: `accepted`
Canonical doc: `docs-new/04-sprint-workflow/specs/2026-03-26-agent-access-foundation-and-hosted-entitlement-detachment.md`

## Summary

- Chaemera stays `BYOK-first` and `OSS-first` for the current release line.
- The current `Dyad Pro` and `free-agent` remnants should be disabled in active product behavior.
- The quota and entitlement plumbing should stay in the codebase as dormant foundation for future optional Chaemera subscriptions.

## Why

- Current code still mixes:
  - `BYOK Agent` capability,
  - hosted or managed access,
  - free-tier quota policy.
- That coupling makes the current product look trial-gated even though the intended product posture is `BYOK-first`.
- Future monetization, if it exists, should sit on a neutral entitlement layer rather than on Dyad-branded concepts.

## What This Means

- `Agent` should remain available for `BYOK` users.
- `Dyad Pro`, cloud-access, subscription, and quota copy should disappear from the active Chaemera UX.
- Quota enforcement should not block the current `BYOK Agent` path.
- A later rename pass should move code away from names like `enableDyadPro` and `freeAgentQuota`.

## Implementation Shape

1. Disable active hosted and freemium UX plus quota enforcement.
2. Run a neutral-language rename pass for entitlements and hosted access.
3. Only later, if Chaemera ships optional subscriptions, wire them into the neutral entitlement layer.

## Current Scope State

- Canonical decision is documented.
- No code was changed by this decision note alone.
- Implementation is still pending and should link back to the canonical doc.

## Resume Point

- If work resumes on hosted access, quota policy, or `Agent` naming, read the canonical doc first.
- Then inspect the affected files listed in the spec's file-scope section before making code changes.
