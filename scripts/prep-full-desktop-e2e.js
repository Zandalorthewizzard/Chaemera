const { spawnSync } = require("node:child_process");
const os = require("node:os");

const targetScript =
  os.platform() === "win32"
    ? "pre:e2e:tauri-regression"
    : "pre:e2e:electron-regression";

const result = spawnSync("npm", ["run", targetScript], {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
