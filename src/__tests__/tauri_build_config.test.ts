import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  ) as T;
}

describe("tauri build config", () => {
  it("uses dedicated renderer scripts instead of the legacy Electron build", () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
      devDependencies: Record<string, string | undefined>;
      main?: string;
    }>("package.json");
    const rootTauriConfig = readJson<{
      build: {
        beforeBuildCommand: string;
        beforeDevCommand: string;
        frontendDist: string;
      };
    }>("tauri.conf.json");
    const srcTauriConfig = readJson<{
      build: {
        beforeBuildCommand: string;
        beforeDevCommand: string;
        frontendDist: string;
      };
    }>("src-tauri/tauri.conf.json");

    expect(packageJson.scripts["dev:renderer"]).toBe(
      "npx vite --config vite.renderer.config.mts --host 127.0.0.1 --port 5173",
    );
    expect(packageJson.scripts.start).toBe("npm run start:tauri");
    expect(packageJson.scripts["start:tauri"]).toBe(
      "node scripts/run-tauri-cli.js dev",
    );
    expect(packageJson.scripts["start:electron"]).toBeUndefined();
    expect(packageJson.scripts.package).toBe("npm run package:tauri");
    expect(packageJson.scripts["package:tauri"]).toBe(
      "node scripts/run-tauri-cli.js build",
    );
    expect(packageJson.main).toBeUndefined();
    expect(packageJson.scripts["check:tauri"]).toBe(
      "cargo check --manifest-path src-tauri/Cargo.toml",
    );
    expect(packageJson.scripts["build:tauri-runtime-app"]).toBe(
      "node scripts/build-tauri-runtime-app.js",
    );
    expect(packageJson.scripts["audit:electron-legacy"]).toBe(
      "node scripts/audit-electron-legacy-surface.js",
    );
    expect(packageJson.scripts["build:test-electron-harness"]).toBeUndefined();
    expect(packageJson.scripts["package:electron"]).toBeUndefined();
    expect(packageJson.scripts.make).toBeUndefined();
    expect(packageJson.scripts.publish).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/maker-deb"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/maker-rpm"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/maker-squirrel"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/maker-zip"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/publisher-github"],
    ).toBeUndefined();
    expect(packageJson.devDependencies["@electron-forge/cli"]).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/plugin-auto-unpack-natives"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/plugin-fuses"],
    ).toBeUndefined();
    expect(
      packageJson.devDependencies["@electron-forge/plugin-vite"],
    ).toBeUndefined();
    expect(packageJson.devDependencies["@electron/asar"]).toBeUndefined();
    expect(packageJson.devDependencies["@electron/fuses"]).toBeUndefined();
    expect(packageJson.scripts["build:tauri-regression"]).toBe(
      "npx vite build --config vite.renderer.config.mts --outDir .tauri-smoke-dist",
    );
    expect(packageJson.scripts["build:tauri-smoke"]).toBe(
      "npm run build:tauri-regression",
    );
    expect(packageJson.scripts["serve:tauri-regression"]).toBe(
      "npx vite preview --config vite.renderer.config.mts --host 127.0.0.1 --port 4173 --outDir .tauri-smoke-dist",
    );
    expect(packageJson.scripts["serve:tauri-smoke"]).toBe(
      "npm run serve:tauri-regression",
    );
    expect(packageJson.scripts["pre:e2e:tauri-regression"]).toBe(
      "npm run build:tauri-regression",
    );
    expect(packageJson.scripts["pre:e2e:tauri-runtime"]).toBe(
      "npm run build:chat-worker && npm run build:tauri-runtime-app",
    );
    expect(packageJson.scripts["pre:e2e:tauri-smoke"]).toBe(
      "npm run pre:e2e:tauri-regression",
    );
    expect(packageJson.scripts["pre:e2e:electron-regression"]).toBeUndefined();
    expect(packageJson.scripts["pre:e2e:full"]).toBe(
      "node scripts/prep-full-desktop-e2e.js",
    );
    expect(packageJson.scripts["pre:e2e:ci"]).toBe("npm run pre:e2e:full");
    expect(packageJson.scripts["pre:e2e"]).toBe(
      "npm run pre:e2e:tauri-regression",
    );
    expect(packageJson.scripts.e2e).toBe(
      "playwright test --project=tauri-regression",
    );
    expect(packageJson.scripts["e2e:full"]).toBe(
      "node scripts/run-full-desktop-e2e.js",
    );
    expect(packageJson.scripts["e2e:ci"]).toBe("npm run e2e:full");
    expect(packageJson.scripts["e2e:electron"]).toBeUndefined();
    expect(packageJson.scripts["e2e:tauri-regression"]).toBe(
      "playwright test --project=tauri-regression",
    );
    expect(packageJson.scripts["e2e:tauri-runtime"]).toBe(
      "npm --prefix testing/tauri-webdriver test",
    );
    expect(packageJson.scripts["e2e:tauri-smoke"]).toBe(
      "npm run e2e:tauri-regression",
    );
    expect(packageJson.scripts["build:renderer"]).toBe(
      "npx vite build --config vite.renderer.config.mts --outDir dist",
    );
    expect(rootTauriConfig.build.beforeDevCommand).toBe("npm run dev:renderer");
    expect(rootTauriConfig.build.beforeBuildCommand).toBe(
      "npm run build:renderer",
    );
    expect(srcTauriConfig.build.beforeDevCommand).toBe("npm run dev:renderer");
    expect(srcTauriConfig.build.beforeBuildCommand).toBe(
      "npm run build:renderer && npm run build:chat-worker",
    );
    expect(rootTauriConfig.build.beforeBuildCommand).not.toBe("npm run build");
    expect(srcTauriConfig.build.beforeBuildCommand).not.toBe("npm run build");
    expect(rootTauriConfig.build.frontendDist).toBe("./dist");
    expect(srcTauriConfig.build.frontendDist).toBe("../dist");
    expect(fs.existsSync(path.join(process.cwd(), "forge.config.ts"))).toBe(
      false,
    );
    expect(fs.existsSync(path.join(process.cwd(), "forge.env.d.ts"))).toBe(
      false,
    );
    expect(
      fs.existsSync(path.join(process.cwd(), "vite.main.config.mts")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(process.cwd(), "vite.preload.config.mts")),
    ).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "src/main.ts"))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "src/preload.ts"))).toBe(
      false,
    );
  });

  it("keeps CI aware of the Tauri renderer and runtime checks", () => {
    const ciWorkflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/ci.yml"),
      "utf8",
    );

    expect(ciWorkflow).toContain("uses: dtolnay/rust-toolchain@stable");
    expect(ciWorkflow).toContain("run: npm run audit:tauri-cutover");
    expect(ciWorkflow).toContain("run: npm run pre:e2e:full");
    expect(ciWorkflow).toContain("run: npm run pre:e2e:tauri-regression");
    expect(ciWorkflow).toContain("run: npm run build:renderer");
    expect(ciWorkflow).toContain("run: npm run check:tauri");
    expect(ciWorkflow).toContain("cargo install tauri-driver --locked");
    expect(ciWorkflow).toContain(
      "cargo install --git https://github.com/chippers/msedgedriver-tool",
    );
    expect(ciWorkflow).toContain("run: npm run pre:e2e:tauri-runtime");
    expect(ciWorkflow).toContain("run: npm run e2e:tauri-runtime");
    expect(ciWorkflow).toContain(
      "run: DEBUG=pw:browser npm run e2e:ci -- --shard=${{ matrix.shard }}/${{ matrix.shardTotal }}",
    );
  });

  it("keeps a dedicated Tauri preview release workflow", () => {
    const releaseWorkflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/release-tauri-preview.yml"),
      "utf8",
    );

    expect(releaseWorkflow).toContain("name: Release Tauri Preview");
    expect(releaseWorkflow).toContain("uses: tauri-apps/tauri-action@v1");
    expect(releaseWorkflow).toContain("uploadWorkflowArtifacts: true");
    expect(releaseWorkflow).toContain("--config src-tauri/tauri.conf.json");
  });
});
