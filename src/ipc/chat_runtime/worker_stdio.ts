import type { WorkerInboundMessage, WorkerOutboundMessage } from "./types";

const DELIMITER = "\n";

export function serializeWorkerMessage(msg: WorkerOutboundMessage): string {
  return JSON.stringify(msg) + DELIMITER;
}

export function parseWorkerInbound(line: string): WorkerInboundMessage {
  const parsed = JSON.parse(line);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof parsed.type !== "string"
  ) {
    throw new Error(`Invalid worker inbound message: missing "type" field`);
  }
  return parsed as WorkerInboundMessage;
}

export function writeWorkerMessage(
  writeFn: (data: string) => void,
  msg: WorkerOutboundMessage,
): void {
  writeFn(serializeWorkerMessage(msg));
}

export function writeWorkerLog(
  writeFn: (data: string) => void,
  level: "info" | "warn" | "error",
  message: string,
): void {
  writeWorkerMessage(writeFn, { type: "log", level, message });
}
