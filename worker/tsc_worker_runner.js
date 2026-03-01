const { Worker } = require("worker_threads");
const path = require("path");

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];

    process.stdin.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    process.stdin.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  const rawInput = await readStdin();
  if (!rawInput.trim()) {
    process.stderr.write("tsc_worker_runner.js expected JSON on stdin\n");
    process.exit(1);
  }

  const input = JSON.parse(rawInput);
  const worker = new Worker(
    path.join(__dirname, "..", ".vite", "build", "tsc_worker.js"),
  );

  let settled = false;

  worker.on("message", async (message) => {
    if (settled) return;
    settled = true;
    process.stdout.write(`${JSON.stringify(message)}\n`);
    await worker.terminate();
    process.exit(message && message.success ? 0 : 1);
  });

  worker.on("error", (error) => {
    if (settled) return;
    settled = true;
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exit(1);
  });

  worker.on("exit", (code) => {
    if (settled || code === 0) return;
    process.stderr.write(`tsc worker exited with code ${code}\n`);
    process.exit(code ?? 1);
  });

  worker.postMessage(input);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exit(1);
});
