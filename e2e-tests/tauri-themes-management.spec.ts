import { test, expect } from "./helpers/tauri_test_helper";

test("themes management - CRUD operations", async ({ po }) => {
  await po.setUp();

  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(
    po.page.getByText("Leptos shell smoke route for themes."),
  ).toBeVisible();

  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();

  await po.page.getByRole("button", { name: "New Theme" }).click();

  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  await po.page.getByRole("tab", { name: "Manual Configuration" }).click();

  await po.page.locator("#manual-name").fill("My Test Theme");
  await po.page.locator("#manual-description").fill("A test theme description");
  await po.page
    .locator("#manual-prompt")
    .fill("Use blue colors and modern styling");

  await po.page.getByRole("button", { name: "Save Theme" }).click();

  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  await expect(po.page.getByTestId("theme-card")).toBeVisible();
  await expect(po.page.getByText("My Test Theme")).toBeVisible();
  await expect(po.page.getByText("A test theme description")).toBeVisible();

  await po.page.getByTestId("edit-theme-button").click();

  await expect(
    po.page.getByRole("dialog").getByText("Edit Theme"),
  ).toBeVisible();

  await po.page.getByRole("dialog").getByLabel("Theme Name").clear();
  await po.page
    .getByRole("dialog")
    .getByLabel("Theme Name")
    .fill("Updated Theme");
  await po.page
    .getByRole("dialog")
    .getByLabel("Description (optional)")
    .fill("Updated description");
  await po.page.getByRole("dialog").getByLabel("Theme Prompt").clear();
  await po.page
    .getByRole("dialog")
    .getByLabel("Theme Prompt")
    .fill("Updated prompt content");

  await po.page.getByRole("button", { name: "Save" }).click();

  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  await expect(po.page.getByText("Updated Theme")).toBeVisible();
  await expect(po.page.getByText("Updated description")).toBeVisible();
  await expect(po.page.getByText("Updated prompt content")).toBeVisible();
  await expect(po.page.getByText("My Test Theme")).not.toBeVisible();

  await po.page.getByTestId("delete-prompt-button").click();

  await expect(po.page.getByRole("alertdialog")).toBeVisible();
  await expect(po.page.getByText("Delete Theme")).toBeVisible();
  await expect(
    po.page.getByText('Are you sure you want to delete "Updated Theme"?'),
  ).toBeVisible();

  await po.page.getByRole("button", { name: "Delete" }).click();

  await expect(po.page.getByRole("alertdialog")).not.toBeVisible();
  await expect(po.page.getByText("Updated Theme")).not.toBeVisible();
  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();
});
