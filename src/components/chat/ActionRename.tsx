import type React from "react";
import type { ReactNode } from "react";
import { FileEdit } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionFilePath,
  ActionDescription,
} from "./ActionCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface ActionRenameProps {
  children?: ReactNode;
  node?: any;
  from?: string;
  to?: string;
}

export const ActionRename: React.FC<ActionRenameProps> = ({
  children,
  node,
  from: fromProp,
  to: toProp,
}) => {
  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";
  const state = node?.properties?.state as CustomTagState;

  const fromFileName = from ? from.split("/").pop() : "";
  const toFileName = to ? to.split("/").pop() : "";

  const displayTitle =
    fromFileName && toFileName
      ? `${fromFileName} → ${toFileName}`
      : fromFileName || toFileName || "";

  return (
    <ActionCard accentColor="amber" state={state}>
      <ActionCardHeader icon={<FileEdit size={15} />} accentColor="amber">
        {displayTitle && (
          <span className="font-medium text-sm text-foreground truncate">
            {displayTitle}
          </span>
        )}
        <ActionBadge color="amber">Rename</ActionBadge>
      </ActionCardHeader>
      {from && <ActionFilePath path={`From: ${from}`} />}
      {to && <ActionFilePath path={`To: ${to}`} />}
      {children && <ActionDescription>{children}</ActionDescription>}
    </ActionCard>
  );
};
