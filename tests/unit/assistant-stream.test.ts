import { describe, expect, it } from "vitest";
import {
  createAssistantEventParser,
  encodeAssistantEvent,
} from "@/lib/assistant-stream";
import { createAssistantTools } from "@/lib/ai-tools";
import { TOOL_ACTIVITY_LABELS } from "@/components/dashboard/assistant/tool-labels";

describe("assistant event parser", () => {
  it("reassembles events split across chunks and keeps newlines inside text", () => {
    const parser = createAssistantEventParser();

    const encoded =
      encodeAssistantEvent({ type: "text", text: "line one\nline two" }) +
      encodeAssistantEvent({ type: "finish", finishReason: "stop" });

    const split = Math.floor(encoded.length / 3);

    const events = [
      ...parser.push(encoded.slice(0, split)),
      ...parser.push(encoded.slice(split, split * 2)),
      ...parser.push(encoded.slice(split * 2)),
      ...parser.flush(),
    ];

    expect(events).toEqual([
      { type: "text", text: "line one\nline two" },
      { type: "finish", finishReason: "stop" },
    ]);
  });

  it("delivers a trailing event without a newline on flush", () => {
    const parser = createAssistantEventParser();

    expect(parser.push('{"type":"title","title":"EIN by fax"}')).toEqual([]);
    expect(parser.flush()).toEqual([{ type: "title", title: "EIN by fax" }]);
    expect(parser.flush()).toEqual([]);
  });

  it("skips blank and malformed lines instead of throwing", () => {
    const parser = createAssistantEventParser();

    expect(
      parser.push('\n\nnot json\n{"nope":1}\n{"type":"text","text":"ok"}\n')
    ).toEqual([{ type: "text", text: "ok" }]);
  });
});

describe("tool activity labels", () => {
  it("names every assistant tool", () => {
    const toolNames = Object.keys(createAssistantTools("user-1"));

    expect(toolNames.length).toBeGreaterThan(0);
    expect(Object.keys(TOOL_ACTIVITY_LABELS).sort()).toEqual(toolNames.sort());
  });
});
