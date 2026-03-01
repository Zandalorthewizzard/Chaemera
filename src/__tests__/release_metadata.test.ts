import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"),
  ) as T;
}

describe("release metadata", () => {
  it("brands package metadata for Chaemera", () => {
    const packageJson = readJson<{
      name: string;
      productName: string;
      author: { name: string };
      repository: { url: string };
    }>("package.json");
    const packageLock = readJson<{
      name: string;
      packages: { "": { name: string } };
    }>("package-lock.json");

    expect(packageJson.name).toBe("chaemera");
    expect(packageJson.productName).toBe("Chaemera");
    expect(packageJson.author.name).toBe("Chaemera contributors");
    expect(packageJson.repository.url).toBe(
      "https://github.com/Zandalorthewizzard/Chaemera.git",
    );
    expect(packageLock.name).toBe("chaemera");
    expect(packageLock.packages[""].name).toBe("chaemera");
  });

  it("keeps legacy forge metadata aligned with the Chaemera fork", () => {
    const forgeConfig = fs.readFileSync(
      path.join(process.cwd(), "forge.config.ts"),
      "utf8",
    );
    const releaseVerifier = fs.readFileSync(
      path.join(process.cwd(), "scripts/verify-release-assets.js"),
      "utf8",
    );
    const packageJson = readJson<{
      scripts: Record<string, string>;
    }>("package.json");
    const releaseWorkflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/release.yml"),
      "utf8",
    );

    expect(forgeConfig).toContain('name: "Chaemera"');
    expect(forgeConfig).toContain('owner: "Zandalorthewizzard"');
    expect(forgeConfig).toContain('name: "Chaemera"');
    expect(forgeConfig).toContain('schemes: ["dyad"]');
    expect(packageJson.scripts.package).toBe("npm run package:electron");
    expect(packageJson.scripts.make).toBe("npm run make:electron");
    expect(packageJson.scripts.publish).toBe("npm run publish:electron");
    expect(packageJson.scripts["publish:electron"]).toContain(
      "electron-forge publish",
    );
    expect(releaseWorkflow).toContain("name: Release Electron Legacy");
    expect(releaseWorkflow).toContain("npm run publish:electron -- --dry-run");
    expect(releaseVerifier).toContain('const owner = "Zandalorthewizzard";');
    expect(releaseVerifier).toContain('const repo = "Chaemera";');
    expect(releaseVerifier).toContain('"chaemera-release-verifier"');
    expect(releaseVerifier).toContain("chaemera-darwin-arm64-");
  });
});
