import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  invokeCoreCommand,
  readBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const IMPORTED_APP_NAME = "mcp-build-mode-app";
const CUSTOM_PROVIDER_ID = "custom::testing";
const CUSTOM_PROVIDER_BASE_URL = `http://127.0.0.1:${
  process.env.FAKE_LLM_PORT ?? "3500"
}/v1`;
const MCP_SERVER_NAME = "testing-mcp-server";
const IMPORT_FIXTURE_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "e2e-tests",
  "fixtures",
  "import-app",
  "minimal-with-ai-rules",
);
const STDIO_MCP_SERVER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "fake-stdio-mcp-server.mjs",
);

function logStep(step) {
  console.log(`[tauri-runtime][mcp-build-mode] ${step}`);
}

async function clickButton(label, timeout = 60_000) {
  let visibleButton = null;
  const escapedLabel = label.replaceAll('"', '\\"');

  await browser.waitUntil(
    async () => {
      const buttons = await $$(
        `//button[normalize-space()="${escapedLabel}" or @aria-label="${escapedLabel}"]`,
      );

      for (const button of buttons) {
        if ((await button.isDisplayed()) && (await button.isEnabled())) {
          visibleButton = button;
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      interval: 250,
      timeoutMsg: `Expected a visible enabled button labeled "${label}".`,
    },
  );

  await visibleButton.click();
}

async function waitForChatRoute() {
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes("/chat") && url.includes("id=");
    },
    {
      timeout: 120_000,
      interval: 250,
      timeoutMsg: "Expected the app to be on a chat route with a chat id.",
    },
  );
}

async function waitForImportedAppSelection() {
  const appNameButton = await $('[data-testid="title-bar-app-name-button"]');

  await browser.waitUntil(
    async () => {
      const text = await appNameButton.getText();
      return text.includes(IMPORTED_APP_NAME);
    },
    {
      timeout: 120_000,
      interval: 250,
      timeoutMsg: `Expected ${IMPORTED_APP_NAME} to become the selected app.`,
    },
  );
}

async function submitPrompt(prompt) {
  const chatInput = await $('[data-lexical-editor="true"]');
  await chatInput.waitForDisplayed({ timeout: 60_000 });
  await chatInput.click();

  await browser.keys(prompt);

  const sendButton = await $('//button[@aria-label="Send message"]');
  await browser.waitUntil(
    async () =>
      (await sendButton.isDisplayed()) && (await sendButton.isEnabled()),
    {
      timeout: 60_000,
      interval: 250,
      timeoutMsg:
        "Expected the send button to become enabled after typing a prompt.",
    },
  );

  await sendButton.click();
}

async function configureTestingModelAndBuildMode() {
  logStep("creating custom provider");
  await invokeCoreCommand("create-custom-language-model-provider", {
    id: "testing",
    name: "test-provider",
    apiBaseUrl: CUSTOM_PROVIDER_BASE_URL,
  });

  logStep("creating custom model");
  await invokeCoreCommand("create-custom-language-model", {
    apiName: "test-model",
    displayName: "test-model",
    providerId: CUSTOM_PROVIDER_ID,
  });

  logStep("persisting runtime test settings");
  await invokeCoreCommand("set-user-settings", {
    selectedModel: {
      provider: CUSTOM_PROVIDER_ID,
      name: "test-model",
    },
    providerSettings: {
      [CUSTOM_PROVIDER_ID]: {
        apiKey: {
          value: "fake-api-key",
        },
      },
    },
    selectedChatMode: "build",
    enableMcpServersForBuildMode: true,
    autoApproveChanges: true,
    telemetryConsent: "opted_out",
    hasRunBefore: true,
  });
}

async function assertConfiguredTestingModel() {
  const storedSettings = await invokeCoreCommand("get-user-settings");
  assert.deepEqual(
    storedSettings.selectedModel,
    {
      provider: CUSTOM_PROVIDER_ID,
      name: "test-model",
    },
    "Expected runtime settings to persist the selected custom testing model.",
  );
  assert.equal(
    storedSettings.selectedChatMode,
    "build",
    "Expected build mode to remain selected for MCP verification.",
  );
  assert.equal(
    storedSettings.enableMcpServersForBuildMode,
    true,
    "Expected build mode MCP toggle to be enabled.",
  );
}

async function createAndVerifyMcpServer() {
  logStep("creating MCP server through core bridge");
  const created = await invokeCoreCommand("mcp:create-server", {
    name: MCP_SERVER_NAME,
    transport: "stdio",
    command: process.execPath,
    args: [STDIO_MCP_SERVER_PATH],
    enabled: true,
  });

  const servers = await invokeCoreCommand("mcp:list-servers");
  assert.equal(
    servers.some(
      (server) => server.id === created.id && server.name === MCP_SERVER_NAME,
    ),
    true,
    "Expected the fake MCP server to persist through the Tauri bridge.",
  );

  return created;
}

async function waitForText(text, timeout = 120_000) {
  await browser.waitUntil(
    async () => {
      const bodyText = await browser.execute(() => document.body.innerText);
      return bodyText.includes(text);
    },
    {
      timeout,
      interval: 250,
      timeoutMsg: `Expected page text to include "${text}".`,
    },
  );
}

describe("Chaemera Tauri MCP build mode flow", () => {
  it("runs an MCP tool on the worker path after explicit consent", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("configuring custom test model and build mode settings");
    await configureTestingModelAndBuildMode();
    await assertConfiguredTestingModel();

    logStep("creating MCP server and verifying its tools");
    await createAndVerifyMcpServer();

    logStep("importing minimal fixture with AI rules through core bridge");
    const importResult = await invokeCoreCommand("import-app", {
      path: IMPORT_FIXTURE_PATH,
      appName: IMPORTED_APP_NAME,
    });

    logStep("navigating to imported app details workspace");
    await browser.execute((appId) => {
      window.location.assign(`/app-details?appId=${appId}`);
    }, importResult.appId);

    logStep("waiting for imported app details workspace");
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        return url.includes("/app-details");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the import flow to navigate to the app-details route.",
      },
    );
    await waitForImportedAppSelection();

    logStep("opening imported app in chat");
    await clickButton("Open in Chat", 120_000);
    await waitForChatRoute();

    logStep("sending MCP tool prompt through the UI");
    await submitPrompt(
      "Please use the calculator tool now. [call_tool=calculator_add]",
    );

    logStep("approving MCP consent toast");
    await waitForText("Tool wants to run", 120_000);
    await clickButton("Allow once", 120_000);

    logStep("waiting for MCP tool call and result to render");
    await waitForText("Tool Call", 120_000);
    await waitForText("Tool Result", 120_000);
    await waitForText(MCP_SERVER_NAME, 120_000);
    await waitForText("calculator_add", 120_000);

    const toolResultCard = await $(
      '//*[contains(@class, "cursor-pointer") and .//*[normalize-space()="Tool Result"]]',
    );
    await toolResultCard.click();
    await waitForText('"text": "3"', 120_000);

    const browserLogs = await readBrowserLogs();
    const unexpectedSevereLogs = browserLogs.filter(
      (entry) =>
        entry.level === "SEVERE" &&
        !/^http:\/\/tauri\.localhost\/assets\/index-[^ ]+\.js 736:121545\s*$/.test(
          entry.message,
        ),
    );
    assert.deepEqual(unexpectedSevereLogs, []);
  });
});
