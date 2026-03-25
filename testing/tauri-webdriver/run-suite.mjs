import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const runtimeHarnessDir = fileURLToPath(new URL(".", import.meta.url));

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
];

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
