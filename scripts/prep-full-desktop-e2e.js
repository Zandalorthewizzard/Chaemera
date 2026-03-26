const { spawnSync } = require("node:child_process");
const result = spawnSync("npm", ["run", "pre:e2e:tauri-regression"], {
  stdio: "inherit",
  shell: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
