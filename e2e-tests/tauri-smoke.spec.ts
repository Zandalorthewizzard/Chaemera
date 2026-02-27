import { expect, test } from "./helpers/tauri_smoke_fixtures";

test("tauri smoke harness boots the home page with Tauri bridge support", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "Build a new app" }),
  ).toBeVisible();

  const bridgeState = await page.evaluate(() => ({
    hasBridge: !!window.__CHAEMERA_TAURI_CORE__,
    hasHarness: !!window.__CHAEMERA_TAURI_SMOKE__,
    supportedChannels: window.__CHAEMERA_TAURI_CORE__?.supportedChannels ?? [],
  }));

  expect(bridgeState.hasBridge).toBe(true);
  expect(bridgeState.hasHarness).toBe(true);
  expect(bridgeState.supportedChannels).toContain("get-user-settings");
  expect(bridgeState.supportedChannels).toContain("get-themes");
});

test("tauri smoke harness can deliver native event hooks to the renderer", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.__CHAEMERA_TAURI_SMOKE__?.emit("force-close-detected", {
      performanceData: {
        timestamp: 1,
        memoryUsageMB: 256,
      },
    }),
  );

  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("Force Close Detected")).toBeVisible();
});

test("tauri smoke renders Leptos route shells for low-risk routes", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(page.getByText("Settings")).toBeVisible();

  await page.goto("/help");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(page.getByText("Help")).toBeVisible();
});
