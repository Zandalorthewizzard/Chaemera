import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Database } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionExecuteSqlProps {
  children?: ReactNode;
  node?: any;
  description?: string;
}

export const ActionExecuteSql: React.FC<ActionExecuteSqlProps> = ({
  children,
  node,
  description,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";
  const queryDescription = description || node?.properties?.description;

  return (
    <ActionCard
      state={state}
      accentColor="teal"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <ActionCardHeader icon={<Database size={15} />} accentColor="teal">
        <ActionBadge color="teal">SQL</ActionBadge>
        {queryDescription && (
          <span className="font-medium text-sm text-foreground truncate">
            {queryDescription}
          </span>
        )}
        {inProgress && (
          <ActionStateIndicator state="pending" pendingLabel="Executing..." />
        )}
        {aborted && (
          <ActionStateIndicator state="aborted" abortedLabel="Did not finish" />
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={isContentVisible} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={isContentVisible}>
        <div className="text-xs">
          <CodeHighlight className="language-sql">{children}</CodeHighlight>
        </div>
      </ActionCardContent>
    </ActionCard>
  );
};
