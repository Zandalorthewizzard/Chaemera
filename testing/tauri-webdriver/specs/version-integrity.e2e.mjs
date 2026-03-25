import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertNoSevereBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";
import { getRuntimeDyadAppsDir } from "../runtime_profile.mjs";

const IMPORTED_APP_NAME = "version-integrity-app";
const INITIAL_VERSION_MESSAGE = "Init Chaemera app";
const IGNORED_ENTRIES = new Set([
  ".git",
  "node_modules",
  "package-lock.json",
  "pnpm-lock.yaml",
]);

function logStep(step) {
  console.log(`[tauri-runtime][version-integrity] ${step}`);
}

function normalizeFileContent(content) {
  return content.replace(/\r\n/g, "\n");
}

function snapshotAppTree(rootDir) {
  const snapshot = {};

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (IGNORED_ENTRIES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path
        .relative(rootDir, absolutePath)
        .replace(/\\/g, "/");

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      snapshot[relativePath] = normalizeFileContent(
        fs.readFileSync(absolutePath, "utf8"),
      );
    }
  }

  walk(rootDir);
  return snapshot;
}

function commitAll(repoPath, message) {
  execFileSync("git", ["add", "--all"], {
    cwd: repoPath,
    stdio: "pipe",
  });

  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: repoPath,
    encoding: "utf8",
  }).trim();

  if (!status) {
    throw new Error(`Expected staged changes before commit "${message}".`);
  }

  execFileSync(
    "git",
    [
      "-c",
      "user.name=[chaemera]",
      "-c",
      "user.email=git@chaemera.local",
      "commit",
      "-m",
      message,
    ],
    {
      cwd: repoPath,
      stdio: "pipe",
    },
  );
}

function gitCommitCount(repoPath) {
  return Number.parseInt(
    execFileSync("git", ["rev-list", "--count", "HEAD"], {
      cwd: repoPath,
      encoding: "utf8",
    }).trim(),
    10,
  );
}

async function clickButton(label, timeout = 60_000) {
  let visibleButton = null;

  await browser.waitUntil(
    async () => {
      const buttons = await $$(`//button[normalize-space()="${label}"]`);

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

async function clickButtonContaining(labelFragment, timeout = 60_000) {
  let visibleButton = null;

  await browser.waitUntil(
    async () => {
      const buttons = await $$(
        `//button[contains(normalize-space(), "${labelFragment}")]`,
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
      timeoutMsg: `Expected a visible enabled button containing "${labelFragment}".`,
    },
  );

  await visibleButton.click();
}

describe("Chaemera Tauri version integrity", () => {
  it("restores imported app file history through checkout and revert", async function () {
    this.timeout(300_000);

    logStep("waiting for desktop shell");
    await waitForDesktopShell();

    logStep("importing version-integrity fixture");
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

    const appNameButton = await $('[data-testid="title-bar-app-name-button"]');
    logStep("waiting for imported app selection");
    await browser.waitUntil(
      async () => {
        const text = await appNameButton.getText();
        return text.includes(IMPORTED_APP_NAME);
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected the imported version-integrity app to become selected.",
      },
    );

    const importedAppDir = path.join(
      getRuntimeDyadAppsDir(),
      IMPORTED_APP_NAME,
    );
    const initialSnapshot = snapshotAppTree(importedAppDir);

    logStep("applying add/edit/delete commit");
    fs.rmSync(path.join(importedAppDir, "to-be-deleted.txt"));
    fs.writeFileSync(path.join(importedAppDir, "new-file.js"), "new-file\n");
    fs.writeFileSync(
      path.join(importedAppDir, "to-be-edited.txt"),
      "after-edit\n",
    );
    commitAll(importedAppDir, "version-integrity add/edit/delete");

    const secondSnapshot = snapshotAppTree(importedAppDir);
    assert.equal(secondSnapshot["to-be-deleted.txt"], undefined);
    assert.equal(secondSnapshot["new-file.js"], "new-file\n");
    assert.equal(secondSnapshot["to-be-edited.txt"], "after-edit\n");

    logStep("applying move-file commit");
    fs.mkdirSync(path.join(importedAppDir, "new-dir"), { recursive: true });
    fs.renameSync(
      path.join(importedAppDir, "dir", "c.txt"),
      path.join(importedAppDir, "new-dir", "d.txt"),
    );
    commitAll(importedAppDir, "version-integrity move-file");

    const thirdSnapshot = snapshotAppTree(importedAppDir);
    assert.equal(thirdSnapshot["dir/c.txt"], undefined);
    assert.equal(thirdSnapshot["new-dir/d.txt"], "dir/c.txt");
    assert.equal(gitCommitCount(importedAppDir), 3);

    logStep("opening version pane and refreshing version data");
    await clickButtonContaining("Version", 120_000);
    const versionHistoryTitle = await $(
      '//h2[normalize-space()="Version History"]',
    );
    await versionHistoryTitle.waitForDisplayed({ timeout: 60_000 });

    await browser.waitUntil(
      async () => {
        const text = await appNameButton.getText();
        return text.includes(IMPORTED_APP_NAME);
      },
      {
        timeout: 60_000,
        interval: 250,
        timeoutMsg:
          "Expected app selection to remain stable while opening version history.",
      },
    );

    const versionCountButton = await $(
      '//button[contains(normalize-space(), "Version")]',
    );
    await browser.waitUntil(
      async () => {
        const text = await versionCountButton.getText();
        return text.includes("Version 3");
      },
      {
        timeout: 60_000,
        interval: 250,
        timeoutMsg:
          "Expected version count to reflect the imported app plus two additional commits.",
      },
    );

    logStep("checking out the initial imported version");
    const initialVersionMessage = await $(
      `//p[contains(normalize-space(), "${INITIAL_VERSION_MESSAGE}")]`,
    );
    await initialVersionMessage.waitForDisplayed({ timeout: 60_000 });
    await initialVersionMessage.click();

    const restoreButton = await $(
      '//button[@aria-label="Restore to this version"]',
    );
    logStep(
      "waiting for restore button to become visible on the selected version",
    );
    await browser.waitUntil(async () => restoreButton.isDisplayed(), {
      timeout: 60_000,
      interval: 250,
      timeoutMsg:
        "Expected the selected initial version row to expose its restore button.",
    });

    logStep("waiting for checkout to restore the original file tree");
    await browser.waitUntil(
      async () =>
        JSON.stringify(snapshotAppTree(importedAppDir)) ===
        JSON.stringify(initialSnapshot),
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected checkout of the initial version to restore the original imported file tree.",
      },
    );

    logStep("restoring the initial version on main");
    await restoreButton.waitForClickable({ timeout: 60_000 });
    await restoreButton.click();
    await restoreButton.waitForDisplayed({ reverse: true, timeout: 120_000 });

    await browser.waitUntil(
      async () => {
        const text = await versionCountButton.getText();
        return text.includes("Version 4");
      },
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected restore to create a new version entry on top of the history.",
      },
    );

    await browser.waitUntil(
      async () =>
        JSON.stringify(snapshotAppTree(importedAppDir)) ===
        JSON.stringify(initialSnapshot),
      {
        timeout: 120_000,
        interval: 250,
        timeoutMsg:
          "Expected revert restore to preserve the original imported file tree.",
      },
    );

    assert.equal(gitCommitCount(importedAppDir), 4);

    logStep("checking browser logs");
    await assertNoSevereBrowserLogs();
  });
});
