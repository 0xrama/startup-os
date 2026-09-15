import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { tool } from "ai";
import { MockLanguageModelV3, convertArrayToReadableStream } from "ai/test";
import { z } from "zod";
import {
  handleAssistantChat,
  assistantChatServices,
} from "@/lib/assistant-chat";
import {
  ASSISTANT_STREAM_CONTENT_TYPE,
  createAssistantEventParser,
  type AssistantStreamEvent,
} from "@/lib/assistant-stream";
import { AI_MAX_OUTPUT_TOKENS, AI_MAX_STEPS } from "@/lib/ai-limits";
import type { createAssistantTools } from "@/lib/ai-tools";

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
  generateConversationTitle: vi.fn(),
  renameConversation: vi.fn(),
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function answerStream(
  text = "Your next deadline is April 15.",
  finishReason: "stop" | "length" = "stop"
) {
  return {
    stream: convertArrayToReadableStream([
      { type: "text-start" as const, id: "answer" },
      { type: "text-delta" as const, id: "answer", delta: text },
      { type: "text-end" as const, id: "answer" },
      {
        type: "finish" as const,
        finishReason: { unified: finishReason, raw: finishReason },
        usage,
      },
    ]),
  };
}

function toolStream(toolName = "getDeadline", toolCallId = "call-1") {
  return {
    stream: convertArrayToReadableStream([
      {
        type: "tool-call" as const,
        toolCallId,
        toolName,
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

type ChatRequestBody = {
  conversationId?: string;
  message?: string;
  regenerate?: boolean;
};

function request(
  body: ChatRequestBody = { message: "What is my next deadline?" }
) {
  return rawRequest(JSON.stringify(body));
}

function rawRequest(body: string) {
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

async function readEvents(response: Response) {
  const parser = createAssistantEventParser();
  const events: AssistantStreamEvent[] = parser.push(await response.text());

  return [...events, ...parser.flush()];
}

function textOf(events: AssistantStreamEvent[]) {
  return events
    .flatMap((event) => (event.type === "text" ? [event.text] : []))
    .join("");
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
  mocks.generateConversationTitle.mockResolvedValue(null);
  mocks.renameConversation.mockResolvedValue({});
});

describe("assistant chat", () => {
  it("executes a tool, streams tool activity and text, and saves the answer", async () => {
    const execute = vi.fn().mockResolvedValue({ dueDate: "2026-04-15" });
    mocks.createAssistantTools.mockReturnValue({
      getDeadline: tool({ inputSchema: z.object({}), execute }),
    });

    const model = new MockLanguageModelV3({
      doStream: [toolStream(), answerStream()],
    });

    mocks.getChatModel.mockResolvedValue(model);

    const response = await POST(request());
    expect(response.headers.get("Content-Type")).toBe(
      ASSISTANT_STREAM_CONTENT_TYPE
    );
    expect(response.headers.get("x-conversation-id")).toBe("conversation-1");

    const events = await readEvents(response);

    expect(events).toEqual([
      { type: "tool", id: "call-1", name: "getDeadline", status: "running" },
      { type: "tool", id: "call-1", name: "getDeadline", status: "done" },
      { type: "text", text: "Your next deadline is April 15." },
      { type: "finish", finishReason: "stop" },
    ]);
    expect(execute).toHaveBeenCalledOnce();
    expect(model.doStreamCalls).toHaveLength(2);
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(AI_MAX_OUTPUT_TOKENS);
    expect(model.doStreamCalls[0].abortSignal).toBeDefined();
    expect(mocks.seedOfficialKnowledge).not.toHaveBeenCalled();
    expect(mocks.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: "assistant",
        content: "Your next deadline is April 15.",
        finishReason: "stop",
        citations: [],
      })
    );
  });

  it("reports a length finish so the client can offer to continue", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({
        doStream: answerStream("Step one of the walkthrough", "length"),
      })
    );

    const events = await readEvents(await POST(request()));

    expect(events.at(-1)).toEqual({ type: "finish", finishReason: "length" });
  });

  it("passes registered citation markers to tools and keeps only cited sources", async () => {
    let registered: string | undefined;

    mocks.createAssistantTools.mockImplementation(
      (...args: Parameters<typeof createAssistantTools>) => {
        const options = args[4];

        if (!options?.registerCitation) {
          throw new Error("registerCitation was not passed to the tools");
        }

        registered = options.registerCitation({
          label: "Form 5472 instructions",
          sourceType: "irs",
          sourceTitle: "Form 5472 instructions",
          excerpt: "Reportable transactions include...",
        });
        options.registerCitation({
          label: "Publication 583",
          sourceType: "irs",
          sourceTitle: "Publication 583",
          excerpt: "Recordkeeping...",
        });

        return {};
      }
    );

    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({
        doStream: answerStream("Contributions are reportable [1]."),
      })
    );

    const events = await readEvents(await POST(request()));

    expect(registered).toBe("[1]");
    expect(textOf(events)).toBe("Contributions are reportable [1].");
    expect(mocks.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: "Contributions are reportable [1].",
        citations: [
          expect.objectContaining({
            label: "[1]",
            sourceTitle: "Form 5472 instructions",
          }),
        ],
      })
    );
  });

  it("names a new conversation from its first exchange and streams the title", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({ doStream: answerStream() })
    );
    mocks.generateConversationTitle.mockResolvedValue("Next filing deadline");

    const events = await readEvents(await POST(request()));

    expect(mocks.generateConversationTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: "What is my next deadline?",
        assistantMessage: "Your next deadline is April 15.",
      })
    );
    expect(mocks.renameConversation).toHaveBeenCalledWith(
      "user-1",
      "conversation-1",
      "Next filing deadline"
    );
    expect(events).toContainEqual({
      type: "title",
      title: "Next filing deadline",
    });
    // The title arrives before finish so the client can apply both together.
    expect(events.at(-1)).toEqual({ type: "finish", finishReason: "stop" });
  });

  it("does not retitle an existing conversation", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({ doStream: answerStream() })
    );

    await readEvents(
      await POST(
        request({
          conversationId: "conversation-1",
          message: "And after that?",
        })
      )
    );

    expect(mocks.generateConversationTitle).not.toHaveBeenCalled();
  });

  it("still finishes the answer when title generation fails", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({ doStream: answerStream() })
    );
    mocks.generateConversationTitle.mockRejectedValue(new Error("quota"));

    const events = await readEvents(await POST(request()));

    expect(events.at(-1)).toEqual({ type: "finish", finishReason: "stop" });
    expect(mocks.createMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "assistant" })
    );
  });

  it("regenerates the last unanswered user turn without saving it again", async () => {
    mocks.getConversationContext.mockResolvedValue([
      { role: "user", content: "Earlier question" },
      { role: "assistant", content: "Earlier answer" },
      { role: "user", content: "Which form applies to me?" },
    ]);
    const model = new MockLanguageModelV3({ doStream: answerStream() });
    mocks.getChatModel.mockResolvedValue(model);

    const events = await readEvents(
      await POST(
        request({ conversationId: "conversation-1", regenerate: true })
      )
    );

    expect(textOf(events)).toBe("Your next deadline is April 15.");
    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
    expect(mocks.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "assistant" })
    );
    // The model sees the saved history as-is; the question is not duplicated.
    expect(
      model.doStreamCalls[0].prompt.filter((m) => m.role === "user")
    ).toHaveLength(2);
  });

  it("refuses to regenerate when the last turn is already answered", async () => {
    mocks.getConversationContext.mockResolvedValue([
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ]);
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({ doStream: answerStream() })
    );

    const response = await POST(
      request({ conversationId: "conversation-1", regenerate: true })
    );

    expect(response.status).toBe(409);
    expect(mocks.createMessage).not.toHaveBeenCalled();
  });

  it("rejects a regenerate without a conversation", async () => {
    const response = await POST(request({ regenerate: true }));
    expect(response.status).toBe(400);
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
        ...Array.from({ length: AI_MAX_STEPS - 1 }, (_, index) =>
          toolStream("getDeadline", `call-${index}`)
        ),
        answerStream(),
      ],
    });

    mocks.getChatModel.mockResolvedValue(model);
    const response = await POST(request());
    await response.text();
    expect(model.doStreamCalls).toHaveLength(AI_MAX_STEPS);
    expect(model.doStreamCalls.at(-1)?.toolChoice).toEqual({ type: "none" });
  });

  it("emits an error event on provider errors without saving an empty answer", async () => {
    mocks.getChatModel.mockResolvedValue(
      new MockLanguageModelV3({
        doStream: {
          stream: convertArrayToReadableStream([
            { type: "error", error: new Error("private provider payload") },
          ]),
        },
      })
    );
    const events = await readEvents(await POST(request()));

    expect(events).toEqual([
      {
        type: "error",
        message: "Assistant response interrupted. Please retry.",
      },
    ]);
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
    const response = await POST(rawRequest("{"));
    expect(response.status).toBe(400);
  });
});
