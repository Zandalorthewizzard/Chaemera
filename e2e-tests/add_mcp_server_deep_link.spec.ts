import { expect } from "@playwright/test";
import { test } from "./helpers/test_helper";

test("add mcp server via deep link with base64-encoded config", async ({
  po,
  electronApp,
}) => {
  await po.setUp();
  await po.navigation.goToSettingsTab();
  await po.page.getByRole("button", { name: "Tools (MCP)" }).click();

  const payload = {
    name: "Deep Link MCP Server",
    config: {
      type: "stdio",
      command: "node /tmp/fake-server.mjs --trace",
    },
  };
  const base64Config = Buffer.from(JSON.stringify(payload.config)).toString(
    "base64",
  );
  const deepLinkUrl = `dyad://add-mcp-server?name=${encodeURIComponent(payload.name)}&config=${encodeURIComponent(base64Config)}`;

  await electronApp.evaluate(({ app }, url) => {
    app.emit("open-url", { preventDefault: () => {} }, url);
  }, deepLinkUrl);

  await expect(
    po.page.getByRole("textbox", { name: "My MCP Server" }),
  ).toHaveValue(payload.name);
  await expect(po.page.getByTestId("mcp-transport-select")).toHaveValue(
    "stdio",
  );
  await expect(po.page.getByRole("textbox", { name: "node" })).toHaveValue(
    "node",
  );
  await expect(
    po.page.getByRole("textbox", { name: "path/to/mcp-server.js --flag" }),
  ).toHaveValue("/tmp/fake-server.mjs --trace");
});
