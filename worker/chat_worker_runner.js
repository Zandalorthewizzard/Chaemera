const { Worker } = require("worker_threads");
const path = require("path");
const readline = require("readline");

const WORKER_PATH = path.join(
  __dirname,
  "..",
  ".vite",
  "build",
  "chat_worker.js",
);

function main() {
  const workerFile = process.env.CHAT_WORKER_BUNDLE || WORKER_PATH;

  const worker = new Worker(workerFile);

  worker.on("message", (message) => {
    process.stdout.write(JSON.stringify(message) + "\n");
  });

  worker.on("error", (error) => {
    process.stderr.write(
      (error.stack || error.message || String(error)) + "\n",
    );
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      process.stderr.write(`Chat worker exited with code ${code}\n`);
    }
    process.exit(code ?? 0);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      worker.postMessage(msg);
    } catch (err) {
      process.stderr.write(
        `Invalid JSON on stdin: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  });

  rl.on("close", () => {
    worker.postMessage({ type: "shutdown" });
    setTimeout(() => {
      worker.terminate();
      process.exit(0);
    }, 5000).unref();
  });

  process.on("SIGTERM", () => {
    worker.terminate();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    worker.terminate();
    process.exit(0);
  });
}

main();
