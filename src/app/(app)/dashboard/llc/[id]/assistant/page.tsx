"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { Composer } from "@/components/dashboard/assistant/composer";
import { EmptyState } from "@/components/dashboard/assistant/empty-state";
import { MessageList } from "@/components/dashboard/assistant/message-list";
import { ThreadSidebar } from "@/components/dashboard/assistant/thread-sidebar";
import type {
  Citation,
  Conversation,
  Message,
} from "@/components/dashboard/assistant/types";
import { useEncryption } from "@/components/security/encryption-provider";
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
  const [gateMessage, setGateMessage] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const streamController = useRef<AbortController | null>(null);
  const threadController = useRef<AbortController | null>(null);
  const navigationVersion = useRef(0);

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
      setGateMessage(null);

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

  function startNewConversation() {
    navigationVersion.current += 1;
    streamController.current?.abort();
    threadController.current?.abort();
    setIsLoading(false);
    setLoadingMessages(false);
    setHasOlderMessages(false);
    setConversationId(null);
    setMessages([]);
    setMessageError(null);
    setGateMessage(null);
    setInput("");
    requestAnimationFrame(() => composerRef.current?.focus());
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

  async function handleSend() {
    if (secureContextStatus !== "ready") {
      setGateMessage(SECURE_CONTEXT_MESSAGES[secureContextStatus]);

      return;
    }

    if (!input.trim() || isLoading || loadingMessages) return;

    const controller = new AbortController();
    streamController.current = controller;
    const version = navigationVersion.current;

    const isCurrent = () =>
      !controller.signal.aborted && version === navigationVersion.current;

    let frame: number | null = null;

    setGateMessage(null);
    setMessageError(null);

    const trimmedInput = input.trim();
    const optimisticUserId = crypto.randomUUID();
    const optimisticAssistantId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: optimisticUserId, role: "user", content: trimmedInput },
      { id: optimisticAssistantId, role: "assistant", content: "" },
    ]);
    setInput("");
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
          message: trimmedInput,
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

      const reader = res.body?.getReader();

      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      const flush = () => {
        frame = null;

        if (!isCurrent()) return;
        const content = assistantContent;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === optimisticAssistantId
              ? { ...message, content }
              : message
          )
        );
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });

        if (frame === null) frame = requestAnimationFrame(flush);
      }

      assistantContent += decoder.decode();

      if (frame !== null) cancelAnimationFrame(frame);
      flush();

      if (!assistantContent.trim())
        throw new Error(
          "The AI provider returned no answer. Check Settings and retry."
        );
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

      if (!acceptedByServer) {
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== optimisticUserId &&
              message.id !== optimisticAssistantId
          )
        );
      } else {
        setMessages((prev) =>
          prev.filter((message) => message.id !== optimisticAssistantId)
        );
      }

      setMessageError(gateMessageText ?? fallbackMessage);
    } finally {
      if (frame !== null) cancelAnimationFrame(frame);

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
          <p className="text-sm font-medium">AI Copilot</p>
          <p className="text-[11px] text-muted-foreground">
            Informational guidance and draft preparation, not professional tax
            advice.
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Thread Sidebar ─────────────────────────────────────── */}
        <ThreadSidebar
          conversations={conversations}
          conversationId={conversationId}
          loadingThreads={loadingThreads}
          threadError={threadError}
          sidebarOpen={sidebarOpen}
          onSelectConversation={(id) => void selectConversation(id)}
          onNewConversation={startNewConversation}
          onCloseSidebar={() => setSidebarOpen(false)}
          onRetryThreads={() => void loadConversations()}
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
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : null}

          {/* Alerts */}
          {gateMessage ? (
            <div className="mx-auto w-full max-w-3xl px-6 pt-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                {gateMessage}
              </div>
            </div>
          ) : null}

          {messageError ? (
            <div className="mx-auto w-full max-w-3xl px-6 pt-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
                {messageError}
              </div>
            </div>
          ) : null}

          {secureContextStatus !== "ready" ? (
            <div className="mx-auto w-full max-w-3xl px-6 pt-3">
              <div className="rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
                {secureContextStatus === "locked"
                  ? "Unlock the vault to let Pax use the saved owner profile."
                  : secureContextStatus === "error"
                    ? "The saved owner profile could not be loaded."
                    : "Loading the saved owner profile…"}
              </div>
            </div>
          ) : null}

          {/* Messages area or empty state */}
          {hasOlderMessages ? (
            <button
              type="button"
              className="py-2 text-xs text-muted-foreground"
              disabled={loadingOlderMessages || isLoading}
              onClick={() => void loadOlderMessages()}
            >
              {loadingOlderMessages ? "Loading…" : "Load earlier messages"}
            </button>
          ) : null}
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
            />
          )}

          {/* ─── Composer ─────────────────────────────────────────── */}
          <Composer
            input={input}
            isLoading={isLoading}
            disabled={secureContextStatus !== "ready" || loadingMessages}
            composerRef={composerRef}
            onChange={setInput}
            onSend={() => void handleSend()}
          />
        </section>
      </div>
    </div>
  );
}
