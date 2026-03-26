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

test("themes management - create theme from chat input", async ({ po }) => {
  await po.setUp();

  await po.chatActions
    .getHomeChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();

  await po.page.getByRole("menuitem", { name: "Themes" }).click();
  await po.page.getByRole("menuitem", { name: "New Theme" }).click();

  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  await po.page.getByRole("tab", { name: "Manual Configuration" }).click();

  await po.page.locator("#manual-name").fill("Chat Input Theme");
  await po.page.locator("#manual-description").fill("Created from chat input");
  await po.page
    .locator("#manual-prompt")
    .fill("Use dark mode with purple accents");

  await po.page.getByRole("button", { name: "Save Theme" }).click();

  await expect(po.page.getByRole("dialog")).not.toBeVisible();

  await po.chatActions
    .getHomeChatInputContainer()
    .getByTestId("auxiliary-actions-menu")
    .click();
  await po.page.getByRole("menuitem", { name: "Themes" }).click();

  await expect(po.page.getByTestId("theme-option-custom:1")).toHaveClass(
    /bg-primary/,
  );
});

test("themes management - AI generator image upload limit", async ({ po }) => {
  await po.setUpOss();

  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();

  await po.page.getByRole("button", { name: "New Theme" }).click();

  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  const uploadArea = po.page.getByText("Click to upload images");
  await expect(uploadArea).toBeVisible();

  const fileChooserPromise = po.page.waitForEvent("filechooser");
  await uploadArea.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles([
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
    "e2e-tests/fixtures/images/logo.png",
  ]);

  await expect(po.page.getByText("5 / 5 images")).toBeVisible();
  await expect(po.page.getByText("Maximum reached")).toBeVisible();
  await expect(po.page.getByText(/files? (was|were) skipped/)).toBeVisible();
});

test("themes management - AI generator flow", async ({ po }) => {
  await po.setUp();

  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();

  await po.page.getByRole("button", { name: "New Theme" }).click();

  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  const uploadArea = po.page.getByText("Click to upload images");
  await expect(uploadArea).toBeVisible();

  const generateButton = po.page.getByRole("button", {
    name: "Generate Theme Prompt",
  });
  await expect(generateButton).toBeDisabled();

  await po.page.locator("#ai-name").fill("AI Generated Theme");
  await po.page.locator("#ai-description").fill("Created via AI generator");

  const fileChooserPromise = po.page.waitForEvent("filechooser");
  await uploadArea.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(["e2e-tests/fixtures/images/logo.png"]);

  await expect(po.page.getByText("1 / 5 images")).toBeVisible();
  await expect(generateButton).toBeEnabled();
  await generateButton.click();
  await expect(po.page.locator("#ai-prompt")).toBeVisible({ timeout: 10000 });
  await expect(po.page.locator("#ai-prompt")).toHaveValue(
    /Reference source \(images\):/,
  );

  await po.page.getByRole("button", { name: "Save Theme" }).click();

  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  await expect(po.page.getByTestId("theme-card")).toBeVisible();
  await expect(po.page.getByText("AI Generated Theme")).toBeVisible();
  await expect(po.page.getByText("Created via AI generator")).toBeVisible();
});

test("themes management - AI generator from website URL", async ({ po }) => {
  await po.setUpOss();

  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();

  await po.page.getByRole("button", { name: "New Theme" }).click();

  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  await po.page.getByRole("button", { name: "Website URL" }).click();

  const urlInput = po.page.getByLabel("Website URL");
  await expect(urlInput).toBeVisible();

  const generateButton = po.page.getByRole("button", {
    name: "Generate Theme Prompt",
  });
  await expect(generateButton).toBeDisabled();

  await po.page.locator("#ai-name").fill("Website Theme");
  await po.page.locator("#ai-description").fill("Generated from website");
  await urlInput.fill("https://example.com");

  await expect(generateButton).toBeEnabled();
  await generateButton.click();
  await expect(po.page.locator("#ai-prompt")).toBeVisible({ timeout: 10000 });
  await expect(po.page.locator("#ai-prompt")).toHaveValue(
    /Reference source \(url\): https:\/\/example\.com/,
  );

  await po.page.getByRole("button", { name: "Save Theme" }).click();

  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  const themeCard = po.page.getByTestId("theme-card");
  await expect(themeCard).toBeVisible();
  await expect(themeCard.getByText("Website Theme")).toBeVisible();
  await expect(themeCard.getByText("Generated from website")).toBeVisible();
});
