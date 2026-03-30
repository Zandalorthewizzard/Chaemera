import { ipc, type LeptosRouteId } from "@/ipc/types";
import {
  hasTauriLeptosShellSupport,
  shouldRenderLeptosShellChrome,
} from "@/lib/leptos_shell";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function LeptosRouteHost({
  routeId,
  providerId,
  children,
}: {
  routeId: LeptosRouteId;
  providerId?: string;
  children?: ReactNode;
}) {
  const supportsLeptosShell = hasTauriLeptosShellSupport();
  const renderShellChrome =
    supportsLeptosShell && shouldRenderLeptosShellChrome(routeId);

  const shellQuery = useQuery({
    queryKey: queryKeys.leptosShell.route({ routeId, providerId }),
    queryFn: () =>
      ipc.leptos.renderRoute({
        routeId,
        providerId,
      }),
    enabled: renderShellChrome,
    staleTime: Infinity,
    retry: false,
  });

  if (!supportsLeptosShell) {
    return <>{children}</>;
  }

  if (!renderShellChrome || shellQuery.isError) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="shrink-0">
        {shellQuery.data ? (
          <div
            data-testid="leptos-route-shell"
            dangerouslySetInnerHTML={{ __html: shellQuery.data.html }}
          />
        ) : (
          <div
            data-testid="leptos-route-shell-loading"
            className="border-b border-dashed border-border/70 bg-background px-8 py-6 text-sm text-muted-foreground"
          >
            Loading Leptos shell...
          </div>
        )}
      </div>
      <div
        data-testid="leptos-react-body"
        className="flex min-h-0 flex-1 flex-col bg-background"
      >
        {children}
      </div>
    </div>
  );
}
