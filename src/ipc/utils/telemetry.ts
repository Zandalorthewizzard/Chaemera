import { appLog as log } from "@/lib/app_logger";
import { TelemetryEventPayload } from "@/ipc/types";
import type { IpcSenderLike } from "./ipc_sender_types";

const logger = log.scope("telemetry");

/**
 * Sends a telemetry event to the renderer, where PostHog can capture it.
 */
export function sendTelemetryEvent(
  sender: IpcSenderLike | null | undefined,
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (!sender) return;
    sender.send("telemetry:event", {
      eventName,
      properties,
    } satisfies TelemetryEventPayload);
  } catch (error) {
    logger.warn("Error sending telemetry event:", error);
  }
}
