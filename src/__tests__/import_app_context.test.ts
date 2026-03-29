import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(() => ({
    enableSmartFilesContextMode: false,
  })),
}));

vi.mock("@/ipc/utils/git_utils", () => ({
  gitIsIgnored: vi.fn(async () => false),
}));

import { readAiRules } from "@/prompts/system_prompt";
import { extractCodebase } from "@/utils/codebase";

const fixtureDir = path.resolve(
  __dirname,
  "..",
  "..",
  "e2e-tests",
  "fixtures",
  "import-app",
  "minimal-with-ai-rules",
);

describe("imported app context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the imported app AI_RULES file instead of falling back to defaults", async () => {
    const aiRules = await readAiRules(fixtureDir);

    expect(aiRules).toContain("There's already AI rules...");
    expect(aiRules).not.toContain("# Tech Stack");
  });

  it("extracts the imported app codebase including AI_RULES and fixture source files", async () => {
    const { formattedOutput, files } = await extractCodebase({
      appPath: fixtureDir,
      chatContext: {
        contextPaths: [],
        smartContextAutoIncludes: [],
        excludePaths: [],
      },
    });

    expect(formattedOutput).toContain('<dyad-file path="AI_RULES.md">');
    expect(formattedOutput).toContain("There's already AI rules...");
    expect(formattedOutput).toContain('<dyad-file path="src/App.tsx">');
    expect(formattedOutput).toContain("Minimal imported app");
    expect(files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "AI_RULES.md",
          content: expect.stringContaining("There's already AI rules..."),
        }),
        expect.objectContaining({
          path: "src/App.tsx",
          content: expect.stringContaining("Minimal imported app"),
        }),
      ]),
    );
  });
});
