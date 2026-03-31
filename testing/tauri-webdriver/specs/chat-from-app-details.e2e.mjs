import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  assertNoSevereBrowserLogs,
  invokeCoreCommand,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const CUSTOM_PROVIDER_ID = "custom::testing";
const CUSTOM_PROVIDER_BASE_URL = `http://127.0.0.1:${
  process.env.FAKE_LLM_PORT ?? "3500"
}/v1`;

function logStep(step) {
  console.log(`[tauri-runtime][chat-from-app-details] ${step}`);
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

async function configureTestingModel() {
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
    autoApproveChanges: true,
    telemetryConsent: "opted_out",
    hasRunBefore: true,
  });
}

async function assertConfiguredTestingModel() {
  const storedSettings = await invokeCoreCommand("get-user-settings");
  assert.deepEqual(storedSettings.selectedModel, {
    provider: CUSTOM_PROVIDER_ID,
    name: "test-model",
  });

  const models = await invokeCoreCommand("get-language-models", {
    providerId: CUSTOM_PROVIDER_ID,
  });
  assert.equal(
    models.some((model) => model.apiName === "test-model"),
    true,
    "Expected the custom testing model to be available through the Tauri bridge.",
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

async function waitForAssistantCopyButton() {
  const copyButton = await $('[data-testid="copy-message-button"]');
  await copyButton.waitForDisplayed({ timeout: 120_000 });
  return copyButton;
}

function readClipboardText() {
  return execFileSync(
    "powershell",
    ["-NoProfile", "-Command", "Get-Clipboard"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).replace(/\r\n/g, "\n");
}

async function waitForClipboardText() {
  await browser.waitUntil(async () => readClipboardText().trim().length > 0, {
    timeout: 30_000,
    interval: 250,
    timeoutMsg: "Expected the system clipboard to contain copied text.",
  });

  return readClipboardText();
}

describe("Chaemera Tauri chat runtime from app details", () => {
  it("opens an app-details route and streams a chat response in the real desktop app", async function () {
    this.timeout(300_000);
    const appName = `chat-runtime-audit-app-${Date.now()}`;

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("configuring custom test model");
    await configureTestingModel();

    logStep("creating app through the Tauri bridge");
    const createdApp = await invokeCoreCommand("create-app", {
      name: appName,
    });

    assert.equal(typeof createdApp.app.id, "number");
    assert.ok(createdApp.chatId);

    logStep("opening the created app-details route directly");
    await browser.url(
      `http://tauri.localhost/app-details?appId=${createdApp.app.id}`,
    );

    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        return url.includes("/app-details");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the sidebar app selection to navigate to app-details.",
      },
    );

    const appNameButton = await $('[data-testid="title-bar-app-name-button"]');
    await browser.waitUntil(
      async () => (await appNameButton.getText()).includes(appName),
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the app-details route to synchronize the selected app in the desktop shell.",
      },
    );

    logStep("opening imported app in chat");
    await clickButton("Open in Chat", 120_000);
    await waitForChatRoute();
    await assertConfiguredTestingModel();

    logStep("sending canned write prompt through the UI");
    await submitPrompt("[dyad-qa=write]");

    const copyButton = await waitForAssistantCopyButton();
    await copyButton.click();

    const clipboard = await waitForClipboardText();
    assert.ok(clipboard.length > 0, "Expected copied content to be non-empty.");
    assert.equal(
      clipboard.includes("### File:"),
      true,
      "Expected copied dyad-write content to be converted into markdown headings.",
    );
    assert.equal(
      clipboard.includes("```"),
      true,
      "Expected copied dyad-write content to contain fenced code blocks.",
    );
    assert.equal(
      clipboard.includes("<dyad-write"),
      false,
      "Expected copied dyad-write content to omit raw dyad-write tags.",
    );

    await assertNoSevereBrowserLogs();
  });
});
