import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";
import { expectTauriHarnessSettings } from "./helpers/tauri_harness_state";

test("tauri theme selection persists the dyad-wide default theme", async ({
  po,
}) => {
  await po.setUp();

  await expectTauriHarnessSettings(po.page, {
    selectedThemeId: "default",
  });

  await po.chatActions
    .getHomeChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-default")).toBeVisible();
  await po.page.getByTestId("theme-option-none").click();
  await expect(po.page.getByTestId("theme-option-none")).not.toBeVisible();

  await expectTauriHarnessSettings(po.page, {
    selectedThemeId: "",
  });

  await po.chatActions
    .getHomeChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-none")).toHaveClass(
    /bg-primary/,
  );
  await po.page.getByTestId("theme-option-default").click();
  await expect(po.page.getByTestId("theme-option-default")).not.toBeVisible();

  await expectTauriHarnessSettings(po.page, {
    selectedThemeId: "default",
  });
});

test("tauri theme selection persists the app-specific theme", async ({
  po,
}) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  await po.chatActions
    .getChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-none")).toBeVisible();
  await po.page.getByTestId("theme-option-default").click();
  await expect(po.page.getByTestId("theme-option-default")).not.toBeVisible();

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

  await po.chatActions
    .getChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await expect(po.page.getByTestId("theme-option-none")).toHaveClass(
    /bg-primary/,
  );
});
