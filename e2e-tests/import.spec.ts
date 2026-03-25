import path from "path";
import { testSkipIfWindows } from "./helpers/test_helper";
import { stubElectronDialog } from "./helpers/electron_dialog_stub";

testSkipIfWindows("import app with AI rules", async ({ po }) => {
  await po.setUp();
  await po.page.getByRole("button", { name: "Import App" }).click();
  await stubElectronDialog(po.electronApp, "showOpenDialog", {
    filePaths: [
      path.join(__dirname, "fixtures", "import-app", "minimal-with-ai-rules"),
    ],
  });

  await po.page.getByRole("button", { name: "Select Folder" }).click();
  await po.page.getByRole("textbox", { name: "Enter new app name" }).click();
  await po.page
    .getByRole("textbox", { name: "Enter new app name" })
    .fill("minimal-imported-app");
  await po.page.getByRole("button", { name: "Import" }).click();

  await po.previewPanel.snapshotPreview();

  await po.sendPrompt("[dump]");

  await po.snapshotServerDump();
  await po.snapshotMessages({ replaceDumpPath: true });
});
