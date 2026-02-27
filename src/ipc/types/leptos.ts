import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

export const LeptosRouteIdSchema = z.enum([
  "settings",
  "library",
  "provider-settings",
  "help",
]);

export type LeptosRouteId = z.infer<typeof LeptosRouteIdSchema>;

export const RenderLeptosRouteParamsSchema = z.object({
  routeId: LeptosRouteIdSchema,
  providerId: z.string().optional(),
});

export type RenderLeptosRouteParams = z.infer<
  typeof RenderLeptosRouteParamsSchema
>;

export const RenderLeptosRouteResultSchema = z.object({
  routeId: LeptosRouteIdSchema,
  title: z.string(),
  html: z.string(),
});

export type RenderLeptosRouteResult = z.infer<
  typeof RenderLeptosRouteResultSchema
>;

export const leptosContracts = {
  renderRoute: defineContract({
    channel: "leptos:render-route",
    input: RenderLeptosRouteParamsSchema,
    output: RenderLeptosRouteResultSchema,
  }),
} as const;

export const leptosClient = createClient(leptosContracts);
