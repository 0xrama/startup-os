import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { chatConversations, chatMessages } from "./schema";
import type { Citation } from "./knowledge";
import { AI_MAX_HISTORY_MESSAGES } from "./ai-limits";

export const CONVERSATION_TITLE_MAX_CHARS = 80;

// The first user turn seeds the sidebar title until a generated title replaces
// it. Cut on a word boundary so the sidebar shows a phrase, not a fragment.
export function deriveTitleSeed(text: string, maxChars = 60) {
  const firstLine = text.split("\n").find((line) => line.trim()) ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();

  if (collapsed.length <= maxChars) return collapsed || "New conversation";

  const cut = collapsed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");

  return `${lastSpace > maxChars / 2 ? cut.slice(0, lastSpace) : cut}…`;
}

export function normalizeConversationTitle(title: string) {
  return title
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”]+|["'“”.]+$/g, "")
    .slice(0, CONVERSATION_TITLE_MAX_CHARS)
    .trim();
}

export async function getConversationContext(conversationId: string) {
  const messages = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(AI_MAX_HISTORY_MESSAGES);

  return messages.reverse();
}

export async function listConversations(userId: string, llcId?: string) {
  return db
    .select()
    .from(chatConversations)
    .where(
      llcId
        ? and(
            eq(chatConversations.userId, userId),
            eq(chatConversations.llcId, llcId),
            isNull(chatConversations.archivedAt)
          )
        : and(
            eq(chatConversations.userId, userId),
            isNull(chatConversations.archivedAt)
          )
    )
    .orderBy(desc(chatConversations.lastMessageAt));
}

export async function getConversation(userId: string, conversationId: string) {
  return db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, conversationId),
      eq(chatConversations.userId, userId)
    ),
  });
}

export async function getConversationMessages(
  conversationId: string,
  { before, limit = 100 }: { before?: string; limit?: number } = {}
) {
  const pageSize = Math.max(1, Math.min(100, Math.trunc(limit) || 100));

  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      citations: chatMessages.citations,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.conversationId, conversationId),
        before
          ? sql`(${chatMessages.createdAt}, ${chatMessages.id}) < (
        SELECT created_at, id FROM chat_messages
        WHERE id = ${before} AND conversation_id = ${conversationId}
      )`
          : undefined
      )
    )
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(pageSize + 1);

  return {
    messages: rows.slice(0, pageSize).reverse(),
    hasMore: rows.length > pageSize,
  };
}

export async function ensureConversation({
  userId,
  llcId,
  conversationId,
  titleSeed,
}: {
  userId: string;
  llcId?: string;
  conversationId?: string;
  titleSeed?: string;
}) {
  if (conversationId) {
    const existing = await getConversation(userId, conversationId);

    if (!existing || existing.llcId !== (llcId ?? null)) {
      throw new Error("NOT_FOUND");
    }

    return existing;
  }

  const [conversation] = await db
    .insert(chatConversations)
    .values({
      userId,
      llcId: llcId ?? null,
      title: deriveTitleSeed(titleSeed ?? ""),
      lastMessageAt: new Date(),
    })
    .returning();

  return conversation;
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string
) {
  const normalized = normalizeConversationTitle(title);

  if (!normalized) return null;

  const [conversation] = await db
    .update(chatConversations)
    .set({ title: normalized, updatedAt: new Date() })
    .where(
      and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      )
    )
    .returning();

  return conversation ?? null;
}

// Messages cascade from the conversation row (see chat_messages FK).
export async function deleteConversation(
  userId: string,
  conversationId: string
) {
  const deleted = await db
    .delete(chatConversations)
    .where(
      and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      )
    )
    .returning({ id: chatConversations.id });

  return deleted.length > 0;
}

export async function createMessage({
  conversationId,
  role,
  content,
  requestId,
  model,
  finishReason,
  toolCalls,
  toolResults,
  citations,
}: {
  conversationId: string;
  role: "user" | "assistant";
  content?: string;
  requestId?: string;
  model?: string;
  finishReason?: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  citations?: Citation[];
}) {
  const [message] = await db
    .insert(chatMessages)
    .values({
      conversationId,
      role,
      content: content ?? null,
      requestId: requestId ?? null,
      model: model ?? null,
      finishReason: finishReason ?? null,
      toolCalls: toolCalls ?? null,
      toolResults: toolResults ?? null,
      citations: citations ?? null,
    })
    .returning();

  await db
    .update(chatConversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      title:
        role === "user" && content
          ? sql`coalesce(nullif(${chatConversations.title}, ''), ${deriveTitleSeed(content)})`
          : undefined,
    })
    .where(eq(chatConversations.id, conversationId));

  return message;
}
