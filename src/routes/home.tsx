import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import HomePage from "../pages/home";
import { z } from "zod";
export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: function HomeRouteComponent() {
    return (
      <LeptosRouteHost routeId="apps-home">
        <HomePage />
      </LeptosRouteHost>
    );
  },
  validateSearch: z.object({
    appId: z.number().optional(),
  }),
});
