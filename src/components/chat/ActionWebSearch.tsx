import type React from "react";
import { useState, type ReactNode } from "react";
import { Globe } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionWebSearchProps {
  children?: ReactNode;
  node?: any;
}

export const ActionWebSearch: React.FC<ActionWebSearchProps> = ({
  children,
  node,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const query =
    node?.properties?.query || (typeof children === "string" ? children : "");
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";

  return (
    <ActionCard
      state={state}
      accentColor="blue"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <ActionCardHeader icon={<Globe size={15} />} accentColor="blue">
        <ActionBadge color="blue">Web Search</ActionBadge>
        {!isExpanded && query && (
          <span className="text-sm text-muted-foreground italic truncate">
            {query}
          </span>
        )}
        {inProgress && (
          <ActionStateIndicator state="pending" pendingLabel="Searching..." />
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={isExpanded} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground space-y-2">
          {query && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Query:
              </span>
              <div className="italic mt-0.5 text-foreground">{query}</div>
            </div>
          )}
          {children && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Results:
              </span>
              <div className="mt-0.5 text-foreground">{children}</div>
            </div>
          )}
        </div>
      </ActionCardContent>
    </ActionCard>
  );
};
