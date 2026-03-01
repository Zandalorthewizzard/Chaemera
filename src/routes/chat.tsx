import { createRoute } from "@tanstack/react-router";
import { LeptosRouteHost } from "@/components/leptos/LeptosRouteHost";
import { rootRoute } from "./root";
import ChatPage from "../pages/chat";
import { z } from "zod";

export const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: function ChatRouteComponent() {
    return (
      <LeptosRouteHost routeId="chat-workspace">
        <ChatPage />
      </LeptosRouteHost>
    );
  },
  validateSearch: z.object({
    id: z.number().optional(),
  }),
});
