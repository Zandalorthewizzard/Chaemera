import { ipc, type LeptosRouteId } from "@/ipc/types";
import { hasTauriLeptosShellSupport } from "@/lib/leptos_shell";
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
  children: ReactNode;
}) {
  const supportsLeptosShell = hasTauriLeptosShellSupport();

  const shellQuery = useQuery({
    queryKey: queryKeys.leptosShell.route({ routeId, providerId }),
    queryFn: () =>
      ipc.leptos.renderRoute({
        routeId,
        providerId,
      }),
    enabled: supportsLeptosShell,
    staleTime: Infinity,
    retry: false,
  });

  if (!supportsLeptosShell) {
    return <>{children}</>;
  }

  if (shellQuery.isError) {
    return <>{children}</>;
  }

  return (
    <div className="h-full w-full overflow-y-auto">
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
      <div
        data-testid="leptos-react-body"
        className="border-t border-border/50 bg-background"
      >
        {children}
      </div>
    </div>
  );
}
