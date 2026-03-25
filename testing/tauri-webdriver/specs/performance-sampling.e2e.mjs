import assert from "node:assert/strict";
import { getUserSettingsPath, readUserSettings } from "../runtime_profile.mjs";
import {
  assertNoSevereBrowserLogs,
  waitForDesktopShell,
} from "../test_helpers.mjs";

async function waitForPerformanceSnapshot() {
  let snapshot;

  await browser.waitUntil(
    async () => {
      try {
        const settings = readUserSettings();
        snapshot = settings.lastKnownPerformance;

        return Boolean(
          snapshot &&
          snapshot.timestamp > 0 &&
          snapshot.memoryUsageMB > 0 &&
          snapshot.cpuUsagePercent !== undefined &&
          snapshot.cpuUsagePercent >= 0 &&
          snapshot.systemMemoryUsageMB > 0 &&
          snapshot.systemMemoryTotalMB > 0 &&
          snapshot.systemCpuPercent !== undefined &&
          snapshot.systemCpuPercent >= 0,
        );
      } catch {
        return false;
      }
    },
    {
      timeout: 10_000,
      interval: 250,
      timeoutMsg: `Expected a persisted performance snapshot in ${getUserSettingsPath()}.`,
    },
  );

  return snapshot;
}

describe("Chaemera Tauri performance monitor", () => {
  it("captures performance information during normal runtime operation", async () => {
    await waitForDesktopShell();

    const snapshot = await waitForPerformanceSnapshot();

    assert.equal(typeof snapshot.timestamp, "number");
    assert.ok(snapshot.memoryUsageMB > 0);
    assert.ok(snapshot.cpuUsagePercent >= 0);
    assert.ok(snapshot.systemMemoryUsageMB > 0);
    assert.ok(snapshot.systemMemoryTotalMB > 0);
    assert.ok(snapshot.systemCpuPercent >= 0);
    assert.ok(
      Date.now() - snapshot.timestamp < 60_000,
      "Expected the persisted performance snapshot to be recent.",
    );

    await assertNoSevereBrowserLogs();
  });
});
