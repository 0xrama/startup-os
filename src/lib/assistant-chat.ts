import { NextRequest } from "next/server";
import { stepCountIs, streamText } from "ai";
import { z } from "zod";
import { getChatModel, getSystemPrompt } from "@/lib/ai";
import { createAssistantTools } from "@/lib/ai-tools";
import { seedOfficialKnowledge } from "@/lib/official-knowledge";
import {
  createMessage,
  ensureConversation,
  getConversationContext,
} from "@/lib/assistant-store";
import { getLlcAccess } from "@/lib/access";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";
import { incrementMetric } from "@/lib/metrics";
import { resolveRequestId } from "@/lib/request-context";
import {
  directIndividualOwnerSchema,
  ownerTaxStatusSchema,
} from "@/lib/ownership-input";
import { searchKnowledgeBase, toCitation } from "@/lib/knowledge";
import { requireApiContext } from "@/lib/route-guards";
import { db } from "@/lib/db";
import { operationEvents } from "@/lib/schema";
import { assessFederalTaxFiling } from "@/lib/tax-copilot";
import {
  AI_MAX_OUTPUT_TOKENS,
  AI_MAX_STEPS,
  AI_TIMEOUT_MS,
  selectChatContext,
} from "@/lib/ai-limits";

const logger = createLogger("assistant-chat");

const PROMPT_VERSION = "1";

// Records anonymous operation facts (model, token counts, status). Never
// message content, so the record is safe to retain for provider evaluation.
export async function recordAssistantOperation(event: {
  status: "success" | "failed";
  requestId: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  try {
    await db.insert(operationEvents).values({
      kind: "assistant.chat",
      status: event.status,
      requestId: event.requestId,
      model: event.model,
      promptVersion: PROMPT_VERSION,
      inputTokens: event.inputTokens,
      outputTokens: event.outputTokens,
    });
  } catch {
    // Operation records must never break the assistant stream.
  }
}

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
          directIndividualOwnerSchema.extend({
            usTaxStatus: ownerTaxStatusSchema.optional(),
          })
        )
        .max(100)
        .optional(),
    })
    .optional(),
});

export const assistantChatServices = {
  getChatModel,
  createAssistantTools,
  seedOfficialKnowledge,
  createMessage,
  ensureConversation,
  getConversationContext,
  getLlcAccess,
  isFeatureFlagEnabled,
  searchKnowledgeBase,
  requireApiContext,
  recordAssistantOperation,
};

export async function handleAssistantChat(
  request: NextRequest,
  services = assistantChatServices
) {
  const {
    getChatModel,
    createAssistantTools,
    seedOfficialKnowledge,
    createMessage,
    ensureConversation,
    getConversationContext,
    getLlcAccess,
    isFeatureFlagEnabled,
    searchKnowledgeBase,
    requireApiContext,
    recordAssistantOperation,
  } = services;

  const requestId = resolveRequestId(request);

  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;

    const parsed = requestSchema.safeParse(
      await request.json().catch(() => null)
    );

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

    // Validate configuration before saving a user turn that cannot be answered.
    const model = await getChatModel();

    const conversation = await ensureConversation({
      userId: session.user.id,
      llcId,
      conversationId: conversationId ?? undefined,
      titleSeed: message,
    });

    const [history, retrieval] = await Promise.all([
      getConversationContext(conversation.id),
      isFeatureFlagEnabled("assistantRetrieval")
        ? seedOfficialKnowledge().then(() =>
            searchKnowledgeBase({
              query: message,
              llcId,
              limit: 4,
            })
          )
        : Promise.resolve([]),
    ]);

    const priorMessages = selectChatContext([
      ...history,
      { role: "user", content: message },
    ]);

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
      secureEntityContext,
      llcAccess
    );

    await createMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
    });

    const result = streamText({
      model,
      system: `${getSystemPrompt(message, filingAssessment?.route)}\n\n${filingContext}\n\n${finalRetrievalContext}`,
      messages: priorMessages,
      tools,
      stopWhen: stepCountIs(AI_MAX_STEPS),
      prepareStep: ({ stepNumber }) =>
        stepNumber === AI_MAX_STEPS - 1 ? { toolChoice: "none" } : {},
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      abortSignal: request.signal,
      timeout: AI_TIMEOUT_MS,
      onError: () => {
        incrementMetric("assistant_errors_total");
        logger.error("Assistant stream failed", { requestId });
        void recordAssistantOperation({
          status: "failed",
          requestId,
          model: null,
          inputTokens: null,
          outputTokens: null,
        });
      },
      onFinish: async (event) => {
        const text = event.steps.map((step) => step.text).join("");

        if (!text || event.finishReason === "error") return;

        await createMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: text,
          requestId,
          model: event.model.modelId,
          finishReason: event.finishReason,
          citations,
        });
        incrementMetric("assistant_streams_total");
        await recordAssistantOperation({
          status: "success",
          requestId,
          model: event.model.modelId,
          inputTokens: event.usage?.inputTokens ?? null,
          outputTokens: event.usage?.outputTokens ?? null,
        });
      },
    });

    // Propagate provider errors instead of returning a successful empty stream.
    const response = new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          let hasText = false;

          try {
            for await (const part of result.fullStream) {
              if (part.type === "error") throw new Error("AI provider failed");

              if (part.type === "text-delta") {
                hasText = true;
                controller.enqueue(encoder.encode(part.text));
              }
            }

            if (!hasText) throw new Error("AI provider returned no answer");
            controller.close();
          } catch {
            controller.error(
              new Error("Assistant response interrupted. Please retry.")
            );
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "x-conversation-id": conversation.id,
          "x-request-id": requestId,
        },
      }
    );

    incrementMetric("assistant_requests_total");

    return response;
  } catch (error) {
    const conversationMissing =
      error instanceof Error && error.message === "NOT_FOUND";

    incrementMetric("assistant_errors_total");
    logger.error("Assistant request failed", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });

    return new Response(
      conversationMissing
        ? "Conversation not found for this entity"
        : "Assistant unavailable. Check the AI provider in Settings and try again.",
      {
        status: conversationMissing ? 404 : 500,
        headers: { "x-request-id": requestId },
      }
    );
  }
}
