import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";

test("setup banner shows correct state when node.js is installed", async ({
  po,
}) => {
  await po.page.waitForLoadState("domcontentloaded");

  await expect(async () => {
    await expect(
      po.page.getByText("Setup Dyad", { exact: true }),
    ).toBeVisible();
  }).toPass({ timeout: 5_000 });

  await expect(
    po.page.getByText("1. Install Node.js (App Runtime)"),
  ).toBeVisible();
  await expect(po.page.getByText("2. Setup AI Access")).toBeVisible();

  await po.page.getByText("1. Install Node.js (App Runtime)").click();
  await expect(
    po.page.getByText(/Node\.js \(v[\d.]+\) installed/),
  ).toBeVisible();

  await expect(
    po.page.getByRole("button", { name: /Setup Google Gemini API Key/ }),
  ).toBeVisible();
  await expect(
    po.page.getByRole("button", { name: /Setup OpenRouter API Key/ }),
  ).toBeVisible();
});

test("node.js install flow", async ({ po }) => {
  await po.setNodeMock(false);

  await expect(async () => {
    await po.page.reload({ waitUntil: "domcontentloaded" });
  }).toPass({ timeout: 5_000 });

  await expect(async () => {
    await expect(
      po.page.getByText("Setup Dyad", { exact: true }),
    ).toBeVisible();
  }).toPass({ timeout: 5_000 });

  const nodeSectionToggle = po.page.getByRole("button", {
    name: "1. Install Node.js (App Runtime)",
  });
  await expect(nodeSectionToggle).toBeVisible();
  await nodeSectionToggle.click();

  await expect(
    po.page.getByRole("button", { name: "Install Node.js Runtime" }),
  ).toBeVisible({ timeout: 5_000 });
  await expect(
    po.page.getByText("Node.js already installed? Configure path manually"),
  ).toBeVisible();

  await po.page
    .getByRole("button", { name: "Install Node.js Runtime" })
    .click();

  const continueButton = po.page.getByRole("button", {
    name: /Continue.*I installed Node\.js/,
  });
  await expect(continueButton).toBeVisible();

  await po.setNodeMock(true);
  await continueButton.click({ force: true });

  await expect(
    po.page.getByText(/Node\.js \(v[\d.]+\) installed/),
  ).toBeVisible();

  await po.setNodeMock(null);
});
