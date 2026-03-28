import type React from "react";
import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
  ActionFilePath,
  ActionDescription,
} from "./ActionCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface ActionDeleteProps {
  children?: ReactNode;
  node?: any;
  path?: string;
}

export const ActionDelete: React.FC<ActionDeleteProps> = ({
  children,
  node,
  path: pathProp,
}) => {
  const path = pathProp || node?.properties?.path || "";
  const state = node?.properties?.state as CustomTagState;
  const fileName = path ? path.split("/").pop() : "";

  return (
    <ActionCard accentColor="red" state={state}>
      <ActionCardHeader icon={<Trash2 size={15} />} accentColor="red">
        {fileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {fileName}
          </span>
        )}
        <ActionBadge color="red">Delete</ActionBadge>
      </ActionCardHeader>
      <ActionFilePath path={path} />
      {children && <ActionDescription>{children}</ActionDescription>}
    </ActionCard>
  );
};
