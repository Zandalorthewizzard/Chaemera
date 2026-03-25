import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";
import { expectTauriHarnessSettings } from "./helpers/tauri_harness_state";

test("tauri release channel toggles between beta and stable", async ({
  po,
}) => {
  await po.navigation.goToSettingsTab();

  await expectTauriHarnessSettings(po.page, {
    releaseChannel: "stable",
  });

  await po.settings.changeReleaseChannel("beta");
  await expect(
    po.page.getByRole("button", { name: "Restart Dyad" }),
  ).toBeVisible();
  await expectTauriHarnessSettings(po.page, {
    releaseChannel: "beta",
  });

  await po.settings.changeReleaseChannel("stable");
  await expect(
    po.page.getByRole("button", { name: "Download Stable" }),
  ).toBeVisible();
  await expectTauriHarnessSettings(po.page, {
    releaseChannel: "stable",
  });
});
