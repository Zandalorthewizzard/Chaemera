# Planned Leptos Primitives

This directory is reserved for project-local Leptos UI wrappers.

## Rule

1. Add wrappers here before importing any upstream Leptos UI component directly into feature code.
2. Keep the public wrapper names stable even if the upstream implementation changes.
3. Match existing Chaemera primitive intent first; redesign comes later.

## First Target Set

1. `button`
2. `input`
3. `textarea`
4. `dialog`
5. `sheet`
6. `tabs`
7. `tooltip`
8. `dropdown-menu`
9. `select`
10. `checkbox`

See `../components.manifest.json` for the full backlog and current React source mapping.
