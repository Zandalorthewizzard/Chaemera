import path from "node:path";

export default async function setupRuntime({ rootDir }) {
  process.env.CHAEMERA_TAURI_TEST_SELECT_APP_FOLDER = path.join(
    rootDir,
    "e2e-tests",
    "fixtures",
    "import-app",
    "version-integrity",
  );
}
