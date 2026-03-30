const { spawn } = require("node:child_process");
const path = require("node:path");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    "Usage: node scripts/run-tauri-cli.js <tauri-subcommand> [...args]",
  );
  process.exit(1);
}

const tauriProjectRoot = path.resolve(__dirname, "..", "src-tauri");
const child =
  process.platform === "win32"
    ? spawn(
        process.env.comspec || "cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          `npx @tauri-apps/cli ${args.join(" ")} --config tauri.conf.json`,
        ],
        {
          cwd: tauriProjectRoot,
          stdio: "inherit",
          env: process.env,
        },
      )
    : spawn(
        "npx",
        ["@tauri-apps/cli", ...args, "--config", "tauri.conf.json"],
        {
          cwd: tauriProjectRoot,
          stdio: "inherit",
          env: process.env,
        },
      );

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Failed to launch Tauri CLI: ${error.message}`);
  process.exit(1);
});
