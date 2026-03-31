import assert from "node:assert/strict";

async function switchToAppWindow() {
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
          console.log("Selected app window:", JSON.stringify(windowReport));
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

async function readBrowserLogs() {
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

function getSevereBrowserLogs(logs) {
  return logs.filter((entry) => entry.level === "SEVERE");
}

describe("Chaemera Tauri runtime", () => {
  it("boots the real desktop shell", async () => {
    await switchToAppWindow();

    const root = await $("#root");
    await root.waitForExist({ timeout: 60_000 });

    const layout = await $("#layout-main-content-container");
    await layout.waitForExist({ timeout: 60_000 });

    const appButton = await $('[data-testid="title-bar-app-name-button"]');
    await appButton.waitForExist({ timeout: 60_000 });

    const appButtonText = await appButton.getText();
    assert.match(appButtonText, /app selected/i);

    const appList = await $('[data-testid="app-list-container"]');
    await appList.waitForExist({ timeout: 60_000 });

    const debugState = await browser.execute(() => {
      const rootElement = document.querySelector("#root");
      const testIds = Array.from(document.querySelectorAll("[data-testid]"))
        .map((element) => element.getAttribute("data-testid"))
        .filter(Boolean)
        .slice(0, 25);

      return {
        readyState: document.readyState,
        bodyText: document.body.innerText.slice(0, 500),
        rootChildElementCount: rootElement?.childElementCount ?? 0,
        title: document.title,
        url: window.location.href,
        testIds,
        hasTauriGlobal: Boolean(window.__TAURI__),
        hasTauriInternals: Boolean(window.__TAURI_INTERNALS__),
        hasTauriCoreBridge: Boolean(window.__CHAEMERA_TAURI_CORE__),
      };
    });
    const browserLogs = await readBrowserLogs();
    const severeBrowserLogs = getSevereBrowserLogs(browserLogs);

    assert.match(debugState.readyState, /^(interactive|complete)$/);
    assert.equal(debugState.rootChildElementCount > 0, true);
    assert.equal(debugState.hasTauriCoreBridge, true);
    assert.equal(debugState.hasTauriInternals, true);
    assert.deepEqual(
      severeBrowserLogs,
      [],
      `Unexpected severe browser logs: ${JSON.stringify(severeBrowserLogs)}`,
    );
  });
});
