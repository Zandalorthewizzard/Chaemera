import path from "node:path";
import fs from "node:fs";
import {
  createBaseUserSettings,
  writeUserSettingsToDir,
} from "../runtime_profile.mjs";

export default async function setupRuntime({ tauriAppDataDir, rootDir }) {
  process.env.CHAEMERA_TAURI_TEST_SELECT_APP_FOLDER = path.join(
    rootDir,
    "e2e-tests",
    "fixtures",
    "import-app",
    "minimal",
  );

  const settings = createBaseUserSettings({
    enableDyadPro: false,
    hasRunBefore: true,
    isRunning: true,
    isTestMode: true,
    selectedChatMode: "build",
  });

  const candidateDirs = [
    tauriAppDataDir,
    path.join(rootDir, "userData"),
    path.join(rootDir, "testing", "tauri-webdriver", "userData"),
    path.join(rootDir, "src-tauri", "target", "debug", "userData"),
  ];

  for (const candidateDir of candidateDirs) {
    fs.mkdirSync(candidateDir, { recursive: true });
    writeUserSettingsToDir(candidateDir, settings);
  }
}
