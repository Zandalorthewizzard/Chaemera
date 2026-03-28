import React from "react";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionStateIndicator,
} from "./ActionCardPrimitives";

interface ActionDatabaseSchemaProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function ActionDatabaseSchema({
  node,
  children,
}: ActionDatabaseSchemaProps) {
  const { state } = node.properties;
  const isLoading = state === "pending";
  const content = typeof children === "string" ? children : "";

  return (
    <ActionCard state={state} accentColor="teal">
      <ActionCardHeader icon={<Database size={15} />} accentColor="teal">
        <ActionBadge color="teal">Database Schema</ActionBadge>
        {isLoading && <ActionStateIndicator state="pending" />}
      </ActionCardHeader>
      {content && (
        <div className="px-3 pb-3">
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        </div>
      )}
    </ActionCard>
  );
}
