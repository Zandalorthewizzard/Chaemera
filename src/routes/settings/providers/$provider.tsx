import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "@/routes/root";
import { ProviderSettingsPage } from "@/components/settings/ProviderSettingsPage";

interface ProviderSettingsParams {
  provider: string;
}

export const providerSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/providers/$provider",
  params: {
    parse: (params: { provider: string }): ProviderSettingsParams => ({
      provider: params.provider,
    }),
  },
  component: function ProviderSettingsRouteComponent() {
    const { provider } = providerSettingsRoute.useParams();

    return (
      <LeptosRouteHost routeId="provider-settings" providerId={provider}>
        <ProviderSettingsPage provider={provider} />
      </LeptosRouteHost>
    );
  },
});
