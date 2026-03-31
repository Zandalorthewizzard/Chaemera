import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoSevereBrowserLogs,
  invokeCoreCommand,
  waitForDesktopShell,
} from "../test_helpers.mjs";

const AI_RULES_PROMPT =
  "Generate an AI_RULES.md file for this app. Describe the tech stack in 5-10 bullet points and describe clear rules about what libraries to use for what.";

function logStep(step) {
  console.log(`[tauri-runtime][import-ai-rules] ${step}`);
}

const IMPORTED_APP_NAME = "minimal-imported-app";
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

describe("Chaemera Tauri import flow", () => {
  it("imports an app with existing AI rules without triggering the auto-rules prompt", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("importing fixture through the Tauri core bridge");
    const importResult = await invokeCoreCommand("import-app", {
      path: IMPORT_FIXTURE_PATH,
      appName: IMPORTED_APP_NAME,
    });

    logStep("navigating to imported app details route");
    await browser.execute((appId) => {
      window.location.assign(`/app-details?appId=${appId}`);
    }, importResult.appId);

    logStep("waiting for imported app details route");
    await browser.waitUntil(
      async () => {
        const url = await browser.getUrl();
        return url.includes("/app-details") && url.includes("appId=");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected import flow to navigate to the imported app details route.",
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
        return text.includes(IMPORTED_APP_NAME);
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the imported app to become the selected app in the desktop shell.",
      },
    );

    logStep("verifying imported files exist in the isolated Tauri profile");
    const appsDir = process.env.CHAEMERA_TAURI_APPS_DIR;
    assert.ok(
      appsDir,
      "Expected CHAEMERA_TAURI_APPS_DIR to be available in the runtime test process.",
    );

    const importedAppDir = path.join(appsDir, IMPORTED_APP_NAME);
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
          "Expected the imported app files to be copied into the isolated app-roots directory.",
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
