export const AI_MAX_HISTORY_MESSAGES = 24;

export const AI_MAX_HISTORY_CHARS = 32_000;

export const AI_MAX_OUTPUT_TOKENS = 4_096;

export const AI_MAX_STEPS = 5;

export const AI_TIMEOUT_MS = 180_000;

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;

export const DOCUMENT_MAX_TEXT_CHARS = 120_000;

export function selectChatContext(
  messages: { role: "user" | "assistant"; content: string | null }[]
) {
  const selected: { role: "user" | "assistant"; content: string }[] = [];
  let remaining = AI_MAX_HISTORY_CHARS;

  for (const message of messages.slice(-AI_MAX_HISTORY_MESSAGES).reverse()) {
    if (!message.content) continue;

    if (message.content.length > remaining) break;
    selected.push({ role: message.role, content: message.content });
    remaining -= message.content.length;
  }

  selected.reverse();

  while (selected[0]?.role === "assistant") selected.shift();

  return selected;
}
