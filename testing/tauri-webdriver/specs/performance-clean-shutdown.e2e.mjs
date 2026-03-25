import assert from "node:assert/strict";
import {
  assertNoSevereBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

describe("Chaemera Tauri performance monitor", () => {
  it("does not show the force-close dialog after a clean shutdown", async () => {
    await waitForDesktopShell();

    await browser.pause(1_000);

    const source = await browser.getPageSource();
    assert.equal(
      source.includes("Force Close Detected"),
      false,
      "Did not expect the force-close dialog after a clean shutdown.",
    );

    await assertNoSevereBrowserLogs();
  });
});
