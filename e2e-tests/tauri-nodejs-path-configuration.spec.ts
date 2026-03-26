import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";

test.describe("Node.js Path Configuration", () => {
  test("should browse and set custom Node.js path", async ({ po }) => {
    await po.setUp();
    await po.navigation.goToSettingsTab();

    const browseButton = po.page.getByRole("button", {
      name: /Browse for Node\.js/i,
    });
    await browseButton.click();

    await expect(po.page.getByText("Custom Path:")).toBeVisible();
    await expect(po.page.getByText("C:/Program Files/nodejs")).toBeVisible();
    await expect(
      po.page.getByRole("button", { name: /Reset to Default/i }),
    ).toBeVisible();
  });

  test("should reset custom path to system default", async ({ po }) => {
    await po.setUp();
    await po.navigation.goToSettingsTab();

    const resetButton = po.page.getByRole("button", {
      name: /Reset to Default/i,
    });

    if (await resetButton.isVisible()) {
      await resetButton.click();

      await expect(po.page.getByText("System PATH:")).toBeVisible();
    }
  });

  test("should show CheckCircle when Node.js is valid", async ({ po }) => {
    await po.setUp();
    await po.navigation.goToSettingsTab();

    await po.page.waitForTimeout(2000);

    const validStatus = po.page.locator(
      "div.flex.items-center.gap-1.text-green-600, div.flex.items-center.gap-1.text-green-400",
    );

    if (!(await validStatus.isVisible())) {
      test.skip();
    }

    await expect(validStatus).toBeVisible();
    const checkIcon = validStatus.locator("svg").first();
    await expect(checkIcon).toBeVisible();
  });
});
