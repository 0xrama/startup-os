import { NextRequest } from "next/server";
import { streamText } from "ai";
import { model, SYSTEM_PROMPT } from "@/lib/ai";
import { createAssistantTools } from "@/lib/ai-tools";
import { seedOfficialKnowledge } from "@/lib/document-intelligence";
import {
  createMessage,
  ensureConversation,
  getConversationMessages,
} from "@/lib/assistant-store";
import { getLlcAccess } from "@/lib/access";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";
import { incrementMetric } from "@/lib/metrics";
import { resolveRequestId } from "@/lib/request-context";
import { searchKnowledgeBase, toCitation } from "@/lib/knowledge";
import { requireApiContext } from "@/lib/route-guards";

const logger = createLogger("assistant-chat");

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const context = await requireApiContext({ feature: "assistant" });
    if ("response" in context) return context.response;
    const { session } = context;

    const { conversationId, llcId, message } = await request.json();

    if (!message?.trim()) {
      return new Response("Message is required", { status: 400 });
    }

    if (llcId) {
      const llcAccess = await getLlcAccess(session.user.id, llcId);
      if (!llcAccess) {
        return new Response("LLC not found", { status: 404 });
      }
    }

    await seedOfficialKnowledge();

    const conversation = await ensureConversation({
      userId: session.user.id,
      llcId,
      conversationId,
      titleSeed: message,
    });

    await createMessage({
      conversationId: conversation.id,
      role: "user",
      content: message.trim(),
    });

    const history = await getConversationMessages(conversation.id);
    const priorMessages = history.map((entry) => ({
      role: entry.role as "user" | "assistant",
      content: entry.content ?? "",
    }));

    const retrieval = isFeatureFlagEnabled("assistantRetrieval")
      ? await searchKnowledgeBase({
          query: message,
          llcId,
          limit: 4,
        })
      : [];
    const citations = retrieval.map(toCitation);
    const localRetrievalContext = retrieval.length
      ? `Relevant source-backed context:\n${retrieval
          .map(
            (item, index) =>
              `[${index + 1}] ${JSON.stringify(item.metadata)}\n${item.content}`
          )
          .join(
            "\n\n"
          )}\nAlways cite the supporting source when using this context.`
      : "";
    const finalRetrievalContext =
      localRetrievalContext ||
      "No source-backed context was retrieved for this message. Be conservative and say when guidance is not source-backed.";

    const tools = createAssistantTools(session.user.id, llcId);

    const result = streamText({
      model,
      system: `${SYSTEM_PROMPT}\n\n${finalRetrievalContext}`,
      messages: priorMessages,
      tools,
      onFinish: async (event) => {
        await createMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: event.text,
          requestId,
          model: event.model.modelId,
          finishReason: event.finishReason,
          toolCalls: event.toolCalls,
          toolResults: event.toolResults,
          citations,
        });
        incrementMetric("assistant_streams_total");
      },
    });

    const response = result.toTextStreamResponse({
      headers: {
        "x-conversation-id": conversation.id,
        "x-request-id": requestId,
      },
    });

    incrementMetric("assistant_requests_total");
    return response;
  } catch (error) {
    incrementMetric("assistant_errors_total");
    logger.error("Assistant request failed", {
      requestId,
      error,
    });
    return new Response(
      error instanceof Error ? error.message : "Assistant error",
      {
        status: 500,
        headers: { "x-request-id": requestId },
      }
    );
  }
}
