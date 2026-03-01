import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import ThemesPage from "@/pages/themes";
import { createElement } from "react";

export const themesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/themes",
  component: function ThemesRouteComponent() {
    return createElement(LeptosRouteHost, {
      routeId: "themes",
      children: createElement(ThemesPage),
    });
  },
});
