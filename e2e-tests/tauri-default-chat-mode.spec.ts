import { expect } from "@playwright/test";
import { test } from "./helpers/tauri_test_helper";

test("tauri default chat mode - default setup uses build", async ({ po }) => {
  await po.setUp();

  await expect(
    po.chatActions
      .getHomeChatInputContainer()
      .getByTestId("chat-mode-selector"),
  ).toHaveText("Build");
});
