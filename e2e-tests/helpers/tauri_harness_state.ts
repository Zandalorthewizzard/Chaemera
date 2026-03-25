import { expect, Page } from "@playwright/test";

type TauriSmokeHarnessState = {
  settings: Record<string, unknown>;
};

export async function getTauriHarnessState(
  page: Page,
): Promise<TauriSmokeHarnessState> {
  return page.evaluate(() => {
    const harness = window.__CHAEMERA_TAURI_SMOKE__;
    if (!harness) {
      throw new Error("Tauri smoke harness is not available");
    }
    return harness.getState();
  });
}

export async function getTauriHarnessSettings(
  page: Page,
): Promise<Record<string, unknown>> {
  const state = await getTauriHarnessState(page);
  return state.settings;
}

export async function expectTauriHarnessSettings(
  page: Page,
  expectedSubset: Record<string, unknown>,
) {
  await expect
    .poll(async () => {
      const settings = await getTauriHarnessSettings(page);
      return Object.fromEntries(
        Object.keys(expectedSubset).map((key) => [key, settings[key]]),
      );
    })
    .toEqual(expectedSubset);
}
