import { parseSearchReplaceBlocks } from "@/shared/search_replace_parser";

export interface SearchReplaceResult {
  success: boolean;
  content?: string;
  error?: string;
}

function unescapeMarkers(value: string): string {
  return value.replace(/^\\(<<<<<<<|=======|>>>>>>>)/gm, "$1");
}

function findAllMatches(haystack: string, needle: string): number[] {
  const matches: number[] = [];
  let fromIndex = 0;

  while (fromIndex <= haystack.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index === -1) {
      break;
    }
    matches.push(index);
    fromIndex = index + 1;
  }

  return matches;
}

export function applySearchReplace(
  originalContent: string,
  diffContent: string,
): SearchReplaceResult {
  const blocks = parseSearchReplaceBlocks(diffContent);
  if (blocks.length === 0) {
    return {
      success: false,
      error:
        "Invalid diff format - missing required sections. Expected <<<<<<< SEARCH / ======= / >>>>>>> REPLACE",
    };
  }

  let updated = originalContent;

  for (const [index, block] of blocks.entries()) {
    const searchContent = unescapeMarkers(block.searchContent);
    const replaceContent = unescapeMarkers(block.replaceContent);

    if (searchContent.trim().length === 0) {
      return {
        success: false,
        error: "Invalid diff format - empty SEARCH block is not allowed",
      };
    }

    const matches = findAllMatches(updated, searchContent);
    if (matches.length === 0) {
      return {
        success: false,
        error: `SEARCH block did not match any content (block ${index + 1})`,
      };
    }
    if (matches.length > 1) {
      return {
        success: false,
        error: `SEARCH block matched multiple locations (block ${index + 1})`,
      };
    }

    const matchIndex = matches[0];
    updated =
      updated.slice(0, matchIndex) +
      replaceContent +
      updated.slice(matchIndex + searchContent.length);
  }

  return {
    success: true,
    content: updated,
  };
}
