import { describe, expect, it, vi } from "vitest";

const logSpies = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
}));

vi.mock("electron-log", () => ({
  default: {
    scope: () => ({
      warn: logSpies.warn,
    }),
    debug: logSpies.debug,
  },
}));

import { sendTelemetryEvent } from "@/ipc/utils/telemetry";
import { safeSend } from "@/ipc/utils/safe_sender";

describe("safeSend", () => {
  it("sends through to an alive sender", () => {
    const send = vi.fn();
    const sender = {
      isDestroyed: () => false,
      send,
    };

    safeSend(sender, "chat:response:chunk", { text: "hello" });

    expect(send).toHaveBeenCalledWith("chat:response:chunk", {
      text: "hello",
    });
  });

  it("skips destroyed or crashed senders", () => {
    const destroyedSend = vi.fn();
    safeSend(
      {
        isDestroyed: () => true,
        send: destroyedSend,
      },
      "chat:response:chunk",
      { text: "ignored" },
    );

    const crashedSend = vi.fn();
    safeSend(
      {
        isDestroyed: () => false,
        isCrashed: () => true,
        send: crashedSend,
      },
      "chat:response:chunk",
      { text: "ignored" },
    );

    expect(destroyedSend).not.toHaveBeenCalled();
    expect(crashedSend).not.toHaveBeenCalled();
  });
});

describe("sendTelemetryEvent", () => {
  it("sends a telemetry payload through the provided sender", () => {
    const send = vi.fn();
    const sender = { send };

    sendTelemetryEvent(sender, "search_replace:fix", {
      attemptNumber: 2,
      success: true,
    });

    expect(send).toHaveBeenCalledWith("telemetry:event", {
      eventName: "search_replace:fix",
      properties: {
        attemptNumber: 2,
        success: true,
      },
    });
  });
});
