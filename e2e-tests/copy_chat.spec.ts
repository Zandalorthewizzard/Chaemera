import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

test("copy message content - basic functionality", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  await po.sendPrompt("[dump] Just say hello without creating any files");

  await po.page
    .context()
    .grantPermissions(["clipboard-read", "clipboard-write"]);

  const copyButton = po.page.getByTestId("copy-message-button").first();
  await copyButton.click();

  const clipboardContent = await po.page.evaluate(() =>
    navigator.clipboard.readText(),
  );

  expect(clipboardContent.length).toBeGreaterThan(0);
  expect(clipboardContent).not.toContain("<dyad-");
});

test("copy message content - dyad-write conversion", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  await po.sendPrompt(
    "Create a simple React component in src/components/Button.tsx",
  );

  await po.page
    .context()
    .grantPermissions(["clipboard-read", "clipboard-write"]);

  const copyButton = po.page.getByTestId("copy-message-button").first();
  await copyButton.click();

  const clipboardContent = await po.page.evaluate(() =>
    navigator.clipboard.readText(),
  );

  expect(clipboardContent).toContain("### File:");
  expect(clipboardContent).toContain("```");
  expect(clipboardContent).not.toContain("<dyad-write");
});

// This test is flaky.
test.skip("copy button tooltip states", async ({ po }) => {
  await po.setUp({ autoApprove: true });
  await po.importApp("minimal");

  await po.sendPrompt("Say hello");

  const copyButton = po.page.getByTestId("copy-message-button").first();

  await copyButton.hover();
  const tooltip = po.page.locator('[role="tooltip"]');
  await expect(tooltip).toHaveText("Copy");

  await po.page
    .context()
    .grantPermissions(["clipboard-read", "clipboard-write"]);
  await copyButton.click();
  await copyButton.hover();
  await expect(tooltip).toHaveText("Copied!");
});
