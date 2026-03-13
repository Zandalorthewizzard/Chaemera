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
      "npx @tauri-apps/cli dev --config src-tauri/tauri.conf.json",
    );
    expect(packageJson.scripts["start:electron"]).toBe("electron-forge start");
    expect(packageJson.scripts.package).toBe("npm run package:tauri");
    expect(packageJson.scripts["package:tauri"]).toBe(
      "npx @tauri-apps/cli build --config src-tauri/tauri.conf.json",
    );
    expect(packageJson.scripts["check:tauri"]).toBe(
      "cargo check --manifest-path src-tauri/Cargo.toml",
    );
    expect(packageJson.scripts["audit:electron-legacy"]).toBe(
      "node scripts/audit-electron-legacy-surface.js",
    );
    expect(packageJson.scripts["build:electron-harness"]).toBe(
      "cross-env E2E_TEST_BUILD=true npm run package:electron",
    );
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
    expect(packageJson.scripts["pre:e2e:tauri-smoke"]).toBe(
      "npm run pre:e2e:tauri-regression",
    );
    expect(packageJson.scripts["pre:e2e:electron-regression"]).toBe(
      "npm run build:electron-harness && npm run build:tauri-regression",
    );
    expect(packageJson.scripts["pre:e2e"]).toBe(
      "npm run pre:e2e:electron-regression",
    );
    expect(packageJson.scripts["e2e:tauri-regression"]).toBe(
      "playwright test --project=tauri-regression",
    );
    expect(packageJson.scripts["e2e:tauri-smoke"]).toBe(
      "npm run e2e:tauri-regression",
    );
    expect(packageJson.scripts["build:renderer"]).toBe(
      "npx vite build --config vite.renderer.config.mts --outDir dist",
    );
    expect(rootTauriConfig.build.beforeDevCommand).toBe(
      "npm run dev:renderer",
    );
    expect(rootTauriConfig.build.beforeBuildCommand).toBe(
      "npm run build:renderer",
    );
    expect(srcTauriConfig.build.beforeDevCommand).toBe(
      "npm run dev:renderer",
    );
    expect(srcTauriConfig.build.beforeBuildCommand).toBe(
      "npm run build:renderer",
    );
    expect(rootTauriConfig.build.beforeBuildCommand).not.toBe("npm run build");
    expect(srcTauriConfig.build.beforeBuildCommand).not.toBe("npm run build");
    expect(rootTauriConfig.build.frontendDist).toBe("./dist");
    expect(srcTauriConfig.build.frontendDist).toBe("../dist");
  });

  it("keeps CI aware of the Tauri renderer and runtime checks", () => {
    const ciWorkflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/ci.yml"),
      "utf8",
    );

    expect(ciWorkflow).toContain("uses: dtolnay/rust-toolchain@stable");
    expect(ciWorkflow).toContain("run: npm run audit:tauri-cutover");
    expect(ciWorkflow).toContain("run: npm run pre:e2e:electron-regression");
    expect(ciWorkflow).toContain("run: npm run build:renderer");
    expect(ciWorkflow).toContain("run: npm run check:tauri");
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
