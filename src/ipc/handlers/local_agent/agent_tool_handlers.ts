import { agentContracts } from "@/ipc/types";
import { createTypedHandler } from "../base";
import { TOOL_DEFINITIONS, type AgentToolName } from "./tool_definitions";
import type { AgentToolConsent } from "@/lib/schemas";

const toolConsents = new Map<AgentToolName, AgentToolConsent>();

function getConsentForTool(toolName: AgentToolName): AgentToolConsent {
  return toolConsents.get(toolName) ?? "ask";
}

export function registerAgentToolHandlers() {
  createTypedHandler(agentContracts.getTools, async () => {
    return TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      isAllowedByDefault: tool.isAllowedByDefault,
      consent: getConsentForTool(tool.name),
    }));
  });

  createTypedHandler(agentContracts.setConsent, async (_event, params) => {
    toolConsents.set(params.toolName as AgentToolName, params.consent);
  });

  createTypedHandler(agentContracts.respondToConsent, async () => {});
}
