import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import AppDetailsPage from "../pages/app-details";
import { z } from "zod";

export const appDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app-details",
  component: function AppDetailsRouteComponent() {
    return (
      <LeptosRouteHost routeId="app-details">
        <AppDetailsPage />
      </LeptosRouteHost>
    );
  },
  validateSearch: z.object({
    appId: z.number().optional(),
  }),
});
