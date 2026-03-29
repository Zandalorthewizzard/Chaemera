import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dbMock,
  readSettingsMock,
  getAppPathMock,
  getCurrentCommitHashMock,
  getFileUploadsStateMock,
} = vi.hoisted(() => {
  const dbMock = {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  };

  return {
    dbMock,
    readSettingsMock: vi.fn(),
    getAppPathMock: vi.fn(),
    getCurrentCommitHashMock: vi.fn(),
    getFileUploadsStateMock: vi.fn(),
  };
});

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
    },
  },
}));

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    unlink: vi.fn(),
    writeFile: vi.fn(),
  },
  readFile: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../db", () => ({
  db: dbMock,
}));

vi.mock("../db/schema", () => ({
  chats: {
    id: "chat_id",
    title: "chat_title",
  },
  messages: {
    id: "message_id",
    createdAt: "message_created_at",
  },
  prompts: {
    id: "prompt_id",
  },
}));

vi.mock("../main/settings", () => ({
  readSettings: readSettingsMock,
}));

vi.mock("../paths/paths", () => ({
  getAppPath: getAppPathMock,
}));

vi.mock("../ipc/utils/git_utils", () => ({
  getCurrentCommitHash: getCurrentCommitHashMock,
}));

vi.mock("../ipc/utils/file_uploads_state", () => ({
  FileUploadsState: {
    getInstance: getFileUploadsStateMock,
  },
}));

import { runChatStreamSession } from "../ipc/chat_runtime";

describe("runChatStreamSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    readSettingsMock.mockReturnValue({
      selectedModel: { name: "gemini-2.5-flash" },
      selectedChatMode: "build",
      autoApproveChanges: false,
    });

    getAppPathMock.mockImplementation((appPath: string) => appPath);
    getCurrentCommitHashMock.mockResolvedValue("commit-hash");
    getFileUploadsStateMock.mockReturnValue({
      clear: vi.fn(),
      addFileUpload: vi.fn(),
    });

    dbMock.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    dbMock.update.mockReturnValue({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    });
  });

  it("runs through the extracted runtime without an Electron event object on the test-response path", async () => {
    const chat = {
      id: 1,
      app: {
        id: 10,
        path: "/apps/demo",
        themeId: null,
      },
      messages: [],
    };

    const updatedChat = {
      id: 1,
      app: chat.app,
      messages: [
        {
          id: 101,
          chatId: 1,
          role: "user",
          content: "hello",
        },
        {
          id: 202,
          chatId: 1,
          role: "assistant",
          content: "",
        },
      ],
    };

    dbMock.query.chats.findFirst
      .mockResolvedValueOnce(chat)
      .mockResolvedValueOnce(updatedChat);

    dbMock.insert
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 101 }]),
        })),
      }))
      .mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([
            {
              id: 202,
              role: "assistant",
              content: "",
            },
          ]),
        })),
      }));

    const onStreamStart = vi.fn();
    const onChunk = vi.fn();
    const onEnd = vi.fn();
    const onError = vi.fn();
    const streamTestResponse = vi.fn(async () => "canned response");

    const result = await runChatStreamSession({
      params: {
        chatId: 1,
        prompt: "hello",
        redo: false,
        attachments: [],
        selectedComponents: [],
      },
      onStreamStart,
      onChunk,
      onEnd,
      onError,
      isCancelled: () => false,
      requestAgentToolConsent: vi.fn(),
      requestMcpToolConsent: vi.fn(),
      recordLog: vi.fn(),
      abortSignal: new AbortController().signal,
      getTestResponse: () => "canned response",
      streamTestResponse,
    });

    expect(result).toBe(1);
    expect(onStreamStart).toHaveBeenCalledWith(1);
    expect(onChunk).toHaveBeenCalledWith(1, updatedChat.messages);
    expect(streamTestResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 1,
        testResponse: "canned response",
        updatedChat,
        placeholderMessageId: 202,
      }),
    );
    expect(dbMock.update).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        updatedFiles: false,
      }),
    );
    expect(onError).not.toHaveBeenCalled();
  });
});
