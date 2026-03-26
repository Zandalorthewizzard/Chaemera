import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("themes management - AI generator image upload limit", async ({ po }) => {
  await po.setUpOss();

  // Navigate to Themes page via Library sidebar
  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(po.page.getByRole("heading", { name: "Themes" })).toBeVisible();

  // Click New Theme button
  await po.page.getByRole("button", { name: "New Theme" }).click();

  // Wait for dialog to open
  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  // Verify AI-Powered Generator tab is active by default
  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  // Verify upload area is visible
  const uploadArea = po.page.getByText("Click to upload images");
  await expect(uploadArea).toBeVisible();

  // Set up file chooser listener BEFORE clicking the upload area
  const fileChooserPromise = po.page.waitForEvent("filechooser");

  // Click the upload area to trigger file picker
  await uploadArea.click();

  // Handle the file chooser dialog - select the same image 7 times (exceeds 5 limit)
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

  // Verify that only 5 images were uploaded (max limit)
  await expect(po.page.getByText("5 / 5 images")).toBeVisible();
  await expect(po.page.getByText("Maximum reached")).toBeVisible();

  // Verify error toast appeared about skipped images
  await expect(po.page.getByText(/files? (was|were) skipped/)).toBeVisible();
});

test("themes management - AI generator flow", async ({ po }) => {
  await po.setUp();

  // Navigate to Themes page via Library sidebar
  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(po.page.getByRole("heading", { name: "Themes" })).toBeVisible();

  // Verify no themes exist initially
  await expect(
    po.page.getByText("No custom themes yet. Create one to get started."),
  ).toBeVisible();

  // Click New Theme button
  await po.page.getByRole("button", { name: "New Theme" }).click();

  // Wait for dialog to open
  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  // Verify AI-Powered Generator tab is active by default
  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  // Verify upload area is visible
  const uploadArea = po.page.getByText("Click to upload images");
  await expect(uploadArea).toBeVisible();

  // Verify Generate button is disabled before uploading images
  const generateButton = po.page.getByRole("button", {
    name: "Generate Theme Prompt",
  });
  await expect(generateButton).toBeDisabled();

  // Fill in theme details
  await po.page.locator("#ai-name").fill("AI Generated Theme");
  await po.page.locator("#ai-description").fill("Created via AI generator");

  // Upload an image
  const fileChooserPromise = po.page.waitForEvent("filechooser");
  await uploadArea.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(["e2e-tests/fixtures/images/logo.png"]);

  // Verify image counter shows 1 image
  await expect(po.page.getByText("1 / 5 images")).toBeVisible();

  // Verify Generate button is now enabled
  await expect(generateButton).toBeEnabled();

  // Click Generate to get mock theme prompt (test mode returns mock response)
  await generateButton.click();

  // Wait for generation to complete - the generated prompt textarea should appear
  await expect(po.page.locator("#ai-prompt")).toBeVisible({ timeout: 10000 });

  // Verify the mock theme content is displayed
  await expect(po.page.getByText("Test Mode Theme")).toBeVisible();

  // Save the theme
  await po.page.getByRole("button", { name: "Save Theme" }).click();

  // Verify dialog closes and theme card appears
  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  await expect(po.page.getByTestId("theme-card")).toBeVisible();
  await expect(po.page.getByText("AI Generated Theme")).toBeVisible();
  await expect(po.page.getByText("Created via AI generator")).toBeVisible();
});

test("themes management - AI generator from website URL", async ({ po }) => {
  await po.setUpOss();

  // Navigate to Themes page via Library sidebar
  await po.navigation.goToLibraryTab();
  await po.page.getByRole("link", { name: "Themes" }).click();
  await expect(po.page.getByRole("heading", { name: "Themes" })).toBeVisible();

  // Click New Theme button
  await po.page.getByRole("button", { name: "New Theme" }).click();

  // Wait for dialog to open
  await expect(
    po.page.getByRole("dialog").getByText("Create Custom Theme"),
  ).toBeVisible();

  // Verify AI-Powered Generator tab is active by default
  const aiTab = po.page.getByRole("tab", { name: "AI-Powered Generator" });
  await expect(aiTab).toHaveAttribute("data-active", "");

  // Switch to Website URL input source
  await po.page.getByRole("button", { name: "Website URL" }).click();

  // Verify URL input is visible
  const urlInput = po.page.getByLabel("Website URL");
  await expect(urlInput).toBeVisible();

  // Verify Generate button is disabled before entering URL
  const generateButton = po.page.getByRole("button", {
    name: "Generate Theme Prompt",
  });
  await expect(generateButton).toBeDisabled();

  // Fill in theme details
  await po.page.locator("#ai-name").fill("Website Theme");
  await po.page.locator("#ai-description").fill("Generated from website");

  // Enter a website URL
  await urlInput.fill("https://example.com");

  // Verify Generate button is now enabled
  await expect(generateButton).toBeEnabled();

  // Click Generate to get mock theme prompt (test mode returns mock response)
  await generateButton.click();

  // Wait for generation to complete - the generated prompt textarea should appear
  await expect(po.page.locator("#ai-prompt")).toBeVisible({ timeout: 10000 });

  // Verify the mock theme content is displayed (URL-specific mock)
  await expect(po.page.getByText("Test Mode Theme (from URL)")).toBeVisible();

  // Save the theme
  await po.page.getByRole("button", { name: "Save Theme" }).click();

  // Verify dialog closes and theme card appears
  await expect(po.page.getByRole("dialog")).not.toBeVisible();
  const themeCard = po.page.getByTestId("theme-card");
  await expect(themeCard).toBeVisible();
  await expect(themeCard.getByText("Website Theme")).toBeVisible();
  await expect(themeCard.getByText("Generated from website")).toBeVisible();
});
