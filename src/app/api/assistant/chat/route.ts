import { NextRequest } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { getChatModel, SYSTEM_PROMPT } from "@/lib/ai";
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
import { assessFederalTaxFiling } from "@/lib/tax-copilot";

const logger = createLogger("assistant-chat");

const requestSchema = z.object({
  conversationId: z.string().optional().nullable(),
  llcId: z.string().optional(),
  message: z.string().trim().min(1).max(20_000),
  secureEntityContext: z
    .object({
      ein: z.string().max(30).optional().nullable(),
      registeredAgent: z.string().max(300).optional().nullable(),
      members: z
        .array(
          z.object({
            name: z.string().max(200),
            ownershipPct: z.number().min(0).max(100),
            country: z.string().max(100),
            taxIdType: z.string().max(100),
            usTaxStatus: z.enum(["us_person", "foreign_person"]).optional(),
          })
        )
        .max(100)
        .optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);

  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;

    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return new Response("A valid message and entity context are required", {
        status: 400,
      });
    }

    const { conversationId, llcId, message, secureEntityContext } = parsed.data;
    const llcAccess = llcId ? await getLlcAccess(session.user.id, llcId) : null;

    if (llcId && !llcAccess) {
      return new Response("LLC not found", { status: 404 });
    }

    await seedOfficialKnowledge();

    const conversation = await ensureConversation({
      userId: session.user.id,
      llcId,
      conversationId: conversationId ?? undefined,
      titleSeed: message,
    });

    await createMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
    });

    const history = await getConversationMessages(conversation.id);

    const priorMessages = history.map((entry) => ({
      role: entry.role,
      content: entry.content ?? "",
    }));

    const retrieval = isFeatureFlagEnabled("assistantRetrieval")
      ? await searchKnowledgeBase({
          query: message,
          llcId,
          limit: 4,
        })
      : [];

    const retrievalCitations = retrieval.map(toCitation);

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

    const filingAssessment = llcAccess
      ? assessFederalTaxFiling({
          ...llcAccess.llc,
          ein: secureEntityContext?.ein ?? llcAccess.llc.ein,
          members: secureEntityContext?.members ?? llcAccess.llc.members,
        })
      : null;

    const filingContext = filingAssessment
      ? `Saved-profile federal filing assessment:\n${JSON.stringify(filingAssessment)}\nUse this assessment instead of asking the user to repeat saved profile facts. Clearly distinguish likely filing triggers from confirmed transaction facts.`
      : "No LLC-specific filing assessment is available.";

    const assessmentCitations =
      filingAssessment?.sources.map((source) => ({
        label: source.title,
        sourceType: "irs" as const,
        sourceTitle: source.title,
        excerpt: filingAssessment.summary.slice(0, 240),
        section: source.section,
        sourceUrl: source.url,
        revision: source.revision,
      })) ?? [];

    const citations = [...retrievalCitations, ...assessmentCitations].filter(
      (citation, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.sourceTitle === citation.sourceTitle &&
            candidate.section === citation.section
        ) === index
    );

    const tools = createAssistantTools(
      session.user.id,
      llcId,
      secureEntityContext
    );

    const result = streamText({
      model: await getChatModel(),
      system: `${SYSTEM_PROMPT}\n\n${filingContext}\n\n${finalRetrievalContext}`,
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
      error: error instanceof Error ? error : String(error),
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
