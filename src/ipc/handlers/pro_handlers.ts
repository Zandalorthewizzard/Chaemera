import { appLog as log } from "@/lib/app_logger";
import { createLoggedHandler } from "./safe_handle";
import { UserBudgetInfo } from "@/ipc/types";

const logger = log.scope("pro_handlers");
const handle = createLoggedHandler(logger);

export function registerProHandlers() {
  // Keep the channel registered for interface stability in OSS builds.
  // Pro budget endpoints are intentionally disabled.
  handle("get-user-budget", async (): Promise<UserBudgetInfo | null> => {
    logger.info("get-user-budget is disabled in OSS build.");
    return null;
  });
}
