import log from "electron-log";
import fs from "node:fs";

export type AppLogger = ReturnType<typeof log.scope>;

export const appLog = log;

export function createLogger(scopeName: string): AppLogger {
  return log.scope(scopeName);
}

export function getLogFilePath(): string | undefined {
  try {
    return log.transports.file.getFile().path;
  } catch {
    return undefined;
  }
}

export function readLogTail(
  linesOfLogs: number,
  level: "warn" | "info",
): string {
  const logFilePath = getLogFilePath();
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    return "";
  }

  const logContent = fs.readFileSync(logFilePath, "utf8");
  const logLines = logContent.split("\n").filter((line) => {
    if (level === "info") return true;
    const logLevelRegex = /\[.*?\] \[(\w+)\]/;
    const match = line.match(logLevelRegex);
    if (!match) return true;
    const logLevel = match[1];
    if (level === "warn") {
      return logLevel === "warn" || logLevel === "error";
    }
    return true;
  });

  return logLines.slice(-linesOfLogs).join("\n");
}
