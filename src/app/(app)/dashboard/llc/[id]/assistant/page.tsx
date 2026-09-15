"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { Composer } from "@/components/dashboard/assistant/composer";
import { EmptyState } from "@/components/dashboard/assistant/empty-state";
import { MessageList } from "@/components/dashboard/assistant/message-list";
import { StatusBanner } from "@/components/dashboard/assistant/status-banner";
import { ThreadSidebar } from "@/components/dashboard/assistant/thread-sidebar";
import type {
  Citation,
  Conversation,
  Message,
  ToolActivity,
} from "@/components/dashboard/assistant/types";
import { useEncryption } from "@/components/security/encryption-provider";
import {
  createAssistantEventParser,
  type AssistantFinishReason,
  type AssistantStreamEvent,
} from "@/lib/assistant-stream";
import { decryptJson, type CipherPayload } from "@/lib/e2ee";
import type { SecureLlcPayload } from "@/lib/secure-llc";

type SecureEntityContext = SecureLlcPayload;

type AssistantLlcResponse = SecureLlcPayload & {
  encryptedData: CipherPayload | null;
};

const SECURE_CONTEXT_MESSAGES = {
  locked: "Unlock the vault before asking Pax to use this entity profile.",
  error: "The entity profile could not be loaded. Refresh and try again.",
  loading: "Wait for the entity profile to finish loading.",
};

const CONTINUE_PROMPT = "Continue from where you stopped.";

type SendOptions =
  // A fresh user turn typed in the composer or chosen from a suggestion.
  | { kind: "message"; text: string }
  // Re-answer the last saved user turn; the server adds no new user message.
  | { kind: "regenerate" };

function updateActivity(
  current: ToolActivity[] | undefined,
  step: ToolActivity
) {
  const list = current ?? [];

  return list.some((item) => item.id === step.id)
    ? list.map((item) => (item.id === step.id ? step : item))
    : [...list, step];
}

type StreamSnapshot = {
  content: string;
  activity: ToolActivity[] | undefined;
};

type StreamResult = StreamSnapshot & {
  finishReason: AssistantFinishReason | null;
  title: string | null;
  error: string | null;
};

// Consumes the NDJSON answer. Snapshots are delivered at most once per
// animation frame so a fast stream does not schedule a render per event.
async function readAssistantStream(
  body: ReadableStream<Uint8Array>,
  onSnapshot: (snapshot: StreamSnapshot) => void
): Promise<StreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const parser = createAssistantEventParser();

  const result: StreamResult = {
    content: "",
    activity: undefined,
    finishReason: null,
    title: null,
    error: null,
  };

  let frame: number | null = null;

  const flush = () => {
    frame = null;
    onSnapshot({ content: result.content, activity: result.activity });
  };

  const apply = (event: AssistantStreamEvent) => {
    switch (event.type) {
      case "text":
        result.content += event.text;
        break;
      case "tool":
        result.activity = updateActivity(result.activity, {
          id: event.id,
          name: event.name,
          status: event.status,
        });
        break;
      case "finish":
        result.finishReason = event.finishReason;
        break;
      case "title":
        result.title = event.title;
        break;
      case "error":
        result.error = event.message;
        break;
      default:
        break;
    }

    if (frame === null) frame = requestAnimationFrame(flush);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      for (const event of parser.push(decoder.decode(value, { stream: true })))
        apply(event);
    }

    for (const event of parser.push(decoder.decode())) apply(event);

    for (const event of parser.flush()) apply(event);
  } finally {
    if (frame !== null) cancelAnimationFrame(frame);
  }

  flush();

  return result;
}

// A regenerate replaces an unsaved partial answer left by Stop; a fresh turn
// appends both the user message and an empty assistant placeholder.
function buildOptimisticMessages(
  prev: Message[],
  options: {
    regenerate: boolean;
    trimmedInput: string;
    userId: string;
    assistantId: string;
  }
): Message[] {
  const { regenerate, trimmedInput, userId, assistantId } = options;

  const base =
    regenerate && prev.at(-1)?.role === "assistant" ? prev.slice(0, -1) : prev;

  return [
    ...base,
    ...(regenerate
      ? []
      : [
          {
            id: userId,
            role: "user" as const,
            content: trimmedInput,
          },
        ]),
    { id: assistantId, role: "assistant" as const, content: "" },
  ];
}

