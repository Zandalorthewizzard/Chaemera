# Leptos UI Wrapper Layer

This directory is the future local UI layer for Leptos-based Chaemera surfaces.

## Purpose

1. Keep Chaemera feature code independent from any single third-party Leptos UI kit.
2. Preserve continuity with the current Shadcn-style React component model in `src/components/ui/`.
3. Make the upstream Leptos UI library replaceable without rewriting every screen.

## Rules

1. Treat upstream Leptos UI crates as implementation details.
2. Expose project-facing primitives through local wrappers only.
3. Keep wrapper names close to the existing React UI primitive names where that improves migration clarity.
4. Do not mix post-migration redesign work into the first wrapper pass.

## Current Direction

1. Baseline style: Shadcn-like headless/styled primitives.
2. Integration model: local wrapper layer first, upstream provider second.
3. This directory is scaffolding, not active runtime code yet.

## Structure

1. `components.manifest.json`
   Maps current React primitives to planned Leptos wrapper counterparts.
2. `primitives/`
   Planned home for the first local wrapper implementations and related notes.

## Migration Rule

When a Leptos route moves beyond route shell compatibility, add or reuse a wrapper here before importing any upstream component directly into the new route implementation.
