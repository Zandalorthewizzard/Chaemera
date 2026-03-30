import { expect } from "@playwright/test";
import { testSkipIfWindows } from "./helpers/test_helper";

testSkipIfWindows(
  "thinking budget control is not shown in OSS setup",
  async ({ po }) => {
    await po.setUpOss();
    await po.navigation.goToSettingsTab();

    await expect(
      po.page.getByRole("combobox", { name: "Thinking Budget" }),
    ).toHaveCount(0);
  },
);
