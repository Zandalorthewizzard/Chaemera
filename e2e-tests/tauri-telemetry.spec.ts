import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";
import { expectTauriHarnessSettings } from "./helpers/tauri_harness_state";

test("tauri telemetry accept persists opt-in", async ({ po }) => {
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "unset",
  });

  await expect(po.page.getByTestId("telemetry-accept-button")).toBeVisible();
  await po.settings.clickTelemetryAccept();
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "opted_in",
  });
  await expect(po.page.getByTestId("telemetry-accept-button")).toBeHidden();
});

test("tauri telemetry reject persists opt-out", async ({ po }) => {
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "unset",
  });

  await expect(po.page.getByTestId("telemetry-reject-button")).toBeVisible();
  await po.settings.clickTelemetryReject();
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "opted_out",
  });
  await expect(po.page.getByTestId("telemetry-reject-button")).toBeHidden();
});

test("tauri telemetry later only hides the banner locally", async ({ po }) => {
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "unset",
  });

  await expect(po.page.getByTestId("telemetry-later-button")).toBeVisible();
  await po.settings.clickTelemetryLater();
  await expectTauriHarnessSettings(po.page, {
    telemetryConsent: "unset",
  });
  await expect(po.page.getByTestId("telemetry-later-button")).toBeHidden();
});
