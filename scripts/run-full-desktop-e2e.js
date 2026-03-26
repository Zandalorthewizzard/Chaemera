const { spawnSync } = require("node:child_process");

const extraArgs = process.argv.slice(2);
const commandArgs = [
  "playwright",
  "test",
  "--project=tauri-regression",
  ...extraArgs,
];

const result = spawnSync("npx", commandArgs, {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
