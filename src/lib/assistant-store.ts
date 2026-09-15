import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { chatConversations, chatMessages } from "./schema";
import type { Citation } from "./knowledge";
import { AI_MAX_HISTORY_MESSAGES } from "./ai-limits";

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
      title: titleSeed?.slice(0, 80) ?? "New conversation",
      lastMessageAt: new Date(),
    })
    .returning();

  return conversation;
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
          ? sql`coalesce(nullif(${chatConversations.title}, ''), ${content.slice(0, 80)})`
          : undefined,
    })
    .where(eq(chatConversations.id, conversationId));

  return message;
}
