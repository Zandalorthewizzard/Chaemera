import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getRuntimeAppsDir } from "../runtime_profile.mjs";
import {
  assertNoSevereBrowserLogs,
  invokeCoreCommand,
  waitForDesktopShell,
} from "../test_helpers.mjs";

function getProfileRoot() {
  const profileRoot = process.env.CHAEMERA_TAURI_PROFILE_ROOT;
  if (!profileRoot) {
    throw new Error(
      "CHAEMERA_TAURI_PROFILE_ROOT is not set for the runtime session.",
    );
  }
  return profileRoot;
}

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

describe("Chaemera Tauri app storage", () => {
  it("moves an app to a custom storage location", async () => {
    await waitForDesktopShell();

    const appName = "runtime-storage-app";
    const originalPath = path.join(getRuntimeAppsDir(), appName);
    const relocatedBasePath = path.join(getProfileRoot(), "alt-app-storage");
    const relocatedAppPath = path.join(relocatedBasePath, appName);

    const createdApp = await invokeCoreCommand("create-app", {
      name: appName,
    });
    assert.equal(createdApp.app.name, appName);
    assert.equal(createdApp.app.path, appName);
    assert.equal(createdApp.app.resolvedPath, normalizePath(originalPath));

    await browser.waitUntil(
      () => Promise.resolve(fs.existsSync(originalPath)),
      {
        timeout: 20_000,
        interval: 250,
        timeoutMsg: `Expected the created app folder to exist at ${originalPath}.`,
      },
    );
    assert.equal(fs.existsSync(path.join(originalPath, "package.json")), true);

    fs.mkdirSync(relocatedBasePath, { recursive: true });

    const movedApp = await invokeCoreCommand("change-app-location", {
      appId: createdApp.app.id,
      parentDirectory: relocatedBasePath,
    });
    assert.deepEqual(movedApp, {
      resolvedPath: normalizePath(relocatedAppPath),
    });

    await browser.waitUntil(
      () =>
        Promise.resolve(
          fs.existsSync(relocatedAppPath) && !fs.existsSync(originalPath),
        ),
      {
        timeout: 20_000,
        interval: 250,
        timeoutMsg: `Expected app files to move from ${originalPath} to ${relocatedAppPath}.`,
      },
    );

    const persistedApp = await invokeCoreCommand("get-app", createdApp.app.id);
    assert.equal(persistedApp.id, createdApp.app.id);
    assert.equal(persistedApp.path, normalizePath(relocatedAppPath));
    assert.equal(persistedApp.resolvedPath, normalizePath(relocatedAppPath));
    assert.equal(
      fs.existsSync(path.join(relocatedAppPath, "package.json")),
      true,
    );

    await assertNoSevereBrowserLogs();
  });
});
