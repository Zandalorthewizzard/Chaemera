export interface SearchReplaceBlock {
  searchContent: string;
  replaceContent: string;
}

const BLOCK_REGEX =
  /(?:^|\n)<<<<<<<\s+SEARCH>?\s*\n([\s\S]*?)(?:\n)?(?:(?<=\n)(?<!\\)=======\s*\n)([\s\S]*?)(?:\n)?(?:(?<=\n)(?<!\\)>>>>>>>+\s+REPLACE)(?=\n|$)/g;

export function parseSearchReplaceBlocks(
  content: string,
): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = [];

  for (const match of content.matchAll(BLOCK_REGEX)) {
    blocks.push({
      searchContent: match[1] ?? "",
      replaceContent: match[2] ?? "",
    });
  }

  return blocks;
}