export default function AssistantPage() {
  const { id: llcId } = useParams<{ id: string }>();

  const { masterKey, loading: encryptionLoading } = useEncryption();

  const [secureEntityContext, setSecureEntityContext] =
    useState<SecureEntityContext>();

  const [secureContextStatus, setSecureContextStatus] = useState<
    "loading" | "ready" | "locked" | "error"
  >("loading");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  // True when the failed turn was saved server-side, so Retry can regenerate.
  const [canRetry, setCanRetry] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const streamController = useRef<AbortController | null>(null);
  const threadController = useRef<AbortController | null>(null);
  const navigationVersion = useRef(0);

  // A 260px thread rail leaves no usable chat column on a phone, so it starts
  // closed and only opens by default where there is room for both.
  useEffect(() => {
    setSidebarOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(
    () => () => {
      streamController.current?.abort();
      threadController.current?.abort();
    },
    []
  );

  const normalizeMessages = useCallback(
    (
      data: Array<{
        id: string;
        role: "user" | "assistant";
        content: string | null;
        citations: Citation[] | null;
      }>
    ) =>
      data.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content ?? "",
        citations: message.citations,
      })),
    []
  );

  const selectConversation = useCallback(
    async (id: string) => {
      navigationVersion.current += 1;
      streamController.current?.abort();
      threadController.current?.abort();
      const controller = new AbortController();
      threadController.current = controller;
      setIsLoading(false);
      setLoadingMessages(true);
      setMessageError(null);
      setCanRetry(false);
      setTruncated(false);
      setGateMessage(null);
      setNotice(null);

      try {
        const res = await fetch(`/api/assistant/conversations/${id}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Unable to load thread" }));

          throw new Error(error.error ?? "Unable to load thread");
        }

        // SAFETY: the thread endpoint returns messages written by
        // assistant-store, whose roles are the "user" | "assistant" union.
        const data = (await res.json()) as {
          hasMore: boolean;
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string | null;
            citations: Citation[] | null;
          }>;
        };

        if (controller.signal.aborted) return;
        setConversationId(id);
        setMessages(normalizeMessages(data.messages));
        setHasOlderMessages(data.hasMore);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessageError(
          error instanceof Error ? error.message : "Unable to load thread"
        );
      } finally {
        if (!controller.signal.aborted) setLoadingMessages(false);
      }
    },
    [normalizeMessages]
  );

  const loadConversations = useCallback(
    async (options?: { selectLatest?: boolean }) => {
      const version = navigationVersion.current;
      setLoadingThreads(true);
      setThreadError(null);

      try {
        const res = await fetch(`/api/assistant/conversations?llcId=${llcId}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Unable to load threads" }));

          throw new Error(error.error ?? "Unable to load threads");
        }

        // SAFETY: the conversations endpoint serializes Conversation rows
        // created by assistant-store.
        const data = (await res.json()) as Conversation[];
        setConversations(data);

        if (
          options?.selectLatest &&
          data[0] &&
          version === navigationVersion.current
        ) {
          await selectConversation(data[0].id);

          return;
        }
      } catch (error) {
        setThreadError(
          error instanceof Error ? error.message : "Unable to load threads"
        );
      } finally {
        setLoadingThreads(false);
      }
    },
    [llcId, selectConversation]
  );

  useEffect(() => {
    void loadConversations({ selectLatest: true });
  }, [loadConversations]);

  useEffect(() => {
    if (encryptionLoading) return;

    let cancelled = false;
    const controller = new AbortController();

    async function loadSecureEntityContext() {
      setSecureContextStatus("loading");

      const response = await fetch(`/api/llcs/${llcId}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Could not load the entity profile.");
      }

      // SAFETY: /api/llcs/[id] serializes the LLC row and its encrypted payload;
      // the fields used here are constrained by the LLC creation API and schema.
      const llc = (await response.json()) as AssistantLlcResponse;

      const fallbackContext: SecureEntityContext = {
        ein: llc.ein,
        registeredAgent: llc.registeredAgent,
        members: llc.members ?? [],
      };

      if (llc.encryptedData && !masterKey) {
        if (!cancelled) setSecureContextStatus("locked");

        return;
      }

      const context =
        llc.encryptedData && masterKey
          ? await decryptJson<SecureEntityContext>(masterKey, llc.encryptedData)
          : fallbackContext;

      if (!cancelled) {
        setSecureEntityContext(context);
        setSecureContextStatus("ready");
      }
    }

    void loadSecureEntityContext().catch((error) => {
      if (
        !cancelled &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setSecureContextStatus("error");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [encryptionLoading, llcId, masterKey]);

  // The provider never persists a partial answer when the request aborts, so
  // the stopped text stays on screen only until the thread is reloaded.
  function stopGenerating() {
    if (!streamController.current) return;
    streamController.current.abort();
    streamController.current = null;
    setIsLoading(false);

    setMessages((current) => {
      const last = current.at(-1);

      if (last?.role === "assistant" && last.content === "") {
        return current.slice(0, -1);
      }

      return current;
    });

    setNotice(
      "Generation stopped. Anything already shown is not saved to this thread."
    );
    setCanRetry(true);
    // The user turn was saved before streaming began, so a thread started by
    // this message still belongs in the sidebar.
    void loadConversations();
  }

  function closeSidebarOnNarrowScreen() {
    if (!window.matchMedia("(min-width: 768px)").matches) setSidebarOpen(false);
  }

  function startNewConversation() {
    closeSidebarOnNarrowScreen();
    navigationVersion.current += 1;
    streamController.current?.abort();
    threadController.current?.abort();
    setIsLoading(false);
    setLoadingMessages(false);
    setHasOlderMessages(false);
    setConversationId(null);
    setMessages([]);
    setMessageError(null);
    setCanRetry(false);
    setTruncated(false);
    setGateMessage(null);
    setNotice(null);
    setInput("");
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function renameConversation(id: string, title: string) {
    const response = await fetch(`/api/assistant/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Could not rename the thread." }));

      setThreadError(error.error ?? "Could not rename the thread.");

      return;
    }

    // SAFETY: PATCH /api/assistant/conversations/[id] returns the updated
    // Conversation row it just wrote.
    const updated = (await response.json()) as Conversation;

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, title: updated.title }
          : conversation
      )
    );
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/assistant/conversations/${id}`, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      const error = await response
        .json()
        .catch(() => ({ error: "Could not delete the thread." }));

      setThreadError(error.error ?? "Could not delete the thread.");

      return;
    }

    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id)
    );

    if (conversationId === id) startNewConversation();
  }

  async function loadOlderMessages() {
    if (!conversationId || !messages[0] || loadingOlderMessages) return;
    const version = navigationVersion.current;
    setLoadingOlderMessages(true);

    try {
      const response = await fetch(
        `/api/assistant/conversations/${conversationId}?before=${encodeURIComponent(messages[0].id)}`
      );

      if (!response.ok) throw new Error("Could not load earlier messages.");
      const data = await response.json();

      if (version !== navigationVersion.current) return;
      setMessages((current) => [
        ...normalizeMessages(data.messages),
        ...current,
      ]);
      setHasOlderMessages(data.hasMore);
    } catch (error) {
      if (version === navigationVersion.current)
        setMessageError(
          error instanceof Error
            ? error.message
            : "Could not load earlier messages."
        );
    } finally {
      setLoadingOlderMessages(false);
    }
  }

  async function refreshSavedTurn(
    id: string,
    optimisticIds: string[],
    version: number
  ) {
    const response = await fetch(`/api/assistant/conversations/${id}?limit=2`, {
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Could not reload the saved answer.");
    const data = await response.json();

    if (version !== navigationVersion.current) return;
    const saved = normalizeMessages(data.messages);

    const replaced = new Set([
      ...optimisticIds,
      ...saved.map((message) => message.id),
    ]);

    setMessages((current) => [
      ...current.filter((message) => !replaced.has(message.id)),
      ...saved,
    ]);
  }

  // Throws on a failed or empty answer so the turn rolls back; otherwise
  // surfaces truncation and applies any generated thread title.
  function applyAnswerResult(answer: StreamResult, nextId: string | null) {
    if (answer.error) throw new Error(answer.error);

    if (!answer.content.trim())
      throw new Error(
        "The AI provider returned no answer. Check Settings and retry."
      );

    if (answer.finishReason === "length") setTruncated(true);

    if (answer.title && nextId) {
      const { title } = answer;

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === nextId ? { ...conversation, title } : conversation
        )
      );
    }
  }

  // Rolls back optimistic messages after a failed turn. When the turn never
  // reached the server the draft is handed back; when it did, the saved user
  // message stays and a regenerate can retry it.
  function rollbackFailedTurn(options: {
    regenerate: boolean;
    trimmedInput: string;
    acceptedByServer: boolean;
    optimisticUserId: string;
    optimisticAssistantId: string;
  }) {
    const {
      regenerate,
      trimmedInput,
      acceptedByServer,
      optimisticUserId,
      optimisticAssistantId,
    } = options;

    if (!acceptedByServer) {
      setMessages((prev) =>
        prev.filter(
          (message) =>
            message.id !== optimisticUserId &&
            message.id !== optimisticAssistantId
        )
      );

      if (!regenerate) setInput((current) => current || trimmedInput);
    } else {
      setMessages((prev) =>
        prev.filter((message) => message.id !== optimisticAssistantId)
      );

      setCanRetry(true);
    }
  }

  async function handleSend(options: SendOptions) {
    if (secureContextStatus !== "ready") {
      setGateMessage(SECURE_CONTEXT_MESSAGES[secureContextStatus]);

      return;
    }

    if (isLoading || loadingMessages) return;

    const regenerate = options.kind === "regenerate";
    const trimmedInput = options.kind === "message" ? options.text.trim() : "";

    if (options.kind === "message" && !trimmedInput) return;

    if (regenerate && !conversationId) return;

    const controller = new AbortController();
    streamController.current = controller;
    const version = navigationVersion.current;

    const isCurrent = () =>
      !controller.signal.aborted && version === navigationVersion.current;

    setGateMessage(null);
    setMessageError(null);
    setCanRetry(false);
    setTruncated(false);
    setNotice(null);

    const optimisticUserId = crypto.randomUUID();
    const optimisticAssistantId = crypto.randomUUID();

    setMessages((prev) =>
      buildOptimisticMessages(prev, {
        regenerate,
        trimmedInput,
        userId: optimisticUserId,
        assistantId: optimisticAssistantId,
      })
    );

    if (!regenerate) setInput("");
    setIsLoading(true);

    let acceptedByServer = false;
    let nextConversationId = conversationId;
    let gateMessageText: string | null = null;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          llcId,
          message: regenerate ? undefined : trimmedInput,
          regenerate: regenerate || undefined,
          secureEntityContext,
        }),
      });

      if (!isCurrent()) return;

      if (!res.ok) {
        const message = await res.text();
        gateMessageText = message;
        setGateMessage(message);
        throw new Error(message);
      }

      acceptedByServer = true;
      nextConversationId =
        res.headers.get("x-conversation-id") ?? conversationId;

      setConversationId(nextConversationId);

      if (!res.body) {
        throw new Error("No response stream available");
      }

      const answer = await readAssistantStream(res.body, (snapshot) => {
        if (!isCurrent()) return;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === optimisticAssistantId
              ? { ...message, ...snapshot }
              : message
          )
        );
      });

      applyAnswerResult(answer, nextConversationId);

      await loadConversations();

      if (isCurrent() && nextConversationId)
        await refreshSavedTurn(
          nextConversationId,
          [optimisticUserId, optimisticAssistantId],
          version
        );
    } catch (error) {
      if (!isCurrent()) return;

      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "Sorry, something went wrong. Please try again.";

      rollbackFailedTurn({
        regenerate,
        trimmedInput,
        acceptedByServer,
        optimisticUserId,
        optimisticAssistantId,
      });

      setMessageError(gateMessageText ?? fallbackMessage);
    } finally {
      if (isCurrent()) setIsLoading(false);

      if (streamController.current === controller)
        streamController.current = null;
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div>
          <p className="text-sm font-medium">Pax Navigator</p>
          <p className="text-[11px] text-muted-foreground">
            Informational guidance and draft preparation, not professional tax
            advice.
          </p>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Thread Sidebar ─────────────────────────────────────── */}
        <ThreadSidebar
          conversations={conversations}
          conversationId={conversationId}
          loadingThreads={loadingThreads}
          threadError={threadError}
          sidebarOpen={sidebarOpen}
          onSelectConversation={(id) => {
            closeSidebarOnNarrowScreen();
            void selectConversation(id);
          }}
          onNewConversation={startNewConversation}
          onCloseSidebar={() => setSidebarOpen(false)}
          onRetryThreads={() => void loadConversations()}
          onRenameConversation={renameConversation}
          onDeleteConversation={deleteConversation}
        />

        {/* ─── Main Chat Area ─────────────────────────────────────── */}
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {/* Sidebar toggle (when closed) */}
          {!sidebarOpen ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Open sidebar"
              aria-label="Open thread list"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : null}

          {/* Alerts */}
          {gateMessage ? (
            <StatusBanner tone="warning">{gateMessage}</StatusBanner>
          ) : null}

          {messageError ? (
            <StatusBanner
              tone="error"
              action={
                canRetry && conversationId
                  ? {
                      label: "Retry",
                      disabled: isLoading,
                      onClick: () => void handleSend({ kind: "regenerate" }),
                    }
                  : undefined
              }
            >
              {messageError}
            </StatusBanner>
          ) : null}

          {notice ? (
            <StatusBanner
              tone="info"
              action={
                canRetry && conversationId
                  ? {
                      label: "Retry",
                      disabled: isLoading,
                      onClick: () => void handleSend({ kind: "regenerate" }),
                    }
                  : undefined
              }
            >
              {notice}
            </StatusBanner>
          ) : null}

          {truncated ? (
            <StatusBanner
              tone="info"
              action={{
                label: "Continue",
                disabled: isLoading,
                onClick: () =>
                  void handleSend({ kind: "message", text: CONTINUE_PROMPT }),
              }}
            >
              The answer reached its length limit.
            </StatusBanner>
          ) : null}

          {secureContextStatus !== "ready" ? (
            <StatusBanner tone="info">
              {secureContextStatus === "locked"
                ? "Unlock the vault to let Pax use the saved owner profile."
                : secureContextStatus === "error"
                  ? "The saved owner profile could not be loaded."
                  : "Loading the saved owner profile…"}
            </StatusBanner>
          ) : null}

          {/* Messages area or empty state */}
          {!loadingMessages && !hasMessages ? (
            <EmptyState
              composerRef={composerRef}
              onSelectPrompt={(prompt) => setInput(prompt)}
            />
          ) : (
            <MessageList
              messages={messages}
              isLoading={isLoading}
              loadingMessages={loadingMessages}
              hasOlderMessages={hasOlderMessages}
              loadingOlderMessages={loadingOlderMessages}
              onLoadOlder={() => void loadOlderMessages()}
            />
          )}

          {/* ─── Composer ─────────────────────────────────────────── */}
          <Composer
            input={input}
            isLoading={isLoading}
            disabled={secureContextStatus !== "ready" || loadingMessages}
            composerRef={composerRef}
            onChange={setInput}
            onSend={() => void handleSend({ kind: "message", text: input })}
            onStop={stopGenerating}
          />
        </section>
      </div>
    </div>
  );
}
