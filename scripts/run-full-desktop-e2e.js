const { spawnSync } = require("node:child_process");
const os = require("node:os");

const extraArgs = process.argv.slice(2);
const commandArgs =
  os.platform() === "win32"
    ? ["playwright", "test", "--project=tauri-regression", ...extraArgs]
    : ["playwright", "test", ...extraArgs];

const result = spawnSync("npx", commandArgs, {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
