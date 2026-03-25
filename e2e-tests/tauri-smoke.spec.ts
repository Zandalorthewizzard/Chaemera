import { expect, test } from "./helpers/tauri_smoke_fixtures";

test("tauri smoke harness renders the default home route", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Apps" })).toBeVisible();
  await expect(page.getByTestId("title-bar-app-name-button")).toContainText(
    "(no app selected)",
  );
  await expect(page.getByTestId("home-chat-input-container")).toBeVisible();
});

test("tauri smoke harness boots a stable Tauri route with bridge support", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

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

test("tauri smoke can render core workspace Leptos shell payloads", async ({
  page,
}) => {
  await page.goto("/settings");

  const results = await page.evaluate(async () => {
    const routeIds = ["apps-home", "chat-workspace", "app-details"];
    const invoke = window.__TAURI__?.core?.invoke;
    if (!invoke) {
      return [];
    }
    const rendered = [];

    for (const routeId of routeIds) {
      const result = await invoke("leptos_render_route", {
        request: { routeId },
      });
      rendered.push(result);
    }

    return rendered;
  });

  expect(results).toEqual([
    expect.objectContaining({ routeId: "apps-home", title: "Apps" }),
    expect.objectContaining({
      routeId: "chat-workspace",
      title: "Chat Workspace",
    }),
    expect.objectContaining({ routeId: "app-details", title: "App Details" }),
  ]);
});

test("tauri smoke harness can deliver native event hooks to the renderer", async ({
  page,
}) => {
  await page.goto("/settings");

  const eventPayload = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const cleanup =
          window.__CHAEMERA_TAURI_CORE__?.on?.(
            "force-close-detected",
            (payload) => {
              cleanup?.();
              resolve(payload);
            },
          ) ?? null;

        window.__CHAEMERA_TAURI_SMOKE__?.emit("force-close-detected", {
          performanceData: {
            timestamp: 1,
            memoryUsageMB: 256,
          },
        });

        setTimeout(() => {
          cleanup?.();
          resolve(null);
        }, 250);
      }),
  );

  expect(eventPayload).toEqual({
    performanceData: {
      timestamp: 1,
      memoryUsageMB: 256,
    },
  });
});

test("tauri smoke renders Leptos route shells for low-risk routes", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(
    page
      .getByTestId("leptos-route-shell")
      .getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(page.getByTestId("leptos-react-body")).toBeVisible();

  await page.goto("/help");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(
    page
      .getByTestId("leptos-route-shell")
      .getByRole("heading", { level: 1, name: "Help" }),
  ).toBeVisible();
  await expect(page.getByTestId("leptos-react-body")).toBeVisible();
});
