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
  console.log(`[tauri-runtime][home-chat-runtime] ${step}`);
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

async function submitHomePrompt(prompt) {
  const chatInput = await $(
    '[data-testid="home-chat-input-container"] [data-lexical-editor="true"]',
  );
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

async function waitForChatRoute() {
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes("/chat") && url.includes("id=");
    },
    {
      timeout: 120_000,
      interval: 250,
      timeoutMsg: "Expected the home submit flow to navigate to a chat route.",
    },
  );
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

describe("Chaemera Tauri home chat runtime", () => {
  it("creates a new app and streams a chat response from the home composer", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("configuring custom test model");
    await configureTestingModel();
    await assertConfiguredTestingModel();

    logStep("typing a canned prompt into the home composer");
    await submitHomePrompt("[dyad-qa=write]");

    logStep("waiting for the home submit flow to reach a chat route");
    await waitForChatRoute();

    const appNameButton = await $('[data-testid="title-bar-app-name-button"]');
    await browser.waitUntil(
      async () =>
        !(await appNameButton.getText()).includes("(no app selected)"),
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the home submit flow to select a real app in the title bar.",
      },
    );

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
