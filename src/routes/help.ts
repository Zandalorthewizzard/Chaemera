import { Route } from "@tanstack/react-router";
import HelpPage from "@/pages/help";
import { rootRoute } from "./root";

export const helpRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: HelpPage,
});
