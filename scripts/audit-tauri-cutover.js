#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function walk(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryRelativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(entryRelativePath));
      continue;
    }
    files.push(entryRelativePath);
  }

  return files;
}

function extractBalancedCallBlocks(source, callName) {
  const blocks = [];
  const token = `${callName}(`;
  let searchIndex = 0;

  while (searchIndex < source.length) {
    const callIndex = source.indexOf(token, searchIndex);
    if (callIndex === -1) {
      break;
    }

    let index = callIndex + token.length;
    let depth = 1;
    let inString = false;
    let stringQuote = "";
    let inLineComment = false;
    let inBlockComment = false;

    while (index < source.length && depth > 0) {
      const char = source[index];
      const nextChar = source[index + 1];
      const previousChar = source[index - 1];

      if (inLineComment) {
        if (char === "\n") {
          inLineComment = false;
        }
        index += 1;
        continue;
      }

      if (inBlockComment) {
        if (char === "*" && nextChar === "/") {
          inBlockComment = false;
          index += 2;
          continue;
        }
        index += 1;
        continue;
      }

      if (inString) {
        if (char === stringQuote && previousChar !== "\\") {
          inString = false;
          stringQuote = "";
        }
        index += 1;
        continue;
      }

      if (char === "/" && nextChar === "/") {
        inLineComment = true;
        index += 2;
        continue;
      }

      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        index += 2;
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        inString = true;
        stringQuote = char;
        index += 1;
        continue;
      }

      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
      }

      index += 1;
    }

    blocks.push(source.slice(callIndex, index));
    searchIndex = index;
  }

  return blocks;
}

function extractAllChannels(block) {
  return [...block.matchAll(/channel:\s*"([^"]+)"/g)].map((match) => match[1]);
}

function toSortedArray(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function diff(leftValues, rightValues) {
  const rightSet = new Set(rightValues);
  return leftValues.filter((value) => !rightSet.has(value));
}

function extractContracts() {
  const typeFiles = walk("src/ipc/types").filter(
    (file) => file.endsWith(".ts") && !file.endsWith("index.ts"),
  );

  const invokeChannels = new Set();
  const receiveChannels = new Set();

  for (const relativePath of typeFiles) {
    const source = read(relativePath);

    for (const block of extractBalancedCallBlocks(source, "defineContract")) {
      const channel = extractAllChannels(block)[0];
      if (channel) {
        invokeChannels.add(channel);
      }
    }

    for (const block of extractBalancedCallBlocks(source, "defineEvent")) {
      const channel = extractAllChannels(block)[0];
      if (channel) {
        receiveChannels.add(channel);
      }
    }

    for (const block of extractBalancedCallBlocks(source, "defineStream")) {
      const channels = extractAllChannels(block);
      if (channels.length === 0) {
        continue;
      }
      invokeChannels.add(channels[0]);
      for (const eventChannel of channels.slice(1)) {
        receiveChannels.add(eventChannel);
      }
    }
  }

  return {
    invokeChannels: toSortedArray(invokeChannels),
    receiveChannels: toSortedArray(receiveChannels),
  };
}

function extractPreloadOnlyTestChannels() {
  const source = read("src/ipc/preload/channels.ts");
  const match = source.match(
    /const TEST_INVOKE_CHANNELS = \[([\s\S]*?)\] as const;/,
  );

  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/"([^"]+)"/g)]
    .map((result) => result[1])
    .sort((left, right) => left.localeCompare(right));
}

