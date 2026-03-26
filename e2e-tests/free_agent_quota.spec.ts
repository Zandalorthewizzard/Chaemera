import { expect } from "@playwright/test";
import { testSkipIfWindows, Timeout } from "./helpers/test_helper";

/**
 * Regression test for the disabled free-agent quota UI.
 *
 * Chaemera is BYOK-first, so Agent mode should not expose a free-tier quota
 * banner or quota counters in the active product surface.
 */
testSkipIfWindows(
  "agent mode stays available without free-tier quota UI",
  async ({ po }) => {
    await po.setUp({ autoApprove: true });
    await po.importApp("minimal");

    await po.page.getByTestId("chat-mode-selector").click();
    await expect(po.page.getByRole("option", { name: /Agent/ })).toBeVisible();
    await expect(
      po.page.getByRole("option", { name: /Basic Agent/ }),
    ).toHaveCount(0);
    await expect(
      po.page.getByRole("option", { name: /5\/5 remaining/ }),
    ).toHaveCount(0);
    await po.page.keyboard.press("Escape");

    await po.chatActions.selectChatMode("local-agent");
    await expect(po.page.getByTestId("chat-mode-selector")).toContainText(
      "Agent",
    );

    await po.sendPrompt("tc=local-agent/simple-response hello");
    await po.chatActions.waitForChatCompletion();

    await expect(
      po.page.getByTestId("free-agent-quota-banner"),
    ).not.toBeVisible({ timeout: Timeout.SHORT });
    await expect(po.page.getByTestId("chat-error-box")).not.toContainText(
      /FREE_AGENT_QUOTA_EXCEEDED|5 free Agent messages|free Agent mode today/,
    );
  },
);
