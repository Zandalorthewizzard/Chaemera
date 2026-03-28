import React, { useState } from "react";
import { CustomTagState } from "./stateTypes";
import { Table2 } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionSupabaseTableSchemaProps {
  node: {
    properties: {
      table?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function ActionSupabaseTableSchema({
  node,
  children,
}: ActionSupabaseTableSchemaProps) {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { table, state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <ActionCard
      state={state}
      accentColor="teal"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <ActionCardHeader icon={<Table2 size={15} />} accentColor="teal">
        <ActionBadge color="teal">
          {table ? "Table Schema" : "Supabase Table Schema"}
        </ActionBadge>
        {table && (
          <span className="font-medium text-sm text-foreground truncate">
            {table}
          </span>
        )}
        {isLoading && (
          <ActionStateIndicator state="pending" pendingLabel="Fetching..." />
        )}
        {isAborted && (
          <ActionStateIndicator state="aborted" abortedLabel="Did not finish" />
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={isContentVisible} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={isContentVisible}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </ActionCardContent>
    </ActionCard>
  );
}
