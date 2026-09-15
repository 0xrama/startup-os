import { NextRequest } from "next/server";
import {
  generateText,
  stepCountIs,
  streamText,
  type LanguageModel,
  type TextStreamPart,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { getChatModel, getSystemPrompt } from "@/lib/ai";
import { createAssistantTools } from "@/lib/ai-tools";
import {
  createCitationRegistry,
  type CitationRegistry,
} from "@/lib/assistant-citations";
import {
  ASSISTANT_STREAM_CONTENT_TYPE,
  encodeAssistantEvent,
  type AssistantFinishReason,
  type AssistantStreamEvent,
} from "@/lib/assistant-stream";
import { seedOfficialKnowledge } from "@/lib/official-knowledge";
import {
  createMessage,
  ensureConversation,
  getConversationContext,
  normalizeConversationTitle,
  renameConversation,
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

const requestSchema = z
  .object({
    conversationId: z.string().optional().nullable(),
    llcId: z.string().optional(),
    message: z.string().trim().min(1).max(20_000).optional(),
    // Re-answer the conversation's last saved user turn instead of adding a
    // new one. Used by the client's Retry after a failed or interrupted answer.
    regenerate: z.boolean().optional(),
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
  })
  .refine(
    (body) => (body.regenerate ? !!body.conversationId : !!body.message),
    {
      message: "message is required unless regenerate names a conversation",
    }
  );

const CITATION_INSTRUCTIONS =
  "Citations: every source available to you carries a bracketed number such as [2]. When a sentence relies on a source, append its marker to that sentence. Never invent a marker and never cite a source you did not use. Sources you do not cite are dropped from the answer's Sources list.";

const TITLE_INSTRUCTIONS =
  "Write a title of at most six words for this conversation. Name the topic, not the request. Plain text only: no quotes, no trailing period, no markdown.";

// A short generated title replaces the first-message seed. Best effort: a
// failure here must never affect the answer already streamed.
export async function generateConversationTitle(input: {
  model: LanguageModel;
  userMessage: string;
  assistantMessage: string;
  abortSignal?: AbortSignal;
}) {
  const result = await generateText({
    model: input.model,
    instructions: TITLE_INSTRUCTIONS,
    prompt: `User: ${input.userMessage.slice(0, 1_500)}\n\nAssistant: ${input.assistantMessage.slice(0, 1_500)}`,
    maxOutputTokens: 24,
    maxRetries: 0,
    abortSignal: input.abortSignal,
  });

  return normalizeConversationTitle(result.text) || null;
}

type FilingAssessment = ReturnType<typeof assessFederalTaxFiling>;

type RetrievalHit = Awaited<ReturnType<typeof searchKnowledgeBase>>[number];

function buildRetrievalContext(
  retrieval: RetrievalHit[],
  registry: CitationRegistry
) {
  if (!retrieval.length) {
    return "No source-backed context was retrieved for this message. Be conservative and say when guidance is not source-backed.";
  }

  const entries = retrieval.map(
    (item) =>
      `${registry.add(toCitation(item))} ${JSON.stringify(item.metadata)}\n${item.content}`
  );

  return `Relevant source-backed context:\n${entries.join("\n\n")}`;
}

function buildFilingContext(
  filingAssessment: FilingAssessment | null,
  registry: CitationRegistry
) {
  if (!filingAssessment) {
    return "No LLC-specific filing assessment is available.";
  }

  const assessmentSources = filingAssessment.sources.map((source) => {
    const marker = registry.add({
      label: source.title,
      sourceType: "irs",
      sourceTitle: source.title,
      excerpt: filingAssessment.summary.slice(0, 240),
      section: source.section,
      sourceUrl: source.url,
      revision: source.revision,
    });

    return `${marker} ${source.title}${source.section ? ` — ${source.section}` : ""}`;
  });

  const sourcesBlock = assessmentSources.length
    ? `\nSources behind this assessment:\n${assessmentSources.join("\n")}`
    : "";

  return `Saved-profile federal filing assessment:\n${JSON.stringify(filingAssessment)}\nUse this assessment instead of asking the user to repeat saved profile facts. Clearly distinguish likely filing triggers from confirmed transaction facts.${sourcesBlock}`;
}

type ConversationHistory = Awaited<ReturnType<typeof getConversationContext>>;

// On regenerate the user turn is already saved; the last stored message must
// be theirs so the model answers a question, not its own answer.
function resolveTurnMessage(
  body: z.infer<typeof requestSchema>,
  history: ConversationHistory
): { message: string } | Response {
  if (!body.regenerate) {
    return body.message
      ? { message: body.message }
      : new Response("A message is required", { status: 400 });
  }

  const lastTurn = history.at(-1);

  if (!lastTurn || lastTurn.role !== "user" || !lastTurn.content) {
    return new Response("There is no unanswered message to retry", {
      status: 409,
    });
  }

  return { message: lastTurn.content };
}

type StreamOutcome =
  | { kind: "aborted" }
  | {
      kind: "complete";
      text: string;
      modelId: string | null;
      finishReason: AssistantFinishReason;
      inputTokens: number | null;
      outputTokens: number | null;
    };

// Forwards text and tool activity to the client as they happen and gathers
// what persistence needs once the model stops. Throws on a provider error.
async function consumeModelStream<TOOLS extends ToolSet>(
  fullStream: AsyncIterable<TextStreamPart<TOOLS>>,
  send: (event: AssistantStreamEvent) => void
): Promise<StreamOutcome> {
  let text = "";
  let modelId: string | null = null;
  let finishReason: AssistantFinishReason = "other";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  for await (const part of fullStream) {
    switch (part.type) {
      case "text-delta":
        text += part.text;
        send({ type: "text", text: part.text });
        break;
      case "tool-call":
        send({
          type: "tool",
          id: part.toolCallId,
          name: part.toolName,
          status: "running",
        });
        break;
      case "tool-result":
      case "tool-error":
        send({
          type: "tool",
          id: part.toolCallId,
          name: part.toolName,
          status: "done",
        });
        break;
      case "finish-step":
        modelId = part.response.modelId ?? modelId;
        break;
      case "finish":
        finishReason = part.finishReason;
        inputTokens = part.totalUsage.inputTokens ?? null;
        outputTokens = part.totalUsage.outputTokens ?? null;
        break;
      case "error":
        throw new Error("AI provider failed");
      case "abort":
        return { kind: "aborted" };
      default:
        break;
    }
  }

  return {
    kind: "complete",
    text,
    modelId,
    finishReason,
    inputTokens,
    outputTokens,
  };
}

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
  generateConversationTitle,
  renameConversation,
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
    generateConversationTitle,
    renameConversation,
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

    const { conversationId, llcId, regenerate, secureEntityContext } =
      parsed.data;

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
      titleSeed: parsed.data.message,
    });

    const isNewConversation = !conversationId;
    const history = await getConversationContext(conversation.id);

    const turn = resolveTurnMessage(parsed.data, history);

    if (turn instanceof Response) return turn;
    const { message } = turn;

    const retrieval = isFeatureFlagEnabled("assistantRetrieval")
      ? await seedOfficialKnowledge().then(() =>
          searchKnowledgeBase({
            query: message,
            llcId,
            limit: 4,
          })
        )
      : [];

    const priorMessages = selectChatContext(
      regenerate ? history : [...history, { role: "user", content: message }]
    );

    const citationRegistry = createCitationRegistry();
    const retrievalContext = buildRetrievalContext(retrieval, citationRegistry);

    const filingAssessment = llcAccess
      ? assessFederalTaxFiling({
          ...llcAccess.llc,
          ein: secureEntityContext?.ein ?? llcAccess.llc.ein,
          members: secureEntityContext?.members ?? llcAccess.llc.members,
        })
      : null;

    const filingContext = buildFilingContext(
      filingAssessment,
      citationRegistry
    );

    const tools = createAssistantTools(
      session.user.id,
      llcId,
      secureEntityContext,
      llcAccess,
      { registerCitation: (citation) => citationRegistry.add(citation) }
    );

    if (!regenerate) {
      await createMessage({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });
    }

    const result = streamText({
      model,
      instructions: `${getSystemPrompt(message, filingAssessment?.route)}\n\n${CITATION_INSTRUCTIONS}\n\n${filingContext}\n\n${retrievalContext}`,
      messages: priorMessages,
      tools,
      stopWhen: stepCountIs(AI_MAX_STEPS),
      prepareStep: ({ stepNumber }) =>
        stepNumber === AI_MAX_STEPS - 1 ? { toolChoice: "none" } : {},
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      maxRetries: 1,
      abortSignal: request.signal,
      timeout: AI_TIMEOUT_MS,
    });

    // The stream is consumed here rather than in onEnd so that saving the
    // answer, generating the title, and closing the response happen in one
    // explicit order the client can rely on.
    const response = new Response(
      new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();

          const send = (event: AssistantStreamEvent) =>
            controller.enqueue(encoder.encode(encodeAssistantEvent(event)));

          let modelId: string | null = null;

          const fail = (reason: string) => {
            incrementMetric("assistant_errors_total");
            logger.error("Assistant stream failed", { requestId, reason });
            void recordAssistantOperation({
              status: "failed",
              requestId,
              model: modelId,
              inputTokens: null,
              outputTokens: null,
            });
            send({
              type: "error",
              message: "Assistant response interrupted. Please retry.",
            });
            controller.close();
          };

          let outcome: StreamOutcome;

          try {
            outcome = await consumeModelStream(result.fullStream, send);
          } catch (error) {
            fail(error instanceof Error ? error.message : "unknown");

            return;
          }

          if (outcome.kind === "aborted") {
            controller.close();

            return;
          }

          modelId = outcome.modelId;
          const { finishReason } = outcome;

          if (!outcome.text.trim() || finishReason === "error") {
            fail("AI provider returned no answer");

            return;
          }

          const resolved = citationRegistry.resolve(outcome.text);

          try {
            await createMessage({
              conversationId: conversation.id,
              role: "assistant",
              content: resolved.text,
              requestId,
              model: modelId ?? undefined,
              finishReason,
              citations: resolved.citations,
            });
          } catch (error) {
            fail(error instanceof Error ? error.message : "save failed");

            return;
          }

          incrementMetric("assistant_streams_total");
          void recordAssistantOperation({
            status: "success",
            requestId,
            model: modelId,
            inputTokens: outcome.inputTokens,
            outputTokens: outcome.outputTokens,
          });

          if (isNewConversation) {
            try {
              const title = await generateConversationTitle({
                model,
                userMessage: message,
                assistantMessage: resolved.text,
                abortSignal: request.signal,
              });

              if (title) {
                await renameConversation(
                  session.user.id,
                  conversation.id,
                  title
                );
                send({ type: "title", title });
              }
            } catch {
              logger.warn("Conversation title generation failed", {
                requestId,
              });
            }
          }

          send({ type: "finish", finishReason });
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": ASSISTANT_STREAM_CONTENT_TYPE,
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
