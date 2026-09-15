import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { getChatModel } from "@/lib/ai-config";
import { getDb } from "@/lib/db";

const findFirst = vi.fn();

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", "postgres://test:test@127.0.0.1:1/test");
  vi.spyOn(getDb().query.appSettings, "findFirst").mockImplementation(
    findFirst
  );
  findFirst.mockResolvedValue({
    aiBaseUrl: "http://localhost:11434/v1/",
    aiModel: "local-test",
    aiApiKey: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("OpenAI-compatible provider", () => {
  it("uses chat completions rather than the Responses API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "test",
          object: "chat.completion",
          created: 1,
          model: "local-test",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Works" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
        { headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await generateText({
      model: await getChatModel(),
      prompt: "Hello",
    });

    expect(result.text).toBe("Works");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:11434/v1/chat/completions"
    );
  });

  it("rejects missing OpenAI credentials", async () => {
    findFirst.mockResolvedValue(undefined);
    vi.stubEnv("AI_BASE_URL", "");
    vi.stubEnv("AI_API_KEY", "");
    await expect(getChatModel()).rejects.toThrow("AI provider not configured");
  });
});
