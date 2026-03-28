import type { Page } from "@playwright/test";
import { expect, test } from "./helpers/tauri_smoke_fixtures";

type TauriSmokeHarnessState = {
  settings: Record<string, unknown>;
  externalUrls: string[];
  invocations: Array<{ channel: string; payload: unknown }>;
  nextSelectedAppFolder: {
    path: string | null;
    name: string | null;
    hasAiRules: boolean;
  } | null;
  nextSelectedAppLocation: {
    path: string | null;
    canceled: boolean;
  } | null;
};

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

async function getHarnessState(page: Page): Promise<TauriSmokeHarnessState> {
  const state = await page.evaluate(() =>
    window.__CHAEMERA_TAURI_SMOKE__?.getState(),
  );

  if (!state) {
    throw new Error("Tauri smoke harness state is unavailable.");
  }

  return state;
}

async function setNextSelectedAppFolder(
  page: Page,
  selection: {
    path: string;
    name?: string;
    hasAiRules?: boolean;
  },
) {
  await page.evaluate((nextSelection) => {
    window.__CHAEMERA_TAURI_SMOKE__?.setNextSelectedAppFolder(nextSelection);
  }, selection);
}

async function setNextSelectedAppLocation(
  page: Page,
  selection: {
    path: string;
    canceled?: boolean;
  },
) {
  await page.evaluate((nextSelection) => {
    window.__CHAEMERA_TAURI_SMOKE__?.setNextSelectedAppLocation(nextSelection);
  }, selection);
}

async function emitHarnessEvent(
  page: Page,
  channel: string,
  payload: unknown,
): Promise<void> {
  await page.evaluate(
    ({ eventChannel, eventPayload }) => {
      window.__CHAEMERA_TAURI_SMOKE__?.emit(eventChannel, eventPayload);
    },
    {
      eventChannel: channel,
      eventPayload: payload,
    },
  );
}

async function findAppByName(
  page: Page,
  name: string,
): Promise<{
  id: number;
  name: string;
  path: string;
  resolvedPath: string;
}> {
  const result = await invokeViaTauriBridge<{
    apps: Array<{
      id: number;
      name: string;
      path: string;
      resolvedPath: string;
    }>;
  }>(page, "list-apps");
  const app = result.apps.find((candidate) => candidate.name === name);
  if (!app) {
    throw new Error(`App "${name}" not found in Tauri regression harness.`);
  }
  return app;
}

test("tauri regression harness exercises core app and chat bridge flows", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

  const createdApp = await invokeViaTauriBridge<{
    app: {
      id: number;
      name: string;
      resolvedPath: string;
      files: string[];
    };
    chatId: number;
  }>(page, "create-app", {
    name: "Tauri Regression App",
  });

  expect(createdApp).toEqual(
    expect.objectContaining({
      app: expect.objectContaining({
        id: expect.any(Number),
        name: "Tauri Regression App",
        resolvedPath: expect.stringContaining("Tauri Regression App"),
      }),
      chatId: expect.any(Number),
    }),
  );
  expect(createdApp.app.files).toContain("package.json");

  const reopenedApp = await invokeViaTauriBridge<{
    id: number;
    name: string;
  }>(page, "get-app", createdApp.app.id);
  expect(reopenedApp).toEqual(
    expect.objectContaining({
      id: createdApp.app.id,
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
        id: createdApp.app.id,
        name: "Tauri Regression App",
      }),
    ]),
  );

  const chatId = await invokeViaTauriBridge<number>(
    page,
    "create-chat",
    createdApp.app.id,
  );
  expect(chatId).toEqual(expect.any(Number));

  const chats = await invokeViaTauriBridge<
    Array<{
      id: number;
      appId: number;
      title: string | null;
    }>
  >(page, "get-chats", createdApp.app.id);
  expect(chats).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: chatId,
        appId: createdApp.app.id,
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
    url: "https://example.invalid/integrations/supabase/login",
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
});

