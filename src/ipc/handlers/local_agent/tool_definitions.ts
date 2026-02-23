import type { ToolSet } from "ai";

export const TOOL_DEFINITIONS = [
  {
    name: "read_file",
    description: "Read a file from the current project",
    isAllowedByDefault: true,
  },
  {
    name: "grep",
    description: "Search for text in the project",
    isAllowedByDefault: true,
  },
  {
    name: "list_files",
    description: "List files in the current project",
    isAllowedByDefault: true,
  },
] as const;

export type AgentToolName = (typeof TOOL_DEFINITIONS)[number]["name"];

export function buildAgentToolSet(): ToolSet {
  return {};
}

export async function requireAgentToolConsent(): Promise<boolean> {
  return true;
}

export function clearPendingConsentsForChat(): void {}