function extractTauriMappings() {
  const source = read("src/ipc/runtime/core_domain_channels.ts");
  const objectMatch = source.match(
    /export const TAURI_MIGRATION_CHANNEL_TO_COMMAND = \{([\s\S]*?)\} as const;/,
  );
  const eventArrayMatch = source.match(
    /export const TAURI_MIGRATION_EVENT_CHANNELS = \[([\s\S]*?)\] as const;/,
  );

  if (!objectMatch || !eventArrayMatch) {
    throw new Error("Failed to parse Tauri migration channel definitions.");
  }

  const invokeMappings = [...objectMatch[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)];
  const eventChannels = [...eventArrayMatch[1].matchAll(/"([^"]+)"/g)].map(
    (match) => match[1],
  );

  const channelToCommand = Object.fromEntries(
    invokeMappings.map((match) => [match[1], match[2]]),
  );

  return {
    invokeChannels: Object.keys(channelToCommand).sort((left, right) =>
      left.localeCompare(right),
    ),
    receiveChannels: eventChannels.sort((left, right) => left.localeCompare(right)),
    commands: Object.values(channelToCommand).sort((left, right) =>
      left.localeCompare(right),
    ),
    channelToCommand,
  };
}

function extractRustInvokeHandlers() {
  const source = read("src-tauri/src/lib.rs");
  const handlerMatch = source.match(
    /invoke_handler\(tauri::generate_handler!\[([\s\S]*?)\]\)/,
  );

  if (!handlerMatch) {
    throw new Error("Failed to parse Rust invoke handler list.");
  }

  const handlerNames = [...handlerMatch[1].matchAll(/\b[A-Za-z0-9_]+::([A-Za-z0-9_]+)\b/g)]
    .map((match) => match[1])
    .sort((left, right) => left.localeCompare(right));

  return handlerNames;
}

function printSection(title, values) {
  console.log(`\n${title} (${values.length})`);
  if (values.length === 0) {
    console.log("  none");
    return;
  }

  for (const value of values) {
    console.log(`  - ${value}`);
  }
}

function main() {
  const contracts = extractContracts();
  const preloadOnlyTestChannels = extractPreloadOnlyTestChannels();
  const tauri = extractTauriMappings();
  const rustInvokeHandlers = extractRustInvokeHandlers();

  const missingInvokeMappings = diff(
    contracts.invokeChannels,
    tauri.invokeChannels,
  );
  const missingReceiveMappings = diff(
    contracts.receiveChannels,
    tauri.receiveChannels,
  );
  const mappedButUncontractedInvokeChannels = diff(
    tauri.invokeChannels,
    contracts.invokeChannels,
  );
  const mappedButUncontractedReceiveChannels = diff(
    tauri.receiveChannels,
    contracts.receiveChannels,
  );
  const missingRustHandlers = diff(tauri.commands, rustInvokeHandlers);
  const unreferencedRustHandlers = diff(rustInvokeHandlers, tauri.commands);

  const summary = {
    contractInvokeCount: contracts.invokeChannels.length,
    contractReceiveCount: contracts.receiveChannels.length,
    tauriInvokeCount: tauri.invokeChannels.length,
    tauriReceiveCount: tauri.receiveChannels.length,
    rustInvokeHandlerCount: rustInvokeHandlers.length,
    preloadOnlyTestInvokeChannels: preloadOnlyTestChannels.length,
    missingInvokeMappings: missingInvokeMappings.length,
    missingReceiveMappings: missingReceiveMappings.length,
    missingRustHandlers: missingRustHandlers.length,
  };

  console.log("Tauri cutover audit");
  console.log(JSON.stringify(summary, null, 2));

  printSection("Preload-only test invoke channels", preloadOnlyTestChannels);
  printSection("Contract invoke channels missing from Tauri mapping", missingInvokeMappings);
  printSection(
    "Contract receive channels missing from Tauri mapping",
    missingReceiveMappings,
  );
  printSection(
    "Mapped invoke channels without a contract definition",
    mappedButUncontractedInvokeChannels,
  );
  printSection(
    "Mapped receive channels without a contract definition",
    mappedButUncontractedReceiveChannels,
  );
  printSection("Mapped Tauri commands missing from Rust invoke handler", missingRustHandlers);
  printSection(
    "Rust invoke handlers not referenced by the renderer Tauri mapping",
    unreferencedRustHandlers,
  );

  if (
    missingInvokeMappings.length > 0 ||
    missingReceiveMappings.length > 0 ||
    missingRustHandlers.length > 0
  ) {
    process.exitCode = 1;
  }
}

main();
