const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = process.cwd();
const srcTauriDir = path.join(process.cwd(), "src-tauri");
const repoRootForNpm = repoRoot.replace(/\\/g, "/");
const overrideConfigPath = path.join(
  srcTauriDir,
  ".tauri-runtime-build.override.json",
);
const mergedConfig = {
  build: {
    beforeBuildCommand: `npm --prefix ${repoRootForNpm} run build:renderer && npm --prefix ${repoRootForNpm} run build:chat-worker`,
  },
};

fs.writeFileSync(overrideConfigPath, JSON.stringify(mergedConfig), "utf8");

const result = spawnSync(
  "npx",
  [
    "@tauri-apps/cli",
    "build",
    "--debug",
    "--no-bundle",
    "--ci",
    "--config",
    overrideConfigPath,
  ],
  {
    cwd: srcTauriDir,
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

fs.rmSync(overrideConfigPath, { force: true });

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  if (result.signal) {
    console.error(`tauri runtime build terminated by signal: ${result.signal}`);
  }
  process.exit(result.status ?? 1);
}