test("tauri regression harness covers renderer deep-link flows without electron main-process events", async ({
  page,
}) => {
  const promptPayload = {
    type: "add-prompt",
    payload: {
      title: "Deep Link Test Prompt",
      description: "A prompt created via deep link",
      content: "You are a helpful assistant. Please help with:\n\n[task here]",
    },
  };
  const mcpPayload = {
    type: "add-mcp-server",
    payload: {
      name: "Deep Link MCP Server",
      config: {
        type: "stdio",
        command: "node /tmp/fake-server.mjs --trace",
      },
    },
  };

  await page.goto("/library");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  const promptCards = page.getByTestId("prompt-card");
  const initialPromptCount = await promptCards.count();

  await emitHarnessEvent(page, "deep-link-received", promptPayload);

  await expect(
    page.getByRole("dialog").getByText("Create New Prompt"),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
    promptPayload.payload.title,
  );
  await expect(
    page.getByRole("textbox", { name: "Description (optional)" }),
  ).toHaveValue(promptPayload.payload.description);
  await expect(page.getByRole("textbox", { name: "Content" })).toHaveValue(
    promptPayload.payload.content,
  );

  await page.getByRole("button", { name: "Save" }).click();
  await expect(promptCards).toHaveCount(initialPromptCount + 1);
  const createdPromptCard = promptCards.filter({
    hasText: promptPayload.payload.title,
  });
  await expect(createdPromptCard).toHaveCount(1);
  await expect(createdPromptCard).toContainText(promptPayload.payload.title);
  await expect(createdPromptCard).toContainText(
    promptPayload.payload.description,
  );

  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await page.getByRole("button", { name: "Tools (MCP)" }).click();

  await emitHarnessEvent(page, "deep-link-received", mcpPayload);

  await expect(
    page.getByRole("textbox", { name: "My MCP Server" }),
  ).toHaveValue(mcpPayload.payload.name);
  await expect(page.getByTestId("mcp-transport-select")).toHaveValue("stdio");
  await expect(page.getByRole("textbox", { name: "node" })).toHaveValue("node");
  await expect(
    page.getByRole("textbox", { name: "path/to/mcp-server.js --flag" }),
  ).toHaveValue("/tmp/fake-server.mjs --trace");
});

test("tauri regression harness covers import and app storage dialogs without electron helpers", async ({
  page,
}) => {
  const copiedImportPath = "C:/Fixtures/import-app/minimal-with-ai-rules";
  const copiedAppName = "tauri-imported-copy";
  const inPlaceImportPath =
    "C:/Fixtures/import-app/minimal-in-place-with-ai-rules";
  const inPlaceAppName = "tauri-imported-in-place";
  const movedBasePath = "C:/Apps/relocated";

  await page.goto("/");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import App" })).toBeVisible();

  await setNextSelectedAppFolder(page, {
    path: copiedImportPath,
    name: "minimal-with-ai-rules",
    hasAiRules: true,
  });

  await page.getByRole("button", { name: "Import App" }).click();
  await page.getByRole("button", { name: "Select Folder" }).click();
  const copyNameInput = page.getByRole("textbox", {
    name: "Enter new app name",
  });
  await expect(copyNameInput).toHaveValue("minimal-with-ai-rules");
  await copyNameInput.fill(copiedAppName);
  await page.getByRole("button", { name: "Import" }).click();
  await page.waitForURL((url) => url.pathname === "/chat");

  const copiedApp = await findAppByName(page, copiedAppName);
  expect(copiedApp).toEqual(
    expect.objectContaining({
      name: copiedAppName,
      path: copiedAppName,
      resolvedPath: `C:/Apps/${copiedAppName}`,
    }),
  );

  await page.getByRole("link", { name: "Apps" }).click();
  await expect(page.getByRole("button", { name: "Import App" })).toBeVisible();

  await setNextSelectedAppFolder(page, {
    path: inPlaceImportPath,
    name: "minimal-in-place-with-ai-rules",
    hasAiRules: true,
  });

  await page.getByRole("button", { name: "Import App" }).click();
  await page.getByRole("button", { name: "Select Folder" }).click();
  await page.getByRole("checkbox", { name: /Copy to the/ }).uncheck();
  const inPlaceNameInput = page.getByRole("textbox", {
    name: "Enter new app name",
  });
  await inPlaceNameInput.fill(inPlaceAppName);
  await page.getByRole("button", { name: "Import" }).click();
  await page.waitForURL((url) => url.pathname === "/chat");

  const inPlaceApp = await findAppByName(page, inPlaceAppName);
  expect(inPlaceApp).toEqual(
    expect.objectContaining({
      name: inPlaceAppName,
      path: inPlaceImportPath,
      resolvedPath: inPlaceImportPath,
    }),
  );

  await setNextSelectedAppLocation(page, {
    path: movedBasePath,
    canceled: false,
  });

  await page.getByRole("link", { name: "Apps" }).click();
  await expect(
    page.getByTestId(`app-list-item-${copiedAppName}`),
  ).toBeVisible();
  await page.getByTestId(`app-list-item-${copiedAppName}`).click();
  await expect(page.getByTestId("app-details-page")).toBeVisible();
  await page.getByTestId("app-details-more-options-button").click();
  await page.getByRole("button", { name: "Move folder" }).click();

  const selectFolderButton = page
    .getByRole("dialog")
    .getByRole("button", { name: "Select Folder" });
  await expect(selectFolderButton).toBeVisible();
  await selectFolderButton.click();
  await expect(selectFolderButton).not.toBeVisible();

  const movedPath = `${movedBasePath}/${copiedAppName}`;
  const movedApp = await invokeViaTauriBridge<{
    id: number;
    path: string;
    resolvedPath: string;
  }>(page, "get-app", copiedApp.id);
  expect(movedApp).toEqual(
    expect.objectContaining({
      id: copiedApp.id,
      path: movedPath,
      resolvedPath: movedPath,
    }),
  );
  await expect(
    page
      .locator("span.text-sm.break-all")
      .filter({ hasText: movedPath })
      .first(),
  ).toBeVisible();

  const { invocations } = await getHarnessState(page);
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "select-app-folder" }),
      expect.objectContaining({ channel: "check-ai-rules" }),
      expect.objectContaining({ channel: "import-app" }),
      expect.objectContaining({ channel: "select-app-location" }),
      expect.objectContaining({ channel: "change-app-location" }),
      expect.objectContaining({ channel: "list-apps" }),
      expect.objectContaining({ channel: "get-app" }),
    ]),
  );
});

