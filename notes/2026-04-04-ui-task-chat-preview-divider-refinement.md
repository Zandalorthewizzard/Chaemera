# 2026-04-04 UI Task: Chat / Preview Divider Refinement

## Context

Chaemera UI theme work reached a usable visual baseline on `feature/chaemera-ui-theme-foundation`, but the divider between the chat panel and preview panel still does not match the desired shell language.

The target visual direction is:

1. thin neutral divider
2. consistent with other vertical separators in the app
3. no bright blue or active-looking accent in the idle state
4. fully hidden when chat is hidden through the preview toolbar

## Current Observations

Observed desired behavior:

1. divider should read as structural UI chrome, not as a prominent control
2. divider should be a hairline gray separator, similar to other vertical separators
3. when the user clicks `Hide chat`, the divider should disappear completely
4. when the user clicks `Show chat`, the divider should return with the chat panel

Observed current behavior in the app:

1. divider still appears thicker and more visually assertive than intended
2. divider styling changes attempted in `src/pages/chat.tsx` did not produce the expected visual result in the real desktop runtime
3. the chat hide/show behavior is visually close to correct in code, but not yet trusted as complete because the real rendered separator still appears wrong

## Relevant Files

- `src/pages/chat.tsx`
- `src/components/preview_panel/PreviewIframe.tsx`
- `src/components/preview_panel/PreviewPanel.tsx`
- `src/components/ui/sidebar.tsx`
- `src/styles/chaemera-theme.css`

## What Was Attempted

### Attempt 1

Changed `PanelResizeHandle` classes in `src/pages/chat.tsx` to:

1. remove blue-heavy background treatment
2. render a thin hairline through pseudo-element styling
3. hide the handle with width/opacity/pointer-events when `isChatPanelHidden` is true
4. collapse the chat panel to size `0` instead of leaving a visible sliver

### Expected Outcome

1. divider would become visually thin and gray
2. divider would disappear entirely when chat is hidden

### Actual Outcome

1. the real desktop UI still did not visibly match the intended change
2. this suggests the current change either:
   - did not target the real visual source strongly enough, or
   - targeted the right component but not with a sufficiently explicit structure, or
   - is being visually overridden or constrained by panel-library rendering behavior

## Current Hypotheses

### Hypothesis 1: Styling the handle class is not enough

The `PanelResizeHandle` root may still occupy space or inherit behavior that keeps the divider visually heavier than intended.

### Hypothesis 2: The real divider needs explicit internal markup

Instead of relying on the handle root element and pseudo-element styling alone, the handle should render as:

1. a mostly transparent resize hit-area
2. a separately drawn inner `1px` divider line

This would separate visual line weight from hit target size.

### Hypothesis 3: Hidden state should remove the divider from the tree

When `isChatPanelHidden` is true, the safest approach may be to not render the `PanelResizeHandle` at all instead of trying to hide it with width or opacity.

This would avoid any residual layout, hover, or cursor behavior.

## Recommended Next Implementation Slice

1. In `src/pages/chat.tsx`, conditionally render `PanelResizeHandle` only when `isChatPanelHidden` is false.
2. Replace the current handle styling with a more explicit structure:
   - transparent outer hit-area
   - single centered gray `1px` divider line
3. Keep hover neutral gray, not blue.
4. Verify the behavior through the desktop runtime:
   - normal state
   - drag state
   - `Hide chat`
   - `Show chat`

## Validation Checklist

1. Divider looks like a neutral separator in idle state.
2. Divider remains easy to drag despite visually thin appearance.
3. Divider disappears completely after `Hide chat`.
4. Divider returns only after `Show chat`.
5. No layout jump or broken panel restore behavior.

## Notes For Future Pass

Do not continue guessing visually by repeatedly tweaking utility classes alone.
The next pass should treat this as a small structural UI task, not a color tweak.

## Evidence

- path: `src/pages/chat.tsx`
  symbol: `ChatPage panel layout`
  lines: 21-145
- path: `src/components/preview_panel/PreviewIframe.tsx`
  symbol: `Hide chat / Show chat control`
  lines: 1038-1051
