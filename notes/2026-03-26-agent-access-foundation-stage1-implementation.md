# Agent Access Foundation Stage 1 Implementation

Date: 2026-03-26

## Outcome

The active hosted/freemium UX was disabled while the quota/entitlement plumbing was kept as a dormant foundation for future optional subscriptions.

## What changed

- Removed the visible `Enable Cloud AI` toggle from provider settings.
- Neutralized provider settings copy so hosted access is no longer presented as a first-class product flow.
- Removed quota banners and promo messaging from the active chat surface.
- Reworded the live chat mode selector to use neutral `Agent` language.
- Converted the quota-focused E2E coverage into a regression that asserts the freemium UI stays hidden while the bridge-backed quota foundation still exists.
- Updated the Tauri runtime lane so `free-agent-quota` now verifies hidden foundation behavior instead of a user-facing quota feature.

## Verification

- `npm run ts`
- `npm run build`
- `npm run lint`
- `npm run e2e:tauri-runtime`
- `npm run audit:tauri-cutover`
- `npm run audit:electron-legacy`

## Follow-up

- Continue the Electron removal plan only after the active product surface remains stable under the new BYOK-first contract.
- If hosted subscriptions are added later, reuse the dormant quota/entitlement plumbing with neutral naming.