test("tauri regression harness covers import advanced options and missing AI rules feedback", async ({
  page,
}) => {
  const importPath = "C:/Fixtures/import-app/minimal";
  const defaultAppName = "tauri-import-default";
  const customCommandsAppName = "tauri-import-custom-commands";
  const missingAiRulesText =
    "No AI_RULES.md found. Dyad will automatically generate one after importing.";

  await page.goto("/");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();
  await expect(page.getByRole("button", { name: "Import App" })).toBeVisible();

  await setNextSelectedAppFolder(page, {
    path: importPath,
    name: "minimal",
    hasAiRules: false,
  });

  await page.getByRole("button", { name: "Import App" }).click();
  await page.getByRole("button", { name: "Select Folder" }).click();
  await expect(page.getByText(missingAiRulesText)).toBeVisible();

  const defaultImportNameInput = page.getByRole("textbox", {
    name: "Enter new app name",
  });
  await expect(defaultImportNameInput).toHaveValue("minimal");
  await defaultImportNameInput.fill(defaultAppName);

  await page.getByRole("button", { name: "Advanced options" }).click();
  await expect(page.getByPlaceholder("pnpm install")).toHaveValue("");
  await expect(page.getByPlaceholder("pnpm dev")).toHaveValue("");
  const importButton = page.getByRole("button", { name: "Import" });
  await expect(importButton).toBeEnabled();

  await importButton.click();
  await page.waitForURL((url) => url.pathname === "/chat");

  const defaultImportedApp = await findAppByName(page, defaultAppName);
  const defaultImportedAppDetails = await invokeViaTauriBridge<{
    id: number;
    installCommand: string | null;
    startCommand: string | null;
  }>(page, "get-app", defaultImportedApp.id);
  expect(defaultImportedAppDetails).toEqual(
    expect.objectContaining({
      id: defaultImportedApp.id,
      installCommand: null,
      startCommand: null,
    }),
  );

  await page.getByRole("link", { name: "Apps" }).click();
  await expect(page.getByRole("button", { name: "Import App" })).toBeVisible();

  await setNextSelectedAppFolder(page, {
    path: importPath,
    name: "minimal",
    hasAiRules: false,
  });

  await page.getByRole("button", { name: "Import App" }).click();
  await page.getByRole("button", { name: "Select Folder" }).click();
  await expect(page.getByText(missingAiRulesText)).toBeVisible();

  const customImportNameInput = page.getByRole("textbox", {
    name: "Enter new app name",
  });
  await customImportNameInput.fill(customCommandsAppName);

  await page.getByRole("button", { name: "Advanced options" }).click();
  const installCommandInput = page.getByPlaceholder("pnpm install");
  const startCommandInput = page.getByPlaceholder("pnpm dev");

  await installCommandInput.fill("");
  await startCommandInput.fill("npm start");
  await expect(importButton).toBeDisabled();
  await expect(
    page.getByText("Both commands are required when customizing."),
  ).toBeVisible();

  await installCommandInput.fill("npm i");
  await expect(importButton).toBeEnabled();
  await expect(
    page.getByText("Both commands are required when customizing."),
  ).toHaveCount(0);

  await importButton.click();
  await page.waitForURL((url) => url.pathname === "/chat");

  const customCommandsApp = await findAppByName(page, customCommandsAppName);
  const customCommandsAppDetails = await invokeViaTauriBridge<{
    id: number;
    installCommand: string | null;
    startCommand: string | null;
  }>(page, "get-app", customCommandsApp.id);
  expect(customCommandsAppDetails).toEqual(
    expect.objectContaining({
      id: customCommandsApp.id,
      installCommand: "npm i",
      startCommand: "npm start",
    }),
  );

  const { invocations } = await getHarnessState(page);
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "select-app-folder" }),
      expect.objectContaining({ channel: "check-ai-rules" }),
      expect.objectContaining({ channel: "import-app" }),
      expect.objectContaining({ channel: "get-app" }),
    ]),
  );
});

