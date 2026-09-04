import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { chatConversations, chatMessages } from "./schema";
import type { Citation } from "./knowledge";

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

export async function getConversationMessages(conversationId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);
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
    if (!existing) {
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
  role: string;
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

  const conversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, conversationId),
    columns: { title: true },
  });

  await db
    .update(chatConversations)
    .set({
      lastMessageAt: new Date(),
      updatedAt: new Date(),
      title:
        role === "user" && content && !conversation?.title
          ? content.slice(0, 80)
          : undefined,
    })
    .where(eq(chatConversations.id, conversationId));

  return message;
}
