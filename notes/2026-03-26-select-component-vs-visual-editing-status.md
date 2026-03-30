# 2026-03-26 Select Component vs Visual Editing Status

## Context

While trying to migrate `select_component` coverage off the legacy Electron lane, it became clear that two separate product capabilities had been mentally grouped together:

1. `select component` as precise chat context for targeted AI edits.
2. `visual editing` as direct UI-driven edits that can be saved back into source files.

That distinction matters for the Electron removal plan because the first capability was meaningfully usable in the Electron app, while the second appears incomplete even in the upstream/source implementation.

## Evidence and Findings

### 1. Select component as chat context is a real user-facing feature

- `PreviewIframe.tsx` listens for `dyad-component-selected` messages from the preview iframe and stores them in:
  - `selectedComponentsPreviewAtom`
  - `visualEditingSelectedComponentAtom`
- `SelectedComponentDisplay.tsx` shows the selected components to the user and allows deselection.
- `ChatInput.tsx` forwards selected components into `streamMessage()`.
- `chat_stream_handlers.ts` turns selected components into focused prompt context:
  - reads the referenced file
  - extracts a local snippet
  - appends `Selected components:` to the user prompt
  - narrows codebase context when appropriate

Conclusion:
This capability gives the user a concrete UX benefit. They can click a component in preview and ask the AI to change that exact component instead of describing it vaguely.

### 2. Full visual editing backend looks incomplete in both Electron and Tauri codepaths

- Electron-side handler:
  - `src/ipc/handlers/visual_editing_handlers.ts`
  - `applyChanges` is effectively a no-op
  - `analyzeComponent` returns fixed `false/false`
- Tauri-side handler:
  - `src-tauri/src/wave_e_domains.rs`
  - `apply_visual_editing_changes` is effectively a no-op
  - `analyze_component` returns fixed `false/false`
- The UI for pending visual changes exists:
  - `VisualEditingChangesDialog.tsx`
  - `PreviewIframe.tsx`
  - `previewAtoms.ts`

Conclusion:
The direct `save visual edits back to source` path does not look production-complete in this repository, even before the Tauri migration.

### 3. Current Tauri blocker is primarily on the runtime/harness side for capability #1

- The legacy Electron spec `e2e-tests/select_component.spec.ts` exercises the usable `select component as chat context` flow.
- The attempted Tauri migration failed in the browser-backed `tauri-regression` lane before reaching stable preview readiness.
- Observed states in the failing Tauri run:
  - `Chat in progress`
  - `Cancel generation`
  - `Starting your app server...`
  - `Trying to restart app...`
  - preview iframe not yet visible

Conclusion:
The immediate blocker for Electron removal is not that visual-editing business logic is missing from the test fixture. The blocker is that the browser-backed Tauri regression lane is not a strong enough runtime for this desktop-heavy flow.

## Product Interpretation

### What the user actually gets from this feature today

The strongest current UX value is:

1. click an element in preview
2. capture that exact component as context
3. ask AI to modify that specific component

This is different from a mature Figma-style or Builder-style direct visual editor.

### What appears unfinished upstream

The `analyze component` and `apply visual editing changes` backend path appears unfinished/stubbed in the upstream Electron-side implementation as well, not just in the Tauri port.

## Recommendation for the Electron Removal Critical Path

To avoid letting this area consume the whole cutover:

1. Treat `full visual editing save-to-source` as explicitly out of scope for the current Electron-removal milestone.
2. Decide separately whether `select component as chat context` is a hard release requirement for the first Tauri-only release.
3. If it is **not** a hard requirement:
   - defer the entire preview-pick / annotator / visual-editing cluster
   - remove it from Electron-removal exit criteria
4. If it **is** a hard requirement:
   - move the migration effort into a real `tauri-runtime` lane
   - do not try to prove parity only through the browser-backed `tauri-regression` harness

## Open Issues

1. Product decision still needed:
   - is `select component as chat context` required in the first Tauri-only release?
2. If yes, the next engineering task should be framed as:
   - `real Tauri runtime migration for select-component flow`
     and not as a simple Playwright spec rewrite.
3. If no, the feature cluster should be intentionally deferred or hidden so Electron removal can continue without ambiguity.

## Resume Point

1. Use `e2e-tests/select_component.spec.ts` as the current source-of-truth test for the usable Electron behavior.
2. Do not treat `visual_editing_handlers.ts` or `wave_e_domains.rs` as evidence of a complete visual-editing backend.
3. Re-enter this area only after the product decision above is locked.