test("tauri regression harness covers GitHub auth events and repository lifecycle", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

  const createdApp = await invokeViaTauriBridge<{
    app: {
      id: number;
      name: string;
      githubOrg: string | null;
      githubRepo: string | null;
      githubBranch: string | null;
    };
    chatId: number;
  }>(page, "create-app", {
    name: "GitHub Regression App",
  });

  const githubFlow = await page.evaluate(async () => {
    const bridge = window.__CHAEMERA_TAURI_CORE__;
    if (!bridge?.on) {
      throw new Error("Tauri event bridge is unavailable.");
    }

    const subscribe = bridge.on;

    return new Promise<{
      updates: unknown[];
      success: unknown | null;
    }>((resolve) => {
      const updates: unknown[] = [];
      const cleanups: Array<() => void> = [];

      const finish = (success: unknown | null) => {
        for (const cleanup of cleanups) {
          cleanup();
        }
        resolve({ updates, success });
      };

      cleanups.push(
        subscribe("github:flow-update", (payload) => {
          updates.push(payload);
        }) ?? (() => {}),
      );
      cleanups.push(
        subscribe("github:flow-success", (payload) => {
          finish(payload);
        }) ?? (() => {}),
      );

      window.setTimeout(() => finish(null), 500);
      void bridge.invoke("github:start-flow", undefined);
    });
  });

  expect(githubFlow.updates).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "Requesting device code from GitHub...",
      }),
      expect.objectContaining({
        userCode: "CHAEMERA-CODE",
        verificationUri: "https://github.com/login/device",
      }),
    ]),
  );
  expect(githubFlow.success).toEqual({
    message: "Successfully connected!",
  });

  const stateAfterAuth = await getHarnessState(page);
  expect(stateAfterAuth.settings).toEqual(
    expect.objectContaining({
      githubAccessToken: { value: "tauri-smoke-github-token" },
      githubUser: { email: "tauri-smoke@example.com" },
    }),
  );

  await invokeViaTauriBridge(page, "github:create-repo", {
    appId: createdApp.app.id,
    org: "chaemera",
    repo: "github-regression-app",
    branch: "main",
  });

  const appWithRepo = await invokeViaTauriBridge<{
    id: number;
    githubOrg: string | null;
    githubRepo: string | null;
    githubBranch: string | null;
  }>(page, "get-app", createdApp.app.id);
  expect(appWithRepo).toEqual(
    expect.objectContaining({
      id: createdApp.app.id,
      githubOrg: "chaemera",
      githubRepo: "github-regression-app",
      githubBranch: "main",
    }),
  );

  const repoBranches = await invokeViaTauriBridge<
    Array<{
      name: string;
      commit: { sha: string };
    }>
  >(page, "github:get-repo-branches", {
    repo: "github-regression-app",
  });
  expect(repoBranches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "main",
        commit: { sha: "github-regression-app-main-sha" },
      }),
      expect.objectContaining({
        name: "feature/tauri",
        commit: { sha: "github-regression-app-feature-sha" },
      }),
    ]),
  );

  const localBranches = await invokeViaTauriBridge<{
    branches: string[];
    current: string;
  }>(page, "github:list-local-branches", {
    appId: createdApp.app.id,
  });
  expect(localBranches).toEqual({
    branches: ["main", "feature/tauri"],
    current: "main",
  });

  const remoteBranches = await invokeViaTauriBridge<string[]>(
    page,
    "github:list-remote-branches",
    {
      remote: "origin",
    },
  );
  expect(remoteBranches).toEqual(["main", "feature/tauri"]);

  const gitState = await invokeViaTauriBridge<{
    mergeInProgress: boolean;
    rebaseInProgress: boolean;
  }>(page, "github:get-git-state");
  expect(gitState).toEqual({
    mergeInProgress: false,
    rebaseInProgress: false,
  });

  const collaboratorsBefore = await invokeViaTauriBridge<
    Array<{ login: string }>
  >(page, "github:list-collaborators", {
    appId: createdApp.app.id,
  });
  expect(collaboratorsBefore).toEqual([]);

  await invokeViaTauriBridge(page, "github:invite-collaborator", {
    appId: createdApp.app.id,
    username: "octo-smoke",
  });

  const collaboratorsAfterInvite = await invokeViaTauriBridge<
    Array<{ login: string }>
  >(page, "github:list-collaborators", {
    appId: createdApp.app.id,
  });
  expect(collaboratorsAfterInvite).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        login: "octo-smoke",
      }),
    ]),
  );

  await invokeViaTauriBridge(page, "github:remove-collaborator", {
    appId: createdApp.app.id,
    username: "octo-smoke",
  });

  const collaboratorsAfterRemoval = await invokeViaTauriBridge<
    Array<{ login: string }>
  >(page, "github:list-collaborators", {
    appId: createdApp.app.id,
  });
  expect(collaboratorsAfterRemoval).toEqual([]);

  const { invocations } = await getHarnessState(page);
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "github:start-flow" }),
      expect.objectContaining({ channel: "github:create-repo" }),
      expect.objectContaining({ channel: "github:get-repo-branches" }),
      expect.objectContaining({ channel: "github:list-local-branches" }),
      expect.objectContaining({ channel: "github:list-remote-branches" }),
      expect.objectContaining({ channel: "github:get-git-state" }),
      expect.objectContaining({ channel: "github:list-collaborators" }),
      expect.objectContaining({ channel: "github:invite-collaborator" }),
      expect.objectContaining({ channel: "github:remove-collaborator" }),
    ]),
  );
});

