import { describe, expect, it } from "vitest";
import {
  AI_MAX_HISTORY_CHARS,
  AI_MAX_HISTORY_MESSAGES,
  selectChatContext,
} from "@/lib/ai-limits";
import { getSystemPrompt } from "@/lib/ai";

describe("chat context", () => {
  it("keeps recent complete turns within the message limit", () => {
    const history = Array.from({ length: 100 }, (_, index) => ({
      role: index % 2 ? ("user" as const) : ("assistant" as const),
      content: `message ${index}`,
    }));

    const context = selectChatContext(history);
    expect(context.length).toBeLessThanOrEqual(AI_MAX_HISTORY_MESSAGES);
    expect(context[0].role).toBe("user");
    expect(context.at(-1)?.content).toBe("message 99");
  });

  it("never splits old facts to meet the character budget", () => {
    const context = selectChatContext([
      { role: "user", content: "x".repeat(AI_MAX_HISTORY_CHARS) },
      { role: "assistant", content: "Old reply" },
      { role: "user", content: "Latest question" },
    ]);

    expect(context).toEqual([{ role: "user", content: "Latest question" }]);
  });

  it("skips empty failed assistant turns", () => {
    expect(
      selectChatContext([
        { role: "user", content: "hello" },
        { role: "assistant", content: null },
      ])
    ).toEqual([{ role: "user", content: "hello" }]);
  });
});

describe("system prompt selection", () => {
  it("does not send both tax manuals for unrelated questions", () => {
    const base = getSystemPrompt("Hello");
    expect(getSystemPrompt("Hello", "partnership").length).toBeGreaterThan(
      base.length
    );
    expect(getSystemPrompt("Explain Form 5472").length).toBeGreaterThan(
      base.length
    );
    expect(getSystemPrompt("Compare 1065 and 5472").length).toBeGreaterThan(
      getSystemPrompt("Explain Form 5472").length
    );
  });
});
