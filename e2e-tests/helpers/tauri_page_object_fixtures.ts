import fs from "fs";
import os from "os";
import path from "path";
import { test as base } from "./tauri_smoke_fixtures";
import { PageObject } from "./page-objects";
import { FAKE_LLM_BASE_PORT } from "./test-ports";

export const test = base.extend<{
  attachScreenshotsToReport: void;
  po: PageObject;
  tauriUserDataDir: string;
}>({
  tauriUserDataDir: [
    async ({}, use) => {
      const userDataDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "chaemera-tauri-po-"),
      );
      try {
        await use(userDataDir);
      } finally {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    },
    { auto: true },
  ],
  po: [
    async ({ page, tauriUserDataDir }, use, testInfo) => {
      await page.goto("/");
      const po = new PageObject(null, page, {
        userDataDir: tauriUserDataDir,
        fakeLlmPort: FAKE_LLM_BASE_PORT + testInfo.parallelIndex,
      });
      await use(po);
    },
    { auto: true },
  ],
  attachScreenshotsToReport: [
    async ({ page }, use, testInfo) => {
      await use();

      if (testInfo.status !== testInfo.expectedStatus) {
        try {
          const screenshot = await page.screenshot({ timeout: 5_000 });
          await testInfo.attach("screenshot", {
            body: screenshot,
            contentType: "image/png",
          });
        } catch (error) {
          console.error("Error taking screenshot on failure", error);
        }
      }
    },
    { auto: true },
  ],
});
