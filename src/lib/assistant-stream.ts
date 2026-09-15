// Wire format for POST /api/assistant/chat. Each line is one JSON event so the
// client can show tool activity during the silent stretches between text
// deltas. This module is shared by the route and the browser, so it must stay
// free of server-only imports.

import { z } from "zod";

export const ASSISTANT_STREAM_CONTENT_TYPE = "application/x-ndjson";

const finishReasonSchema = z.enum([
  "stop",
  "length",
  "content-filter",
  "tool-calls",
  "error",
  "other",
]);

export type AssistantFinishReason = z.infer<typeof finishReasonSchema>;

const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool"),
    id: z.string(),
    name: z.string(),
    status: z.enum(["running", "done"]),
  }),
  z.object({ type: z.literal("title"), title: z.string() }),
  z.object({ type: z.literal("finish"), finishReason: finishReasonSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type AssistantStreamEvent = z.infer<typeof eventSchema>;

export function encodeAssistantEvent(event: AssistantStreamEvent) {
  return `${JSON.stringify(event)}\n`;
}

// Incremental line parser. Network chunks split events at arbitrary bytes, so
// callers feed every chunk to push() and call flush() once the stream ends.
export function createAssistantEventParser() {
  let buffer = "";

  function parseLine(line: string): AssistantStreamEvent | null {
    const trimmed = line.trim();

    if (!trimmed) return null;

    try {
      const parsed = eventSchema.safeParse(JSON.parse(trimmed));

      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      return lines.flatMap((line) => {
        const event = parseLine(line);

        return event ? [event] : [];
      });
    },
    flush() {
      const event = parseLine(buffer);
      buffer = "";

      return event ? [event] : [];
    },
  };
}
