import { describe, expect, it } from "vitest";
import {
  BUILD_SYSTEM_PROMPT,
  constructSystemPrompt,
} from "@/prompts/system_prompt";
import { constructLocalAgentPrompt } from "@/prompts/local_agent_prompt";
import { constructPlanModePrompt } from "@/prompts/plan_mode_prompt";

describe("prompt branding", () => {
  it("uses Chaemera branding in build, local-agent, and plan prompts", () => {
    const buildPrompt = constructSystemPrompt({
      aiRules: undefined,
      chatMode: "build",
      enableTurboEditsV2: false,
    });
    const localAgentPrompt = constructLocalAgentPrompt(undefined);
    const planPrompt = constructPlanModePrompt(undefined);

    expect(BUILD_SYSTEM_PROMPT).toContain("Chaemera");
    expect(buildPrompt).toContain("Chaemera");
    expect(localAgentPrompt).toContain("Chaemera");
    expect(planPrompt).toContain("Chaemera");
    expect(buildPrompt).not.toContain("You are Dyad");
    expect(localAgentPrompt).not.toContain("You are Dyad");
    expect(planPrompt).not.toContain("Dyad Plan Mode");
  });
});
