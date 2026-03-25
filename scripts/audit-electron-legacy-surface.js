const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = process.cwd();

const ENTRYPOINT_FILES = [
  "src/main.ts",
  "src/preload.ts",
  "forge.config.ts",
  "vite.main.config.mts",
  "vite.preload.config.mts",
];

const IMPORT_PATTERNS = [
  {
    label: "electron",
    regex: /from ["']electron["']|require\(\s*["']electron["']\s*\)/,
  },
  {
    label: "electron-log",
    regex: /from ["']electron-log["']|require\(\s*["']electron-log["']\s*\)/,
  },
  {
    label: "electron-squirrel-startup",
    regex:
      /from ["']electron-squirrel-startup["']|require\(\s*["']electron-squirrel-startup["']\s*\)/,
  },
  {
    label: "update-electron-app",
    regex:
      /from ["']update-electron-app["']|require\(\s*["']update-electron-app["']\s*\)/,
  },
  {
    label: "electron-forge",
    regex:
      /@electron-forge\/|electron-forge|from ["']@electron\/fuses["']|require\(\s*["']@electron\/fuses["']\s*\)/,
  },
];

const WORKFLOW_PATTERNS = [
  /electron-regression/,
  /package:electron/,
  /build:electron-harness/,
  /electron-forge/,
];

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

function findMatchingLines(content, regex) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    if (regex.test(line)) {
      matches.push({
        line: index + 1,
        text: line.trim(),
      });
    }
  }

  return matches;
}

function collectImports(files) {
  const results = Object.fromEntries(
    IMPORT_PATTERNS.map(({ label }) => [label, []]),
  );

  for (const file of files) {
    if (!fs.existsSync(path.join(ROOT, file))) {
      continue;
    }

    if (file === "package-lock.json") {
      continue;
    }

    if (!/\.(?:[cm]?[jt]sx?|json|ya?ml)$/.test(file)) {
      continue;
    }

    const content = read(file);

    for (const { label, regex } of IMPORT_PATTERNS) {
      const matches = findMatchingLines(content, regex);
      if (matches.length > 0) {
        results[label].push({
          file,
          matches,
        });
      }
    }
  }

  return results;
}

function collectWorkflowRefs(files) {
  return files
    .filter((file) => file.startsWith(".github/workflows/"))
    .filter((file) => fs.existsSync(path.join(ROOT, file)))
    .flatMap((file) => {
      const content = read(file);
      const matches = WORKFLOW_PATTERNS.flatMap((regex) =>
        findMatchingLines(content, regex),
      );

      if (matches.length === 0) {
        return [];
      }

      const deduped = new Map(
        matches.map((match) => [`${match.line}:${match.text}`, match]),
      );

      return [
        {
          file,
          matches: Array.from(deduped.values()),
        },
      ];
    });
}

function collectElectronScripts() {
  const packageJson = JSON.parse(read("package.json"));
  const legacyScriptPatterns = [
    /start:electron/,
    /package:electron/,
    /make:electron/,
    /publish:electron/,
    /build:electron-harness/,
    /electron-regression/,
  ];
  return Object.entries(packageJson.scripts)
    .filter(([name, command]) =>
      legacyScriptPatterns.some(
        (regex) => regex.test(String(name)) || regex.test(String(command)),
      ),
    )
    .map(([name, command]) => ({
      name,
      command,
    }));
}

function main() {
  const trackedFiles = getTrackedFiles();
  const entrypoints = ENTRYPOINT_FILES.filter((file) =>
    fs.existsSync(path.join(ROOT, file)),
  );
  const imports = collectImports(trackedFiles);
  const workflows = collectWorkflowRefs(trackedFiles);
  const scripts = collectElectronScripts();

  const summary = {
    entrypointCount: entrypoints.length,
    electronImportFileCount: imports.electron.length,
    supportPackageImportFileCount:
      imports["electron-log"].length +
      imports["electron-squirrel-startup"].length +
      imports["update-electron-app"].length,
    forgeReferenceFileCount: imports["electron-forge"].length,
    electronScriptCount: scripts.length,
    workflowReferenceFileCount: workflows.length,
  };

  console.log("Electron legacy surface audit");
  console.log(JSON.stringify(summary, null, 2));

  console.log("");
  console.log(`Electron entrypoints (${entrypoints.length})`);
  if (entrypoints.length === 0) {
    console.log("  none");
  } else {
    for (const file of entrypoints) {
      console.log(`  - ${file}`);
    }
  }

  console.log("");
  for (const { label } of IMPORT_PATTERNS) {
    const findings = imports[label];
    console.log(`${label} references (${findings.length})`);
    if (findings.length === 0) {
      console.log("  none");
      console.log("");
      continue;
    }

    for (const finding of findings) {
      console.log(`  - ${finding.file}`);
      for (const match of finding.matches) {
        console.log(`    ${match.line}: ${match.text}`);
      }
    }
    console.log("");
  }

  console.log(`Electron package scripts (${scripts.length})`);
  if (scripts.length === 0) {
    console.log("  none");
  } else {
    for (const script of scripts) {
      console.log(`  - ${script.name}: ${script.command}`);
    }
  }

  console.log("");
  console.log(`Workflow electron references (${workflows.length})`);
  if (workflows.length === 0) {
    console.log("  none");
  } else {
    for (const workflow of workflows) {
      console.log(`  - ${workflow.file}`);
      for (const match of workflow.matches) {
        console.log(`    ${match.line}: ${match.text}`);
      }
    }
  }
}

main();
