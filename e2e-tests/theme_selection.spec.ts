import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("theme selection - app-specific theme is persisted", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  // Open menu and select "Default Theme" for this app
  await po.chatActions
    .getChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-none")).toBeVisible();
  await po.page.getByTestId("theme-option-default").click();
  await expect(po.page.getByTestId("theme-option-default")).not.toBeVisible();

  // Re-open, verify selection, then switch to "No Theme"
  await po.chatActions
    .getChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-default")).toHaveClass(
    /bg-primary/,
  );
  await po.page.getByTestId("theme-option-none").click();
  await expect(po.page.getByTestId("theme-option-none")).not.toBeVisible();

  // Re-open and verify "No Theme" is selected
  await po.chatActions
    .getChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-none")).toHaveClass(
    /bg-primary/,
  );
});
