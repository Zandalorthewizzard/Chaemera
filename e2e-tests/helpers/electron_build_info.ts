import fs from "fs";
import path from "path";
import * as asar from "@electron/asar";

type ElectronLaunchInfo = {
  executable: string;
  main: string;
};

const platformMarkers = [
  "win32",
  "win",
  "windows",
  "darwin",
  "mac",
  "macos",
  "osx",
  "linux",
  "ubuntu",
  "debian",
];

function resolvePlatform(buildPath: string): "win32" | "darwin" | "linux" {
  if (buildPath.endsWith(".exe")) {
    return "win32";
  }
  if (buildPath.endsWith(".app")) {
    return "darwin";
  }

  const normalizedName = path.basename(buildPath).toLowerCase();
  if (/(^|[-_])(win|win32|windows)([-_]|$)/.test(normalizedName)) {
    return "win32";
  }
  if (/(^|[-_])(darwin|mac|macos|osx)([-_]|$)/.test(normalizedName)) {
    return "darwin";
  }
  if (/(^|[-_])(linux|ubuntu|debian)([-_]|$)/.test(normalizedName)) {
    return "linux";
  }

  throw new Error(
    `Unable to infer Electron build platform from "${buildPath}".`,
  );
}

function readPackagedMain(resourcesDir: string): string {
  const asarPath = path.join(resourcesDir, "app.asar");
  if (fs.existsSync(asarPath)) {
    const packageJson = JSON.parse(
      asar.extractFile(asarPath, "package.json").toString("utf8"),
    ) as { main: string };
    return path.join(asarPath, packageJson.main);
  }

  const appDir = path.join(resourcesDir, "app");
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(appDir, "package.json"), "utf8"),
  ) as { main: string };
  return path.join(appDir, packageJson.main);
}

function findLinuxExecutable(buildDir: string): string {
  const ignoreSuffixes = [
    ".so",
    ".so.1",
    ".so.2",
    ".bin",
    ".pak",
    ".dat",
    ".json",
  ];
  const ignoreNames = new Set(["resources", "locales", "version", "LICENSE"]);

  const candidate = fs.readdirSync(buildDir).find((entry) => {
    if (ignoreNames.has(entry)) {
      return false;
    }
    if (ignoreSuffixes.some((suffix) => entry.endsWith(suffix))) {
      return false;
    }
    if (
      entry.startsWith("chrome-") ||
      entry.startsWith("chrome_") ||
      entry.startsWith("lib") ||
      entry.startsWith("LICENSE")
    ) {
      return false;
    }

    const entryPath = path.join(buildDir, entry);
    const stats = fs.statSync(entryPath);
    if (!stats.isFile()) {
      return false;
    }

    try {
      fs.accessSync(entryPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });

  if (!candidate) {
    throw new Error(
      `Could not find Linux Electron executable in "${buildDir}".`,
    );
  }

  return path.join(buildDir, candidate);
}

export function findLatestElectronBuild(buildDirectory = "out"): string {
  const outDir = path.resolve(buildDirectory);
  const candidates = fs
    .readdirSync(outDir)
    .map((entry) => {
      const fullPath = path.join(outDir, entry);
      const stats = fs.statSync(fullPath);
      const lowerEntry = entry.toLowerCase();
      const looksLikeBuild =
        stats.isDirectory() &&
        lowerEntry
          .split("-")
          .some((part) => platformMarkers.includes(part.toLowerCase()));
      return looksLikeBuild
        ? {
            fullPath,
            modifiedTimeMs: stats.mtimeMs,
          }
        : null;
    })
    .filter(
      (candidate): candidate is { fullPath: string; modifiedTimeMs: number } =>
        candidate !== null,
    )
    .sort((left, right) => right.modifiedTimeMs - left.modifiedTimeMs);

  if (candidates.length === 0) {
    throw new Error(`No Electron build directories were found in "${outDir}".`);
  }

  return candidates[0].fullPath;
}

export function parseElectronBuild(buildPath: string): ElectronLaunchInfo {
  const platform = resolvePlatform(buildPath);

  if (platform === "win32") {
    const buildDir = buildPath.endsWith(".exe")
      ? path.dirname(buildPath)
      : buildPath;
    const executable = buildPath.endsWith(".exe")
      ? buildPath
      : path.join(
          buildDir,
          fs
            .readdirSync(buildDir)
            .find((entry) => entry.toLowerCase().endsWith(".exe")) ?? "",
        );

    if (!fs.existsSync(executable)) {
      throw new Error(`Could not find Electron executable in "${buildDir}".`);
    }

    return {
      executable,
      main: readPackagedMain(path.join(buildDir, "resources")),
    };
  }

  if (platform === "darwin") {
    const appBundle = buildPath.endsWith(".app")
      ? buildPath
      : path.join(
          buildPath,
          fs.readdirSync(buildPath).find((entry) => entry.endsWith(".app")) ??
            "",
        );

    if (!fs.existsSync(appBundle)) {
      throw new Error(`Could not find macOS app bundle in "${buildPath}".`);
    }

    const macOsDir = path.join(appBundle, "Contents", "MacOS");
    const executableName = fs.readdirSync(macOsDir)[0];
    return {
      executable: path.join(macOsDir, executableName),
      main: readPackagedMain(path.join(appBundle, "Contents", "Resources")),
    };
  }

  return {
    executable: findLinuxExecutable(buildPath),
    main: readPackagedMain(path.join(buildPath, "resources")),
  };
}
