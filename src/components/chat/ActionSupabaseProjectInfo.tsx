import React, { useState } from "react";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionSupabaseProjectInfoProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function ActionSupabaseProjectInfo({
  node,
  children,
}: ActionSupabaseProjectInfoProps) {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <ActionCard
      state={state}
      accentColor="teal"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <ActionCardHeader icon={<Database size={15} />} accentColor="teal">
        <ActionBadge color="teal">Supabase Project Info</ActionBadge>
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
