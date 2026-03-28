import { appLog as log } from "@/lib/app_logger";
import { IS_TEST_BUILD } from "../utils/test_utils";
import { createTypedHandler } from "./base";
import { systemContracts } from "../types/system";

const logger = log.scope("release_note_handlers");

export function registerReleaseNoteHandlers() {
  createTypedHandler(
    systemContracts.doesReleaseNoteExist,
    async (_, params) => {
      const { version } = params;

      if (!version || typeof version !== "string") {
        throw new Error("Invalid version provided");
      }

      // For E2E tests, we don't want to check for release notes
      // or show release notes, as it interferes with the tests.
      if (IS_TEST_BUILD) {
        return { exists: false };
      }
      logger.debug(
        `Release note checks are disabled in the public release for version ${version}.`,
      );
      return { exists: false };
    },
  );

  logger.debug("Registered release note IPC handlers");
}
