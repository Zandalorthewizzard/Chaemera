import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("chat_worker_runner", () => {
  it("bridges a worker bundle over stdout json lines", () => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "chaemera-chat-runner-"),
    );
    tempDirs.push(tempDir);

    const fakeWorkerBundle = path.join(tempDir, "fake-worker.js");
    fs.writeFileSync(
      fakeWorkerBundle,
      [
        'const { parentPort } = require("node:worker_threads");',
        'parentPort?.postMessage({ type: "log", level: "info", message: "bundle-loaded" });',
        "setImmediate(() => process.exit(0));",
      ].join("\n"),
      "utf8",
    );

    const runnerPath = path.resolve("worker/chat_worker_runner.js");
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CHAT_WORKER_BUNDLE: fakeWorkerBundle,
      },
      input: "",
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    const stdoutLines = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    expect(stdoutLines.length).toBeGreaterThan(0);
    expect(stdoutLines.some((line) => line.includes("bundle-loaded"))).toBe(
      true,
    );
  });
});
