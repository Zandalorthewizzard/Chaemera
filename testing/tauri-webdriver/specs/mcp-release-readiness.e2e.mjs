import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getRuntimeAppsDir } from "../runtime_profile.mjs";
import {
  invokeCoreCommand,
  readBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const IMPORTED_APP_NAME = "mcp-release-readiness-app";
const CUSTOM_PROVIDER_ID = "custom::testing";
const CUSTOM_PROVIDER_BASE_URL = `http://127.0.0.1:${
  process.env.FAKE_LLM_PORT ?? "3500"
}/v1`;
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
  console.log(`[tauri-runtime][mcp-release-readiness] ${step}`);
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

  logStep("persisting release-readiness settings");
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

async function getAssistantCopyButtonCount() {
  const buttons = await $$('[data-testid="copy-message-button"]');
  let count = 0;
  for (const button of buttons) {
    if (await button.isDisplayed()) {
      count += 1;
    }
  }
  return count;
}

async function waitForAssistantTurn(previousCount) {
  await browser.waitUntil(
    async () => (await getAssistantCopyButtonCount()) > previousCount,
    {
      timeout: 120_000,
      interval: 250,
      timeoutMsg: "Expected a new assistant response to finish rendering.",
    },
  );
}

async function assertNoConsentToast() {
  const bodyText = await browser.execute(() => document.body.innerText);
  assert.equal(
    bodyText.includes("Tool wants to run"),
    false,
    "Expected normal chat flow to avoid MCP consent prompts.",
  );
}

async function assertNoChatError() {
  const errors = await $$('[data-testid="chat-error"]');
  for (const error of errors) {
    if (await error.isDisplayed()) {
      throw new Error("Expected chat flow to avoid visible chat errors.");
    }
  }
}

function assertKnownBrowserLogsOnly(logs) {
  const unexpectedSevereLogs = logs.filter(
    (entry) =>
      entry.level === "SEVERE" &&
      !/^http:\/\/tauri\.localhost\/assets\/index-[^ ]+\.js 736:121545\s*$/.test(
        entry.message,
      ),
  );
  assert.deepEqual(unexpectedSevereLogs, []);
}

describe("Chaemera Tauri MCP release readiness", () => {
  it("keeps base chat usable on a clean profile with absent, idle, and broken MCP config", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("verifying clean profile starts without MCP servers");
    const initialServers = await invokeCoreCommand("mcp:list-servers");
    assert.deepEqual(
      initialServers,
      [],
      "Expected a clean runtime profile to start without configured MCP servers.",
    );

    logStep("configuring custom test model and build mode settings");
    await configureTestingModelAndBuildMode();

    logStep("importing minimal fixture with AI rules through core bridge");
    const importResult = await invokeCoreCommand("import-app", {
      path: IMPORT_FIXTURE_PATH,
      appName: IMPORTED_APP_NAME,
    });
    const importedAppDir = path.join(getRuntimeAppsDir(), IMPORTED_APP_NAME);
    const baselineFilePath = path.join(importedAppDir, "baseline-no-mcp.txt");
    const idleConfigFilePath = path.join(importedAppDir, "idle-mcp-config.txt");
    const brokenConfigFilePath = path.join(
      importedAppDir,
      "broken-mcp-config.txt",
    );

    logStep("navigating to imported app details workspace");
    await browser.execute((appId) => {
      window.location.assign(`/app-details?appId=${appId}`);
    }, importResult.appId);

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

    logStep("verifying no-MCP baseline chat flow");
    let assistantTurns = await getAssistantCopyButtonCount();
    await submitPrompt(
      "Please make a tiny change. [dyad-qa=write:baseline-no-mcp]",
    );
    await waitForAssistantTurn(assistantTurns);
    await assertNoConsentToast();
    await assertNoChatError();
    assert.equal(
      fs.existsSync(baselineFilePath),
      true,
      "Expected the clean-profile no-MCP chat flow to complete a normal write.",
    );

    logStep("creating idle MCP server and verifying normal chat still works");
    await invokeCoreCommand("mcp:create-server", {
      name: "idle-testing-mcp-server",
      transport: "stdio",
      command: process.execPath,
      args: [STDIO_MCP_SERVER_PATH],
      enabled: true,
    });
    const idleServers = await invokeCoreCommand("mcp:list-servers");
    assert.equal(idleServers.length, 1);

    assistantTurns = await getAssistantCopyButtonCount();
    await submitPrompt(
      "Please make one more tiny change. [dyad-qa=write:idle-mcp-config]",
    );
    await waitForAssistantTurn(assistantTurns);
    await assertNoConsentToast();
    await assertNoChatError();
    assert.equal(fs.existsSync(idleConfigFilePath), true);

    logStep(
      "creating broken MCP server and verifying base chat degrades safely",
    );
    await invokeCoreCommand("mcp:create-server", {
      name: "broken-testing-mcp-server",
      transport: "stdio",
      command: process.execPath,
      args: [path.join(importedAppDir, "does-not-exist.mjs")],
      enabled: true,
    });
    const allServers = await invokeCoreCommand("mcp:list-servers");
    assert.equal(allServers.length, 2);

    assistantTurns = await getAssistantCopyButtonCount();
    await submitPrompt(
      "Please keep going with a normal change. [dyad-qa=write:broken-mcp-config]",
    );
    await waitForAssistantTurn(assistantTurns);
    await assertNoConsentToast();
    await assertNoChatError();
    assert.equal(fs.existsSync(brokenConfigFilePath), true);

    const browserLogs = await readBrowserLogs();
    assertKnownBrowserLogsOnly(browserLogs);
  });
});
