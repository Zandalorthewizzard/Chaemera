import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const debugDir = path.join(rootDir, "src-tauri", "target", "debug");
const profileRoot = path.join(
  os.tmpdir(),
  `chaemera-tauri-webdriver-${Date.now()}`,
);
const localAppDataDir = path.join(profileRoot, "LocalAppData");
const appDataDir = path.join(profileRoot, "AppData", "Roaming");
const tauriAppIdentifier = "io.chaemera.app";
const tauriAppDataDir = path.join(appDataDir, tauriAppIdentifier);
const tauriLocalDataDir = path.join(localAppDataDir, tauriAppIdentifier);
const tauriDriverPath = path.join(
  os.homedir(),
  ".cargo",
  "bin",
  "tauri-driver.exe",
);
const nativeDriverPath = path.join(
  os.homedir(),
  ".cargo",
  "bin",
  "msedgedriver.exe",
);
const runtimeSetupModulePath = process.env.CHAEMERA_TAURI_RUNTIME_SETUP ?? null;
const keepRuntimeProfile = process.env.CHAEMERA_TAURI_KEEP_PROFILE === "true";

let tauriDriver;
let exit = false;

function resolveTauriApplication() {
  if (!fs.existsSync(debugDir)) {
    throw new Error(
      `Expected Tauri debug output at ${debugDir}. Run 'npm run pre:e2e:tauri-runtime' first.`,
    );
  }

  const candidates = fs
    .readdirSync(debugDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".exe") &&
        !entry.name.startsWith("build-script-"),
    )
    .map((entry) => path.join(debugDir, entry.name))
    .sort((left, right) => {
      const leftStat = fs.statSync(left);
      const rightStat = fs.statSync(right);
      return rightStat.mtimeMs - leftStat.mtimeMs;
    });

  const preferred = candidates.find((candidate) =>
    path.basename(candidate).toLowerCase().includes("chaemera"),
  );

  const application = preferred ?? candidates[0];
  if (!application) {
    throw new Error(
      `No Tauri executable found in ${debugDir}. Run 'npm run pre:e2e:tauri-runtime' first.`,
    );
  }

  return application;
}

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function registerShutdownCleanup(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.once("exit", cleanup);
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);
  process.once("SIGBREAK", cleanup);
}

async function runRuntimeSetupHook() {
  if (!runtimeSetupModulePath) {
    return;
  }

  const candidateModulePaths = path.isAbsolute(runtimeSetupModulePath)
    ? [runtimeSetupModulePath]
    : [
        path.resolve(__dirname, runtimeSetupModulePath),
        path.resolve(rootDir, runtimeSetupModulePath),
      ];
  const resolvedModulePath = candidateModulePaths.find((candidatePath) =>
    fs.existsSync(candidatePath),
  );

  if (!resolvedModulePath) {
    throw new Error(
      `Tauri runtime setup module not found: ${runtimeSetupModulePath}`,
    );
  }

  const runtimeSetupModule = await import(
    pathToFileURL(resolvedModulePath).href
  );
  const runtimeSetupHook =
    runtimeSetupModule.default ??
    runtimeSetupModule.setup ??
    runtimeSetupModule.setupRuntime;

  if (typeof runtimeSetupHook !== "function") {
    throw new Error(
      `Tauri runtime setup module must export a default/setup/setupRuntime function: ${resolvedModulePath}`,
    );
  }

  await runtimeSetupHook({
    rootDir,
    profileRoot,
    localAppDataDir,
    appDataDir,
    appIdentifier: tauriAppIdentifier,
    tauriAppDataDir,
    tauriLocalDataDir,
  });
}

registerShutdownCleanup(() => {
  closeTauriDriver();
});

export const config = {
  host: "127.0.0.1",
  port: 4444,
  logLevel: "warn",
  specs: ["./specs/**/*.e2e.mjs"],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      "tauri:options": {
        application: resolveTauriApplication(),
      },
    },
  ],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 120_000,
  },
  beforeSession: async () => {
    fs.mkdirSync(localAppDataDir, { recursive: true });
    fs.mkdirSync(appDataDir, { recursive: true });
    fs.mkdirSync(tauriAppDataDir, { recursive: true });
    fs.mkdirSync(tauriLocalDataDir, { recursive: true });

    process.env.CHAEMERA_TAURI_PROFILE_ROOT = profileRoot;
    process.env.CHAEMERA_TAURI_APP_IDENTIFIER = tauriAppIdentifier;
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = tauriAppDataDir;
    process.env.CHAEMERA_TAURI_LOCAL_DATA_DIR = tauriLocalDataDir;

    await runRuntimeSetupHook();

    tauriDriver = spawn(
      tauriDriverPath,
      ["--native-driver", nativeDriverPath],
      {
        stdio: [null, process.stdout, process.stderr],
        env: {
          ...process.env,
          APPDATA: appDataDir,
          LOCALAPPDATA: localAppDataDir,
          CHAEMERA_TAURI_PROFILE_ROOT: profileRoot,
          CHAEMERA_TAURI_APP_IDENTIFIER: tauriAppIdentifier,
          CHAEMERA_TAURI_APP_DATA_DIR: tauriAppDataDir,
          CHAEMERA_TAURI_LOCAL_DATA_DIR: tauriLocalDataDir,
          OPENAI_API_KEY: "sk-test",
          E2E_TEST_BUILD: "true",
        },
      },
    );

    tauriDriver.on("error", (error) => {
      console.error("tauri-driver error:", error);
      process.exit(1);
    });

    tauriDriver.on("exit", (code) => {
      if (!exit) {
        console.error("tauri-driver exited with code:", code);
        process.exit(1);
      }
    });
  },
  afterSession: () => {
    closeTauriDriver();
    delete process.env.CHAEMERA_TAURI_PROFILE_ROOT;
    delete process.env.CHAEMERA_TAURI_APP_IDENTIFIER;
    delete process.env.CHAEMERA_TAURI_APP_DATA_DIR;
    delete process.env.CHAEMERA_TAURI_LOCAL_DATA_DIR;
    if (keepRuntimeProfile) {
      console.log(`Preserving Tauri runtime profile at ${profileRoot}`);
      return;
    }
    fs.rmSync(profileRoot, { recursive: true, force: true });
  },
};
