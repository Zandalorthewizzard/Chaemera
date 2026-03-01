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
    expect(ciWorkflow).toContain("run: npm run build:renderer");
    expect(ciWorkflow).toContain(
      "run: cargo check --manifest-path src-tauri/Cargo.toml",
    );
  });
});
