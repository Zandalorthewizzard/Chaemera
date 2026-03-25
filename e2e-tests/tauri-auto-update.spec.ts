import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";
import { expectTauriHarnessSettings } from "./helpers/tauri_harness_state";

test("tauri auto-update toggles through the browser-backed harness", async ({
  po,
}) => {
  await po.navigation.goToSettingsTab();

  await expectTauriHarnessSettings(po.page, {
    enableAutoUpdate: true,
  });

  await po.settings.toggleAutoUpdate();
  await expect(
    po.page.getByRole("button", { name: "Restart Dyad" }),
  ).toBeVisible();
  await expectTauriHarnessSettings(po.page, {
    enableAutoUpdate: false,
  });

  await po.settings.toggleAutoUpdate();
  await expectTauriHarnessSettings(po.page, {
    enableAutoUpdate: true,
  });
});
