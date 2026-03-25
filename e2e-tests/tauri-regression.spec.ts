import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/tauri_smoke_fixtures";

async function invokeViaTauriBridge<T>(
  page: Page,
  channel: string,
  payload?: unknown,
): Promise<T> {
  const result = await page.evaluate(
    async ({ channel, payload }) => {
      const bridge = window.__CHAEMERA_TAURI_CORE__;
      if (!bridge) {
        throw new Error("Tauri core bridge is unavailable.");
      }

      return bridge.invoke(channel, payload);
    },
    { channel, payload },
  );

  return result as T;
}

async function getHarnessState(page: Page): Promise<{
  externalUrls: string[];
  invocations: Array<{ channel: string; payload: unknown }>;
}> {
  const state = await page.evaluate(() =>
    window.__CHAEMERA_TAURI_SMOKE__?.getState(),
  );

  if (!state) {
    throw new Error("Tauri smoke harness state is unavailable.");
  }

  return {
    externalUrls: state.externalUrls,
    invocations: state.invocations,
  };
}

test("tauri regression harness exercises core app and chat bridge flows", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

  const createdApp = await invokeViaTauriBridge<{
    id: number;
    name: string;
    resolvedPath: string;
    files: string[];
  }>(page, "create-app", {
    name: "Tauri Regression App",
  });

  expect(createdApp).toEqual(
    expect.objectContaining({
      id: expect.any(Number),
      name: "Tauri Regression App",
      resolvedPath: expect.stringContaining("Tauri Regression App"),
    }),
  );
  expect(createdApp.files).toContain("package.json");

  const reopenedApp = await invokeViaTauriBridge<{
    id: number;
    name: string;
  }>(page, "get-app", createdApp.id);
  expect(reopenedApp).toEqual(
    expect.objectContaining({
      id: createdApp.id,
      name: "Tauri Regression App",
    }),
  );

  const searchResults = await invokeViaTauriBridge<
    Array<{
      id: number;
      name: string;
      matchedChatTitle: string | null;
      matchedChatMessage: string | null;
    }>
  >(page, "search-app", "regression");
  expect(searchResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: createdApp.id,
        name: "Tauri Regression App",
      }),
    ]),
  );

  const chatId = await invokeViaTauriBridge<number>(
    page,
    "create-chat",
    createdApp.id,
  );
  expect(chatId).toEqual(expect.any(Number));

  const chats = await invokeViaTauriBridge<
    Array<{
      id: number;
      appId: number;
      title: string | null;
    }>
  >(page, "get-chats", createdApp.id);
  expect(chats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: chatId,
        appId: createdApp.id,
        title: null,
      }),
    ]),
  );

  const chat = await invokeViaTauriBridge<{
    id: number;
    title: string;
    messages: unknown[];
    initialCommitHash: string | null;
  }>(page, "get-chat", chatId);
  expect(chat).toEqual(
    expect.objectContaining({
      id: chatId,
      title: "",
      messages: [],
      initialCommitHash: "abc123def456",
    }),
  );

  const { invocations } = await getHarnessState(page);
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "create-app" }),
      expect.objectContaining({ channel: "get-app" }),
      expect.objectContaining({ channel: "search-app" }),
      expect.objectContaining({ channel: "create-chat" }),
      expect.objectContaining({ channel: "get-chats" }),
      expect.objectContaining({ channel: "get-chat" }),
    ]),
  );
});

test("tauri regression harness preserves native side effects and callback events", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

  const patchedSettings = await invokeViaTauriBridge<{
    enableAutoUpdate: boolean;
    releaseChannel: string;
  }>(page, "set-user-settings", {
    enableAutoUpdate: false,
    releaseChannel: "beta",
  });
  expect(patchedSettings).toEqual(
    expect.objectContaining({
      enableAutoUpdate: false,
      releaseChannel: "beta",
    }),
  );

  const latestSettings = await invokeViaTauriBridge<{
    enableAutoUpdate: boolean;
    releaseChannel: string;
  }>(page, "get-user-settings");
  expect(latestSettings).toEqual(
    expect.objectContaining({
      enableAutoUpdate: false,
      releaseChannel: "beta",
    }),
  );

  const deepLinkPayload = await page.evaluate(async () => {
    const bridge = window.__CHAEMERA_TAURI_CORE__;
    if (!bridge?.on) {
      throw new Error("Tauri event bridge is unavailable.");
    }
    const subscribe = bridge.on;

    return new Promise<unknown>((resolve) => {
      let cleanup: (() => void) | null = null;
      cleanup =
        subscribe("deep-link-received", (payload) => {
          cleanup?.();
          resolve(payload);
        }) ?? null;

      void bridge.invoke("supabase:fake-connect-and-set-project", {
        appId: 1,
        fakeProjectId: "fake-project-id",
      });

      setTimeout(() => {
        cleanup?.();
        resolve(null);
      }, 250);
    });
  });
  expect(deepLinkPayload).toEqual({
    type: "supabase-oauth-return",
    url: "https://supabase-oauth.dyad.sh/api/connect-supabase/login",
  });

  const connectedApp = await invokeViaTauriBridge<{
    id: number;
    supabaseProjectId: string | null;
    supabaseOrganizationSlug: string | null;
    supabaseProjectName: string | null;
  }>(page, "get-app", 1);
  expect(connectedApp).toEqual(
    expect.objectContaining({
      id: 1,
      supabaseProjectId: "fake-project-id",
      supabaseOrganizationSlug: "fake-org-id",
      supabaseProjectName: "Fake Supabase Project",
    }),
  );

  await invokeViaTauriBridge(page, "open-external-url", "https://chaemera.app");
  await invokeViaTauriBridge(page, "window:minimize");
  await invokeViaTauriBridge(page, "window:maximize");
  await invokeViaTauriBridge(page, "window:close");

  const { externalUrls, invocations } = await getHarnessState(page);
  expect(externalUrls).toContain("https://chaemera.app");
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "set-user-settings" }),
      expect.objectContaining({ channel: "get-user-settings" }),
      expect.objectContaining({
        channel: "supabase:fake-connect-and-set-project",
      }),
      expect.objectContaining({ channel: "open-external-url" }),
      expect.objectContaining({ channel: "window:minimize" }),
      expect.objectContaining({ channel: "window:maximize" }),
      expect.objectContaining({ channel: "window:close" }),
    ]),
  );
});
