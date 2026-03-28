import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { PlainMarkdownParser } from "./ActionMarkdownParser";
import { CustomTagState } from "./stateTypes";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionWebSearchResultProps {
  node?: any;
  children?: React.ReactNode;
}

export const ActionWebSearchResult: React.FC<ActionWebSearchResultProps> = ({
  children,
  node,
}) => {
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  return (
    <ActionCard
      state={state}
      accentColor="blue"
      onClick={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    >
      <ActionCardHeader icon={<Globe size={15} />} accentColor="blue">
        <ActionBadge color="blue">Web Search Result</ActionBadge>
        {inProgress && (
          <ActionStateIndicator state="pending" pendingLabel="Loading..." />
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={isExpanded} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground">
          {typeof children === "string" ? (
            <PlainMarkdownParser content={children} />
          ) : (
            children
          )}
        </div>
      </ActionCardContent>
    </ActionCard>
  );
};
