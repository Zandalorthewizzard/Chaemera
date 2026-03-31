import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const runtimeHarnessDir = fileURLToPath(new URL(".", import.meta.url));
const includeManualRuntimeSpecs =
  process.env.CHAEMERA_TAURI_INCLUDE_MANUAL_SPECS === "true";

const runtimeRuns = [
  {
    label: "boot",
    spec: "./specs/boot.e2e.mjs",
  },
  {
    label: "performance force-close recovery",
    spec: "./specs/performance-force-close.e2e.mjs",
    setup: "./specs/performance-force-close.setup.mjs",
  },
  {
    label: "performance clean shutdown",
    spec: "./specs/performance-clean-shutdown.e2e.mjs",
    setup: "./specs/performance-clean-shutdown.setup.mjs",
  },
  {
    label: "performance sampling",
    spec: "./specs/performance-sampling.e2e.mjs",
  },
  {
    label: "app storage location",
    spec: "./specs/app-storage-location.e2e.mjs",
  },
  {
    label: "import with AI rules",
    spec: "./specs/import-with-ai-rules.e2e.mjs",
    setup: "./specs/import-with-ai-rules.setup.mjs",
  },
  {
    label: "copy chat",
    spec: "./specs/copy-chat.e2e.mjs",
    setup: "./specs/copy-chat.setup.mjs",
  },
  {
    label: "mcp build mode",
    spec: "./specs/mcp-build-mode.e2e.mjs",
  },
  {
    label: "mcp release readiness",
    spec: "./specs/mcp-release-readiness.e2e.mjs",
  },
];

if (includeManualRuntimeSpecs) {
  runtimeRuns.push({
    label: "version integrity (manual/unstable)",
    spec: "./specs/version-integrity.e2e.mjs",
    setup: "./specs/version-integrity.setup.mjs",
  });
} else {
  console.log(
    "\n==> Skipping manual/unstable runtime specs (set CHAEMERA_TAURI_INCLUDE_MANUAL_SPECS=true to include them; version-integrity is tracked separately as flaky/manual coverage)",
  );
}

for (const runtimeRun of runtimeRuns) {
  console.log(`\n==> Running ${runtimeRun.label}`);

  const result = spawnSync(
    "npx",
    ["wdio", "run", "wdio.conf.mjs", "--spec", runtimeRun.spec],
    {
      cwd: runtimeHarnessDir,
      shell: true,
      stdio: "inherit",
      env: {
        ...process.env,
        ...(runtimeRun.setup
          ? { CHAEMERA_TAURI_RUNTIME_SETUP: runtimeRun.setup }
          : {}),
      },
    },
  );

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
