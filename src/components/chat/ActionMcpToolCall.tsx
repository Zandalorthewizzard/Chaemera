import React, { useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionMcpToolCallProps {
  node?: any;
  children?: React.ReactNode;
}

export const ActionMcpToolCall: React.FC<ActionMcpToolCallProps> = ({
  node,
  children,
}) => {
  const serverName: string = node?.properties?.serverName || "";
  const toolName: string = node?.properties?.toolName || "";
  const [expanded, setExpanded] = useState(false);

  const raw = typeof children === "string" ? children : String(children ?? "");

  const prettyJson = useMemo(() => {
    if (!expanded) return "";
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Error parsing JSON for dyad-mcp-tool-call", e);
      return raw;
    }
  }, [expanded, raw]);

  return (
    <ActionCard
      accentColor="blue"
      isExpanded={expanded}
      onClick={() => setExpanded((v) => !v)}
    >
      <ActionCardHeader icon={<Wrench size={15} />} accentColor="blue">
        <ActionBadge color="blue">Tool Call</ActionBadge>
        {serverName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-200 dark:ring-blue-800">
            {serverName}
          </span>
        )}
        {toolName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border">
            {toolName}
          </span>
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={expanded} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={expanded}>
        <CodeHighlight className="language-json">{prettyJson}</CodeHighlight>
      </ActionCardContent>
    </ActionCard>
  );
};
