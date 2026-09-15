import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { tool } from "ai";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";
import { z } from "zod";
import {
  handleAssistantChat,
  assistantChatServices,
} from "@/lib/assistant-chat";
import { AI_MAX_OUTPUT_TOKENS, AI_MAX_STEPS } from "@/lib/ai-limits";

const mocks = {
  getChatModel: vi.fn(),
  createMessage: vi.fn(),
  ensureConversation: vi.fn(),
  getConversationContext: vi.fn(),
  createAssistantTools: vi.fn(),
  seedOfficialKnowledge: vi.fn(),
  searchKnowledgeBase: vi.fn(),
  isFeatureFlagEnabled: vi.fn(),
  requireApiContext: vi.fn(),
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function answerStream() {
  return {
    stream: convertArrayToReadableStream([
      { type: "text-start" as const, id: "answer" },
      {
        type: "text-delta" as const,
        id: "answer",
        delta: "Your next deadline is April 15.",
      },
      { type: "text-end" as const, id: "answer" },
      {
        type: "finish" as const,
        finishReason: { unified: "stop" as const, raw: "stop" },
        usage,
      },
    ]),
  };
}

function toolStream() {
  return {
    stream: convertArrayToReadableStream([
      {
        type: "tool-call" as const,
        toolCallId: crypto.randomUUID(),
        toolName: "getDeadline",
        input: "{}",
      },
      {
        type: "finish" as const,
        finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
        usage,
      },
    ]),
  };
}

function request(
  body = JSON.stringify({ message: "What is my next deadline?" })
) {
  return new NextRequest("http://localhost/api/assistant/chat", {
    method: "POST",
    body,
  });
}

async function POST(request: NextRequest) {
  const response = await handleAssistantChat(request, {
    ...assistantChatServices,
    ...mocks,
  });

  if (!response) throw new Error("Missing route response");

  return response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiContext.mockResolvedValue({
    session: { user: { id: "user-1" } },
  });
  mocks.ensureConversation.mockResolvedValue({ id: "conversation-1" });
  mocks.createMessage.mockResolvedValue({});
  mocks.getConversationContext.mockResolvedValue([
    { role: "user", content: "What is my next deadline?" },
  ]);
  mocks.isFeatureFlagEnabled.mockReturnValue(false);
  mocks.createAssistantTools.mockReturnValue({});
});

describe("assistant chat", () => {
  it("executes a tool, continues the model, streams and saves the answer", async () => {
    const execute = vi.fn().mockResolvedValue({ dueDate: "2026-04-15" });
    mocks.createAssistantTools.mockReturnValue({
      getDeadline: tool({ inputSchema: z.object({}), execute }),
    });

    const model = new MockLanguageModelV3({
      doStream: [toolStream(), answerStream()],
    });

    mocks.getChatModel.mockResolvedValue(model);

    const response = await POST(request());
    expect(await response.text()).toBe("Your next deadline is April 15.");
    expect(response.headers.get("x-conversation-id")).toBe("conversation-1");
    expect(execute).toHaveBeenCalledOnce();
    expect(model.doStreamCalls).toHaveLength(2);
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(AI_MAX_OUTPUT_TOKENS);
    expect(model.doStreamCalls[0].abortSignal).toBeDefined();
    expect(mocks.seedOfficialKnowledge).not.toHaveBeenCalled();
    expect(mocks.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: "assistant",
        content: "Your next deadline is April 15.",
      })
    );
  });

  it("forces a final answer after a bounded number of tool steps", async () => {
    mocks.createAssistantTools.mockReturnValue({
      getDeadline: tool({
        inputSchema: z.object({}),
        execute: async () => ({ date: "April 15" }),
      }),
    });

    const model = new MockLanguageModelV3({
      doStream: [
        ...Array.from({ length: AI_MAX_STEPS - 1 }, toolStream),
        answerStream(),
      ],
    });

    mocks.getChatModel.mockResolvedValue(model);
    const response = await POST(request());
    await response.text();
    expect(model.doStreamCalls).toHaveLength(AI_MAX_STEPS);
    expect(model.doStreamCalls.at(-1)?.toolChoice).toEqual({ type: "none" });
  });

  it("fails the stream on provider errors without saving an empty answer", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({
        doStream: {
          stream: convertArrayToReadableStream([
            { type: "error", error: new Error("private provider payload") },
          ]),
        },
      })
    );
    const response = await POST(request());
    await expect(response.text()).rejects.toThrow(
      "Assistant response interrupted"
    );
    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
  });

  it("does not save a turn when the provider is not configured", async () => {
    mocks.getChatModel.mockRejectedValueOnce(new Error("not configured"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("does not persist a turn when retrieval setup fails", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({
        doStream: answerStream(),
      })
    );
    mocks.isFeatureFlagEnabled.mockReturnValue(true);
    mocks.seedOfficialKnowledge.mockRejectedValue(new Error("database down"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
  });
});
