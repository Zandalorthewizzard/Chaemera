import { test } from "./helpers/tauri_test_helper";

test("tauri page-object fixture deletes a custom provider without freezing", async ({
  po,
}) => {
  await po.setUp();
  await po.navigation.goToSettingsTab();
  await po.page.getByTestId("delete-custom-provider").click();
  await po.page.getByRole("button", { name: "Delete Provider" }).click();
  await po.navigation.goToAppsTab();
});
