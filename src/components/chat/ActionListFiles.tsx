import React, { useState } from "react";
import { CustomTagState } from "./stateTypes";
import { FolderOpen } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionExpandIcon,
  ActionStateIndicator,
  ActionCardContent,
} from "./ActionCardPrimitives";

interface ActionListFilesProps {
  node: {
    properties: {
      directory?: string;
      recursive?: string;
      include_hidden?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function ActionListFiles({ node, children }: ActionListFilesProps) {
  const { directory, recursive, include_hidden, state } = node.properties;
  const isLoading = state === "pending";
  const isRecursive = recursive === "true";
  const isIncludeHidden = include_hidden === "true";
  const content = typeof children === "string" ? children : "";
  const [isExpanded, setIsExpanded] = useState(false);

  const title = directory ? directory : "List Files";

  return (
    <ActionCard
      state={state}
      accentColor="slate"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid="dyad-list-files"
    >
      <ActionCardHeader icon={<FolderOpen size={15} />} accentColor="slate">
        <span className="font-medium text-sm text-foreground truncate">
          {title}
        </span>
        {isRecursive && <ActionBadge color="slate">recursive</ActionBadge>}
        {isIncludeHidden && (
          <ActionBadge color="slate">include hidden</ActionBadge>
        )}
        {isLoading && (
          <ActionStateIndicator state="pending" pendingLabel="Listing..." />
        )}
        <div className="ml-auto">
          <ActionExpandIcon isExpanded={isExpanded} />
        </div>
      </ActionCardHeader>
      <ActionCardContent isExpanded={isExpanded}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </ActionCardContent>
    </ActionCard>
  );
}
