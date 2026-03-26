# 2026-03-26 Dyad trace cleanup and select_component blocker

## Context

While continuing the Electron removal pass, I found two separate threads worth preserving:

1. Active runtime/debug copy still used old Dyad branded wording such as `Dyad Pro`.
2. The `select_component` Tauri migration is not yet stable because the first `tc=basic` setup prompt does not reach the expected completion signal quickly enough in the browser-backed Tauri harness.

## What changed

- Neutralized several active runtime/debug strings from `Dyad Pro` to hosted/neutral wording in:
  - `src/ipc/utils/get_model_client.ts`
  - `src/ipc/handlers/chat_stream_handlers.ts`
  - `src/ipc/types/misc.ts`
  - `src/ipc/shared/language_model_constants.ts`
  - `src/components/HelpDialog.tsx`
  - `src/hooks/useFreeAgentQuota.ts`
  - `src/lib/schemas.ts`
- Left the actual entitlement/quota plumbing intact as dormant foundation.

## Verification

- `npm run ts`
- `npm run lint`
- `npm run build`
- `npx playwright test --project=tauri-regression e2e-tests/tauri-nodejs-path-configuration.spec.ts`

## Observations

- `hasHostedAgentAccess()` remains hard-disabled by design, so `useFreeAgentQuota()` is dormant rather than accidentally inverted.
- `e2e-tests/tauri-select_component.spec.ts` still needs more work before it can replace the legacy Electron version.
- The current blocker appears to be the completion wait / app startup timing, not a missing contract mapping or missing provider catalog entry.

## Follow-up

- Keep the active runtime wording aligned with the BYOK-first product stance.
- Revisit `select_component` only after a more reliable Tauri readiness signal is identified.
