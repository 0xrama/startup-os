import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureConversation,
  getConversationContext,
  getConversationMessages,
} from "@/lib/assistant-store";
import { AI_MAX_HISTORY_MESSAGES } from "@/lib/ai-limits";
import { getDb } from "@/lib/db";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
  vi.spyOn(getDb().query.chatConversations, "findFirst").mockImplementation(
    mocks.findFirst
  );
  vi.spyOn(getDb(), "select").mockImplementation(mocks.select);
  mocks.select.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ orderBy: mocks.orderBy });
  mocks.orderBy.mockReturnValue({ limit: mocks.limit });
});

describe("assistant storage", () => {
  it("paginates visible history and exposes whether older messages remain", async () => {
    mocks.limit.mockResolvedValue([
      { id: "new" },
      { id: "older" },
      { id: "oldest" },
    ]);
    expect(await getConversationMessages("thread-1", { limit: 2 })).toEqual({
      messages: [{ id: "older" }, { id: "new" }],
      hasMore: true,
    });
    expect(mocks.limit).toHaveBeenCalledWith(3);
  });

  it("loads only bounded context columns and returns chronological order", async () => {
    mocks.limit.mockResolvedValue([
      { role: "user", content: "latest" },
      { role: "assistant", content: "earlier" },
    ]);
    expect(await getConversationContext("thread-1")).toEqual([
      { role: "assistant", content: "earlier" },
      { role: "user", content: "latest" },
    ]);
    expect(mocks.limit).toHaveBeenCalledWith(AI_MAX_HISTORY_MESSAGES);
    expect(Object.keys(mocks.select.mock.calls[0][0])).toEqual([
      "role",
      "content",
    ]);
  });

  it("rejects conversation reuse under another entity", async () => {
    mocks.findFirst.mockResolvedValue({ id: "thread-1", llcId: "llc-other" });
    await expect(
      ensureConversation({
        userId: "user-1",
        llcId: "llc-1",
        conversationId: "thread-1",
      })
    ).rejects.toThrow("NOT_FOUND");
  });
});
