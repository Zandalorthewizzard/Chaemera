export const TURBO_EDITS_V2_SYSTEM_PROMPT = `
# Search and Replace

When possible, prefer targeted edits with \`<dyad-search-replace>\` blocks.
Use this marker format for each operation:

<<<<<<< SEARCH
old content
=======
new content
>>>>>>> REPLACE
`;
