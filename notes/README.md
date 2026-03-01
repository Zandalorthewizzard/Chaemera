# Agent Working Notes

This directory is the agent working-memory layer for Chaemera.

## Purpose

1. Preserve implementation context across sessions, handoffs, crashes, or agent replacement.
2. Record short operational history: what changed, why, what was observed, and what still needs to be checked.
3. Keep debugging clues, environment fixes, and resume points close to the codebase.

## Rules

1. Notes are non-canonical. Code, runtime behavior, and evidence-backed docs in `docs-new/` remain the source of truth.
2. Write notes when substantial work produces observations, blockers, recovery steps, or handoff context that may matter later.
3. Keep notes dated and scoped. Prefer one file per active thread or milestone.
4. Mark hypotheses as hypotheses. Do not state unverified behavior as settled fact.
5. Do not store secrets, tokens, credentials, or personal data here.
6. If a note becomes a durable decision, accepted finding, or stable process rule, promote it into `docs-new/` with evidence.

## Suggested Structure

1. Context
2. What changed
3. Observations
4. Open issues
5. Resume point

## Naming

Use file names like:

- `YYYY-MM-DD-topic.md`
- `YYYY-MM-DD-area-status.md`

## Resume Flow

1. Read `AGENTS.md`.
2. Read the required `docs-new/` chain.
3. Read the relevant note files in this folder.
4. Resume the task from the latest confirmed state, not from memory alone.
