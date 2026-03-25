import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertNoSevereBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const AI_RULES_PROMPT =
  "Generate an AI_RULES.md file for this app. Describe the tech stack in 5-10 bullet points and describe clear rules about what libraries to use for what.";

async function clickButton(label, timeout = 60_000) {
  const button = await $(`//button[normalize-space()="${label}"]`);
  await button.waitForClickable({ timeout });
  await button.click();
}

function logStep(step) {
  console.log(`[tauri-runtime][import-ai-rules] ${step}`);
}

describe("Chaemera Tauri import flow", () => {
  it("imports an app with existing AI rules without triggering the auto-rules prompt", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("opening import dialog");
    await clickButton("Import App");
    logStep("selecting fixture folder");
    await clickButton("Select Folder");

    const appNameInput = await $('//input[@placeholder="Enter new app name"]');
    await appNameInput.waitForDisplayed({ timeout: 60_000 });
    await appNameInput.setValue("minimal-imported-app");

    logStep("submitting import");
    await clickButton("Import", 120_000);

    logStep("waiting for chat route");
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        return url.includes("/chat");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg: "Expected import flow to navigate to the chat route.",
      },
    );

    logStep("waiting for import spinner to clear");
    await browser.waitUntil(
      async () => {
        const source = await browser.getPageSource();
        return !source.includes("Importing app");
      },
      {
        timeout: 180_000,
        interval: 250,
        timeoutMsg:
          "Expected the import flow to finish rendering the chat workspace.",
      },
    );

    logStep("verifying no AI_RULES autogeneration prompt");
    const source = await browser.getPageSource();
    assert.equal(
      source.includes(AI_RULES_PROMPT),
      false,
      "Did not expect the AI_RULES auto-generation prompt for imported apps that already include AI_RULES.md.",
    );

    logStep("verifying imported app selection in the desktop shell");
    const appNameButton = await $('[data-testid="title-bar-app-name-button"]');
    await browser.waitUntil(
      async () => {
        const text = await appNameButton.getText();
        return text.includes("minimal-imported-app");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the imported app to become the selected app in the desktop shell.",
      },
    );

    logStep("verifying imported files exist in the isolated Tauri profile");
    const dyadAppsDir = process.env.CHAEMERA_TAURI_DYAD_APPS_DIR;
    assert.ok(
      dyadAppsDir,
      "Expected CHAEMERA_TAURI_DYAD_APPS_DIR to be available in the runtime test process.",
    );

    const importedAppDir = path.join(dyadAppsDir, "minimal-imported-app");
    const importedAiRulesPath = path.join(importedAppDir, "AI_RULES.md");
    const importedAppEntryPath = path.join(importedAppDir, "src", "App.tsx");

    await browser.waitUntil(
      async () =>
        fs.existsSync(importedAiRulesPath) &&
        fs.existsSync(importedAppEntryPath),
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the imported app files to be copied into the isolated dyad-apps directory.",
      },
    );

    const aiRules = fs.readFileSync(importedAiRulesPath, "utf8");
    const appSource = fs.readFileSync(importedAppEntryPath, "utf8");
    assert.match(aiRules, /There's already AI rules/);
    assert.match(appSource, /Minimal imported app/);

    logStep("checking browser logs");
    await assertNoSevereBrowserLogs();
  });
});
