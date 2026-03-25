import assert from "node:assert/strict";
import {
  assertNoSevereBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

describe("Chaemera Tauri performance monitor", () => {
  it("shows the persisted force-close diagnostics", async () => {
    await waitForDesktopShell();

    await browser.waitUntil(
      async () =>
        (await browser.getPageSource()).includes("Force Close Detected"),
      {
        timeout: 60_000,
        interval: 250,
        timeoutMsg: "Expected the force-close dialog to appear.",
      },
    );

    const source = await browser.getPageSource();
    assert.match(source, /Force Close Detected/);
    assert.match(
      source,
      /The app was not closed properly the last time it was running/,
    );
    assert.match(source, /Last Known State:/);
    assert.match(source, /Process Metrics/);
    assert.match(source, /256 MB/);
    assert.match(source, /45\.5%/);
    assert.match(source, /System Metrics/);
    assert.match(source, /8192 \/ 16384 MB/);
    assert.match(source, /35\.2%/);

    const okButton = await $('//button[normalize-space()="OK"]');
    await okButton.waitForExist({ timeout: 10_000 });
    await okButton.click();

    await browser.waitUntil(
      async () =>
        !(await browser.getPageSource()).includes("Force Close Detected"),
      {
        timeout: 10_000,
        interval: 250,
        timeoutMsg:
          "Expected the force-close dialog to close after confirmation.",
      },
    );

    await assertNoSevereBrowserLogs();
  });
});
