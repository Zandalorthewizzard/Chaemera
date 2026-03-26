import assert from "node:assert/strict";
import {
  assertNoSevereBrowserLogs,
  invokeCoreCommand,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const IMPORTED_APP_NAME = "free-agent-quota-app";

function logStep(step) {
  console.log(`[tauri-runtime][free-agent-quota] ${step}`);
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

async function waitForChatRoute(timeout = 120_000) {
  await browser.waitUntil(
    async () => {
      const url = await browser.getUrl();
      return url.includes("/chat") && url.includes("id=");
    },
    {
      timeout,
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

async function getChatIdFromUrl() {
  const url = new URL(await browser.getUrl());
  const chatId = Number(url.searchParams.get("id"));

  assert.ok(
    Number.isInteger(chatId) && chatId > 0,
    `Expected a numeric chat id in the chat route URL, got "${url.toString()}".`,
  );

  return chatId;
}

async function seedFreeAgentQuotaUsage(chatId, messageCount) {
  await invokeCoreCommand("test:seedFreeAgentQuotaUsage", {
    chatId,
    messageCount,
  });
}

async function assertQuotaUiHidden() {
  const quotaBanner = await $('[data-testid="free-agent-quota-banner"]');
  assert.equal(await quotaBanner.isExisting(), false);
  assert.equal(
    await $(
      '//button[normalize-space()="Switch back to Build mode"]',
    ).isExisting(),
    false,
  );
}

describe("Chaemera Tauri free agent quota", () => {
  it("keeps the quota foundation dormant while hiding the freemium UI", async function () {
    this.timeout(420_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("forcing a non-Pro settings profile via the runtime bridge");
    const updatedSettings = await invokeCoreCommand("set-user-settings", {
      enableDyadPro: false,
      hasRunBefore: true,
      isTestMode: true,
      selectedChatMode: "local-agent",
    });
    assert.equal(updatedSettings.enableDyadPro, false);
    assert.equal(updatedSettings.selectedChatMode, "local-agent");

    logStep("reloading the shell so the updated settings take effect");
    await browser.refresh();
    await waitForDesktopShell();

    logStep("opening import dialog");
    await clickButton("Import App");
    logStep("selecting fixture folder");
    await clickButton("Select Folder");

    const appNameInput = await $('//input[@placeholder="Enter new app name"]');
    await appNameInput.waitForDisplayed({ timeout: 60_000 });
    await appNameInput.setValue(IMPORTED_APP_NAME);

    logStep("submitting import");
    await clickButton("Import", 120_000);

    logStep("waiting for chat route after import");
    await waitForChatRoute();
    await waitForImportedAppSelection();

    const chatId = await getChatIdFromUrl();

    const modeSelector = await $('[data-testid="chat-mode-selector"]');
    await modeSelector.waitForDisplayed({ timeout: 60_000 });
    const selectorText = await modeSelector.getText();
    assert.equal(selectorText.includes("Basic Agent"), false);
    assert.equal(selectorText.includes("5/5 remaining"), false);

    const runtimeSettings = await invokeCoreCommand("get-user-settings");
    assert.equal(
      runtimeSettings.selectedChatMode,
      "local-agent",
      "Expected the runtime settings to persist the Agent mode selection.",
    );

    await assertQuotaUiHidden();

    logStep(
      "seeding 5 quota messages through the test bridge to exercise the dormant quota foundation",
    );
    await seedFreeAgentQuotaUsage(chatId, 5);

    const quotaStatus = await invokeCoreCommand("free-agent-quota:get-status");
    assert.equal(quotaStatus.messagesUsed, 5);
    assert.equal(quotaStatus.isQuotaExceeded, true);
    logStep(
      "confirmed dormant quota state can still be observed via the bridge",
    );
    await assertQuotaUiHidden();

    logStep("simulating 25 hours elapsed");
    await invokeCoreCommand("test:simulateQuotaTimeElapsed", { hoursAgo: 25 });
    logStep("simulated quota time elapsed");

    const resetStatus = await invokeCoreCommand("free-agent-quota:get-status");
    assert.equal(resetStatus.messagesUsed, 0);
    assert.equal(resetStatus.isQuotaExceeded, false);
    logStep("confirmed dormant quota state resets back to zero");
    await assertQuotaUiHidden();

    await assertNoSevereBrowserLogs();
  });
});
