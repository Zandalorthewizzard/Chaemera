import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const debugDir = path.join(rootDir, "src-tauri", "target", "debug");
const fakeLlmServerEntryPath = path.join(
  rootDir,
  "testing",
  "fake-llm-server",
  "dist",
  "index.js",
);
const profileRoot = path.join(
  os.tmpdir(),
  `chaemera-tauri-webdriver-${Date.now()}`,
);
const localAppDataDir = path.join(profileRoot, "LocalAppData");
const appDataDir = path.join(profileRoot, "AppData", "Roaming");
const tauriAppIdentifier = "io.chaemera.app";
const tauriAppDataDir = path.join(appDataDir, tauriAppIdentifier);
const tauriLocalDataDir = path.join(localAppDataDir, tauriAppIdentifier);
const tauriUserDataDir = path.join(profileRoot, "userData");
const tauriAppsDir = path.join(profileRoot, "app-roots");
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
const fakeLlmPort = process.env.FAKE_LLM_PORT ?? "3500";

let tauriDriver;
let fakeLlmServer;
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

function closeFakeLlmServer() {
  fakeLlmServer?.kill();
}

async function waitForHttpReady(url, timeoutMs = 30_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Timed out waiting for ${url}: ${String(lastError ?? "unknown error")}`,
  );
}

async function startFakeLlmServer() {
  if (!fs.existsSync(fakeLlmServerEntryPath)) {
    throw new Error(`Expected fake LLM server at ${fakeLlmServerEntryPath}.`);
  }

  fakeLlmServer = spawn(
    "node",
    [fakeLlmServerEntryPath, `--port=${fakeLlmPort}`],
    {
      cwd: path.dirname(fakeLlmServerEntryPath),
      stdio: [null, process.stdout, process.stderr],
      env: {
        ...process.env,
        PORT: fakeLlmPort,
      },
    },
  );

  fakeLlmServer.on("error", (error) => {
    console.error("fake-llm-server error:", error);
    process.exit(1);
  });

  fakeLlmServer.on("exit", (code) => {
    if (!exit && code !== 0) {
      console.error("fake-llm-server exited with code:", code);
      process.exit(1);
    }
  });

  await waitForHttpReady(`http://127.0.0.1:${fakeLlmPort}/health`);
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
    tauriUserDataDir,
    tauriAppsDir,
  });
}

registerShutdownCleanup(() => {
  closeTauriDriver();
  closeFakeLlmServer();
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
    fs.mkdirSync(tauriUserDataDir, { recursive: true });
    fs.mkdirSync(tauriAppsDir, { recursive: true });

    process.env.CHAEMERA_TAURI_PROFILE_ROOT = profileRoot;
    process.env.CHAEMERA_TAURI_APP_IDENTIFIER = tauriAppIdentifier;
    process.env.CHAEMERA_TAURI_APP_DATA_DIR = tauriAppDataDir;
    process.env.CHAEMERA_TAURI_LOCAL_DATA_DIR = tauriLocalDataDir;
    process.env.CHAEMERA_TAURI_USER_DATA_DIR = tauriUserDataDir;
    process.env.CHAEMERA_TAURI_APPS_DIR = tauriAppsDir;
    process.env.CHAEMERA_TAURI_CHAEMERA_APPS_DIR = tauriAppsDir;
    process.env.FAKE_LLM_PORT = fakeLlmPort;
    process.env.TEST_AZURE_BASE_URL = `http://127.0.0.1:${fakeLlmPort}/azure`;

    await startFakeLlmServer();

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
          CHAEMERA_TAURI_USER_DATA_DIR: tauriUserDataDir,
          CHAEMERA_TAURI_APPS_DIR: tauriAppsDir,
          CHAEMERA_TAURI_CHAEMERA_APPS_DIR: tauriAppsDir,
          FAKE_LLM_PORT: fakeLlmPort,
          TEST_AZURE_BASE_URL: `http://127.0.0.1:${fakeLlmPort}/azure`,
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
    closeFakeLlmServer();
    delete process.env.CHAEMERA_TAURI_PROFILE_ROOT;
    delete process.env.CHAEMERA_TAURI_APP_IDENTIFIER;
    delete process.env.CHAEMERA_TAURI_APP_DATA_DIR;
    delete process.env.CHAEMERA_TAURI_LOCAL_DATA_DIR;
    delete process.env.CHAEMERA_TAURI_USER_DATA_DIR;
    delete process.env.CHAEMERA_TAURI_APPS_DIR;
    delete process.env.CHAEMERA_TAURI_CHAEMERA_APPS_DIR;
    delete process.env.FAKE_LLM_PORT;
    delete process.env.TEST_AZURE_BASE_URL;
    if (keepRuntimeProfile) {
      console.log(`Preserving Tauri runtime profile at ${profileRoot}`);
      return;
    }
    fs.rmSync(profileRoot, { recursive: true, force: true });
  },
};
