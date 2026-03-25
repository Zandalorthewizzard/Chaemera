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

  it("keeps Tauri-first packaging and release metadata aligned with the Chaemera fork", () => {
    const tauriPreviewWorkflow = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/release-tauri-preview.yml"),
      "utf8",
    );
    const workflowsReadme = fs.readFileSync(
      path.join(process.cwd(), ".github/workflows/README.md"),
      "utf8",
    );
    const packageJson = readJson<{
      scripts: Record<string, string>;
    }>("package.json");

    expect(packageJson.scripts.package).toBe("npm run package:tauri");
    expect(packageJson.scripts["package:tauri"]).toContain(
      "@tauri-apps/cli build",
    );
    expect(packageJson.scripts["start:electron"]).toBeUndefined();
    expect(packageJson.scripts["package:electron"]).toBeUndefined();
    expect(packageJson.scripts.make).toBeUndefined();
    expect(packageJson.scripts.publish).toBeUndefined();
    expect(
      fs.existsSync(path.join(process.cwd(), ".github/workflows/release.yml")),
    ).toBe(false);
    expect(tauriPreviewWorkflow).toContain("name: Release Tauri Preview");
    expect(tauriPreviewWorkflow).toContain("uses: tauri-apps/tauri-action@v1");
    expect(tauriPreviewWorkflow).toContain("workflowArtifactNamePattern");
    expect(workflowsReadme).not.toContain("Release Electron Legacy");
    expect(workflowsReadme).toContain("Release Tauri Preview");
  });
});
