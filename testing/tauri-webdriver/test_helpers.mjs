import assert from "node:assert/strict";

export async function switchToAppWindow() {
  let lastWindowReport = [];

  await browser.waitUntil(
    async () => {
      const handles = await browser.getWindowHandles();
      const windowReport = [];

      for (const handle of handles) {
        await browser.switchToWindow(handle);
        const title = await browser.getTitle();
        const url = await browser.getUrl();
        const source = await browser.getPageSource();

        windowReport.push({
          handle,
          title,
          url,
          hasRoot: source.includes('id="root"'),
          hasLayout: source.includes("layout-main-content-container"),
          hasTitleBar: source.includes("title-bar-app-name-button"),
        });

        if (
          source.includes("layout-main-content-container") ||
          source.includes("title-bar-app-name-button") ||
          source.includes('id="root"')
        ) {
          return true;
        }
      }

      lastWindowReport = windowReport;
      return false;
    },
    {
      timeout: 60_000,
      timeoutMsg: `No interactive app window found. Last window report: ${JSON.stringify(lastWindowReport)}`,
      interval: 250,
    },
  );
}

export async function waitForDesktopShell() {
  await switchToAppWindow();

  const root = await $("#root");
  await root.waitForExist({ timeout: 60_000 });

  const layout = await $("#layout-main-content-container");
  await layout.waitForExist({ timeout: 60_000 });
}

export async function readBrowserLogs() {
  try {
    return await browser.getLogs("browser");
  } catch (error) {
    return [
      {
        level: "WARN",
        message: `browser logs unavailable: ${String(error)}`,
      },
    ];
  }
}

export async function assertNoSevereBrowserLogs() {
  const logs = await readBrowserLogs();
  const severeLogs = logs.filter((entry) => entry.level === "SEVERE");
  assert.deepEqual(
    severeLogs,
    [],
    `Unexpected severe browser logs: ${JSON.stringify(severeLogs)}`,
  );
}
