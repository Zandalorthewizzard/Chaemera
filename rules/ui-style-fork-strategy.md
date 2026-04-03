# UI Style Fork Strategy

Use this rule when changing the Chaemera app look while continuing to pull UI and product updates from upstream `dyad-sh/dyad`.

## Goal

Keep upstream structure and behavior easy to merge.
Keep Chaemera visual identity in a thin local styling layer.

## Source of truth

- Upstream app structure, component markup, and behavior stay aligned with upstream whenever possible.
- Chaemera branding lives in `src/styles/chaemera-theme.css`.
- Base tokens and utility wiring from upstream live in `src/styles/globals.css` and should usually be left alone.

## Default workflow

1. Pull upstream UI changes first.
2. Keep upstream markup and component logic unless Chaemera has a product-specific reason to diverge.
3. Apply Chaemera look through token overrides in `src/styles/chaemera-theme.css`.
4. Only add component-specific CSS when token overrides are not enough and the selector targets real, existing app markup.
5. Re-test light mode, dark mode, and the touched screens after every upstream sync.

## What to customize locally

- color tokens
- radius tokens
- surface/background tokens
- border and ring tokens
- typography tokens if they are tokenized
- spacing only when the spacing change is intentionally part of the brand language

## What to avoid

- editing upstream component markup just to restyle it
- creating a parallel library of unused brand-specific classes
- global catch-all transitions on `*`
- fragile overrides that depend on deep DOM structure when a token change would work
- merge policies like `merge=ours` for theme files unless there is a proven recurring conflict pattern

## File responsibilities

- `src/styles/globals.css`: upstream base theme and Tailwind token bridge
- `src/styles/chaemera-theme.css`: Chaemera token overrides layered on top of upstream styles
- `index.html`: current app stylesheet entry point
- `.storybook/preview.ts`: Storybook stylesheet entry point

## Current activation model

Chaemera styles are loaded by importing `src/styles/chaemera-theme.css` from the real app entry points, not from scaffold-only files.

- App: `index.html`
- Storybook: `.storybook/preview.ts`

## Upstream sync policy

When adapting a commit from upstream:

1. Prefer taking the upstream component and layout change as-is.
2. Check whether the visual result still works with Chaemera tokens.
3. If the look regresses, adjust `src/styles/chaemera-theme.css` first.
4. Only patch component-level styles if the required difference cannot be expressed as a token.

This keeps future cherry-picks and rebases cheaper because the visual fork stays concentrated in one place.

## Theme extensibility

The theme file is structured to support future in-app theme switching through a root attribute such as `document.documentElement.dataset.uiTheme = "chaemera"`.

If Chaemera later adds user-selectable themes:

1. store the selected theme in user settings
2. apply `data-ui-theme` on `document.documentElement`
3. add new token blocks like `:root[data-ui-theme="solar"]`
4. keep component markup unchanged

That gives theme switching with minimal merge cost because the switching mechanism stays outside upstream UI logic.

## Review checklist

Before shipping a UI styling change, verify:

- the change is applied from the real app entry point
- the change works in both light and dark mode
- the change does not require unnecessary markup divergence from upstream
- the change is mostly token-driven
- Storybook or other visual environments load the same theme layer if needed

## Recommended visual review pipeline

This workflow is recommended for theme work, but it is not mandatory.

1. change tokens in `src/styles/chaemera-theme.css`
2. run the app locally with `npm start`
3. review the main screens at a consistent window size
4. compare before/after screenshots for the same screens when making noticeable visual changes
5. only move to component-level CSS if token changes are not enough

Recommended screens to review on each iteration:

- sidebar and navigation states
- chat list and active chat thread
- composer, inputs, buttons, selects, and dropdowns
- dialogs, sheets, popovers, and tooltips
- settings page
- empty, loading, error, hover, focus, selected, and disabled states
- both light and dark mode

Recommended progression:

- early exploration: manual visual review in the app
- component polish: Storybook review for primitives and states
- later stabilization: add a small number of visual regression snapshots for core screens