test("tauri regression harness covers deployment and database integrations", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.getByTestId("leptos-route-shell")).toBeVisible();

  const createdApp = await invokeViaTauriBridge<{
    app: {
      id: number;
      name: string;
    };
    chatId: number;
  }>(page, "create-app", {
    name: "Cloud Regression App",
  });

  await invokeViaTauriBridge(page, "github:connect-existing-repo", {
    appId: createdApp.app.id,
    owner: "chaemera",
    repo: "cloud-regression-app",
    branch: "main",
  });

  const vercelProjects = await invokeViaTauriBridge<
    Array<{
      id: string;
      name: string;
    }>
  >(page, "vercel:list-projects");
  expect(vercelProjects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "prj_smoke_existing",
      }),
    ]),
  );

  await invokeViaTauriBridge(page, "vercel:create-project", {
    appId: createdApp.app.id,
    name: "cloud-regression-app",
  });

  const deployments = await invokeViaTauriBridge<
    Array<{
      uid: string;
      state: string;
      target: string;
      readyState: string;
    }>
  >(page, "vercel:get-deployments", {
    appId: createdApp.app.id,
  });
  expect(deployments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        uid: "dpl_smoke_ready",
        state: "READY",
        target: "production",
        readyState: "READY",
      }),
      expect.objectContaining({
        uid: "dpl_smoke_building",
        state: "BUILDING",
        target: "preview",
        readyState: "BUILDING",
      }),
    ]),
  );

  const supabaseOrganizations = await invokeViaTauriBridge<
    Array<{
      organizationSlug: string;
      name?: string;
    }>
  >(page, "supabase:list-organizations");
  expect(supabaseOrganizations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        organizationSlug: "fake-org-id",
        name: "Fake Organization",
      }),
    ]),
  );

  const supabaseProjects = await invokeViaTauriBridge<
    Array<{
      id: string;
      name: string;
      organizationSlug: string;
    }>
  >(page, "supabase:list-all-projects");
  expect(supabaseProjects).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "fake-project-id",
        name: "Fake Supabase Project",
        organizationSlug: "fake-org-id",
      }),
    ]),
  );

  const supabaseBranches = await invokeViaTauriBridge<
    Array<{
      id: string;
      name: string;
      isDefault: boolean;
    }>
  >(page, "supabase:list-branches", {
    projectId: "fake-project-id",
  });
  expect(supabaseBranches).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "default-branch-id",
        name: "Default Branch",
        isDefault: true,
      }),
      expect.objectContaining({
        id: "test-branch-id",
        name: "Test Branch",
        isDefault: false,
      }),
    ]),
  );

  await invokeViaTauriBridge(page, "supabase:fake-connect-and-set-project", {
    appId: createdApp.app.id,
    fakeProjectId: "fake-project-id",
  });

  const neonProject = await invokeViaTauriBridge<{
    id: string;
    name: string;
    branchId: string;
  }>(page, "neon:create-project", {
    appId: createdApp.app.id,
    name: "Cloud Regression Neon",
  });
  expect(neonProject).toEqual(
    expect.objectContaining({
      id: `test-neon-project-${createdApp.app.id}`,
      name: "Cloud Regression Neon",
      branchId: `test-neon-branch-${createdApp.app.id}`,
    }),
  );

  const neonProjectDetails = await invokeViaTauriBridge<{
    projectId: string;
    projectName: string;
    branches: Array<{
      type: string;
      branchId: string;
      branchName: string;
    }>;
  }>(page, "neon:get-project", {
    appId: createdApp.app.id,
  });
  expect(neonProjectDetails).toEqual(
    expect.objectContaining({
      projectId: `test-neon-project-${createdApp.app.id}`,
      projectName: "Cloud Regression Neon",
      branches: expect.arrayContaining([
        expect.objectContaining({
          type: "production",
          branchId: `test-neon-branch-${createdApp.app.id}`,
          branchName: "main",
        }),
        expect.objectContaining({
          type: "preview",
          branchId: `test-neon-preview-${createdApp.app.id}`,
          branchName: "preview",
        }),
      ]),
    }),
  );

  const connectedApp = await invokeViaTauriBridge<{
    id: number;
    githubRepo: string | null;
    vercelProjectId: string | null;
    vercelProjectName: string | null;
    vercelTeamSlug: string | null;
    supabaseProjectId: string | null;
    supabaseOrganizationSlug: string | null;
    supabaseProjectName: string | null;
    neonProjectId: string | null;
    neonDevelopmentBranchId: string | null;
    neonPreviewBranchId: string | null;
  }>(page, "get-app", createdApp.app.id);
  expect(connectedApp).toEqual(
    expect.objectContaining({
      id: createdApp.app.id,
      githubRepo: "cloud-regression-app",
      vercelProjectId: "prj_cloud-regression-app",
      vercelProjectName: "cloud-regression-app",
      vercelTeamSlug: "tauri-smoke-team",
      supabaseProjectId: "fake-project-id",
      supabaseOrganizationSlug: "fake-org-id",
      supabaseProjectName: "Fake Supabase Project",
      neonProjectId: `test-neon-project-${createdApp.app.id}`,
      neonDevelopmentBranchId: `test-neon-branch-${createdApp.app.id}`,
      neonPreviewBranchId: `test-neon-preview-${createdApp.app.id}`,
    }),
  );

  const { invocations } = await getHarnessState(page);
  expect(invocations).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "github:connect-existing-repo" }),
      expect.objectContaining({ channel: "vercel:list-projects" }),
      expect.objectContaining({ channel: "vercel:create-project" }),
      expect.objectContaining({ channel: "vercel:get-deployments" }),
      expect.objectContaining({ channel: "supabase:list-organizations" }),
      expect.objectContaining({ channel: "supabase:list-all-projects" }),
      expect.objectContaining({ channel: "supabase:list-branches" }),
      expect.objectContaining({
        channel: "supabase:fake-connect-and-set-project",
      }),
      expect.objectContaining({ channel: "neon:create-project" }),
      expect.objectContaining({ channel: "neon:get-project" }),
      expect.objectContaining({ channel: "get-app" }),
    ]),
  );
});
