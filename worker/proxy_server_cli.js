const { Worker } = require("worker_threads");
const path = require("path");

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    i += 1;
  }

  return args;
}

function shutdown(worker) {
  worker.terminate().finally(() => process.exit(0));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port);
  const targetOrigin = args["target-origin"];

  if (!Number.isFinite(port) || !targetOrigin) {
    console.error(
      "proxy_server_cli.js requires --port <number> and --target-origin <url>",
    );
    process.exit(1);
  }

  const worker = new Worker(path.join(__dirname, "proxy_server.js"), {
    workerData: {
      port,
      targetOrigin,
    },
  });

  worker.on("message", (message) => {
    const line =
      typeof message === "string" ? message : JSON.stringify(message);
    process.stdout.write(`${line}\n`);
  });

  worker.on("error", (error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exit(1);
  });

  worker.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  process.on("SIGINT", () => shutdown(worker));
  process.on("SIGTERM", () => shutdown(worker));
}

main();
