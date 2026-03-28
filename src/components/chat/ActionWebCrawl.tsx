import type React from "react";
import type { ReactNode } from "react";
import { ScanQrCode } from "lucide-react";
import {
  ActionCard,
  ActionCardHeader,
  ActionBadge,
} from "./ActionCardPrimitives";

interface ActionWebCrawlProps {
  children?: ReactNode;
  node?: any;
}

export const ActionWebCrawl: React.FC<ActionWebCrawlProps> = ({
  children,
  node: _node,
}) => {
  return (
    <ActionCard accentColor="blue">
      <ActionCardHeader icon={<ScanQrCode size={15} />} accentColor="blue">
        <ActionBadge color="blue">Web Crawl</ActionBadge>
      </ActionCardHeader>
      {children && (
        <div className="px-3 pb-2 text-sm italic text-muted-foreground">
          {children}
        </div>
      )}
    </ActionCard>
  );
};
