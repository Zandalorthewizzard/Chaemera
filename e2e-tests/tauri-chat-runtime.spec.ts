import fs from "node:fs";
import path from "node:path";

import { expect, test } from "./helpers/tauri_test_helper";

test("tauri chat runtime streams a chat response and applies generated edits", async ({
  po,
}) => {
  await po.setNodeMock(true);
  await po.page.reload({ waitUntil: "domcontentloaded" });
  await po.setUp({ autoApprove: true });

  await po.appManagement.clickAppListItem({ appName: "smoke-app" });
  await expect(po.appManagement.getTitleBarAppNameButton()).toContainText(
    "smoke-app",
  );

  await expect(po.chatActions.getHomeChatInputContainer()).toBeVisible();
  await po.sendPrompt("tc=write-index");
  await po.chatActions.waitForChatCompletion();

  const appPath = await po.appManagement.getCurrentAppPath();
  const indexPath = path.join(appPath, "src", "pages", "Index.tsx");
  const indexContent = fs.readFileSync(indexPath, "utf8");

  expect(indexContent).toContain("Testing:write-index!");
  expect(indexContent).toContain("export default Index;");
});
