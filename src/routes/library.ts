import { Route } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import LibraryPage from "@/pages/library";
import { createElement } from "react";

export const libraryRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: function LibraryRouteComponent() {
    return createElement(LeptosRouteHost, {
      routeId: "library",
      children: createElement(LibraryPage),
    });
  },
});
