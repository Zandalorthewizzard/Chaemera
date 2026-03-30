import { cleanFullResponse } from "../utils/cleanFullResponse";
import type { ChatRuntimeContext } from "./types";
import type { Message } from "../types/chat";

// e.g. [dyad-qa=add-dep]
const TEST_RESPONSES: Record<string, string> = {
  "ts-error": `This will get a TypeScript error.
  
  <dyad-write path="src/bad-file.ts" description="This will get a TypeScript error.">
  import NonExistentClass from 'non-existent-class';

  const x = new Object();
  x.nonExistentMethod();
  </dyad-write>
  
  EOM`,
  "add-dep": `I'll add that dependency for you.
  
  <dyad-add-dependency packages="deno"></dyad-add-dependency>
  
  EOM`,
  "add-non-existing-dep": `I'll add that dependency for you.
  
  <dyad-add-dependency packages="@angular/does-not-exist"></dyad-add-dependency>
  
  EOM`,
  "add-multiple-deps": `I'll add that dependency for you.
  
  <dyad-add-dependency packages="react-router-dom react-query"></dyad-add-dependency>
  
  EOM`,
  write: `Hello world
  <dyad-write path="src/hello.ts" content="Hello world">
  console.log("Hello world");
  </dyad-write>
  EOM`,
  "string-literal-leak": `BEFORE TAG
  <dyad-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</dyad-write>
AFTER TAG
`,
};

export function getTestResponse(prompt: string): string | null {
  const match = prompt.match(/\[dyad-qa=([^\]]+)\]/);
  if (match) {
    const testKey = match[1];
    return TEST_RESPONSES[testKey] || null;
  }
  return null;
}

export async function streamTestResponse({
  ctx,
  chatId,
  testResponse,
  updatedChat,
  placeholderMessageId,
}: {
  ctx: ChatRuntimeContext;
  chatId: number;
  testResponse: string;
  updatedChat: { messages: Message[] };
  placeholderMessageId: number;
}): Promise<string> {
  ctx.recordLog("info", "Using canned response for test prompt");

  const chunks = testResponse.split(" ");
  let fullResponse = "";

  for (const chunk of chunks) {
    if (ctx.isCancelled()) {
      break;
    }

    fullResponse += `${chunk} `;
    fullResponse = cleanFullResponse(fullResponse);

    const currentMessages = [...updatedChat.messages];
    if (
      currentMessages.length > 0 &&
      currentMessages[currentMessages.length - 1].role === "assistant"
    ) {
      currentMessages[currentMessages.length - 1].content = fullResponse;
    } else {
      currentMessages.push({
        id: placeholderMessageId,
        role: "assistant",
        content: fullResponse,
      });
    }

    ctx.onChunk(chatId, currentMessages);

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return fullResponse;
}
