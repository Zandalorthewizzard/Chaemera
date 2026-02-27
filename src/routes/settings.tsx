import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import SettingsPage from "../pages/settings";

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: function SettingsRouteComponent() {
    return (
      <LeptosRouteHost routeId="settings">
        <SettingsPage />
      </LeptosRouteHost>
    );
  },
});
