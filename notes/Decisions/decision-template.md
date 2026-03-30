# Decision Template

Use this template for short operational decision notes in `notes/Decisions/`.

Keep it short. The note should summarize the decision and point to the canonical `docs-new/` artifact.

---

# <Decision Title>

Date: `<YYYY-MM-DD>`
Status: `<proposed | accepted | superseded | rejected>`
Canonical doc: `<path to canonical docs-new artifact>`

## Summary

- <one-line decision>
- <one-line impact>
- <one-line boundary or constraint>

## Why

- <context>
- <problem being solved>
- <why this direction was chosen>

## What This Means

- <active product or code implication>
- <what should stop>
- <what should remain>

## Implementation Shape

1. <first stage>
2. <second stage>
3. <later stage, if any>

## Current Scope State

- Code changed: `<yes/no>`
- Docs changed: `<yes/no>`
- Tests run: `<yes/no/not applicable>`
- Pending follow-up: `<brief status>`

## Related Files

- `<path>`
- `<path>`
- `<path>`

## Resume Point

- <where the next agent or session should restart>

---

Minimal rule:

- The note is non-canonical.
- Durable reasoning belongs in the linked `docs-new/` artifact.
- If the canonical doc changes, update this note's summary and status.
