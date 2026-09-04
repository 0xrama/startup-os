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

type BillingStatus = {
  limits?: {
    maxAssistantQueries: number;
  };
  adminBypass?: boolean;
};

export default function AssistantPage() {
  const { id: llcId } = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [assistantCapLabel, setAssistantCapLabel] = useState<string | null>(
    null
  );
  const [isAdminBypass, setIsAdminBypass] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const normalizeMessages = useCallback(
    (
      data: Array<{
        id: string;
        role: "user" | "assistant";
        content: string | null;
        citations: Citation[] | null;
      }>
    ) =>
      data
        .filter(
          (message) => message.role === "user" || message.role === "assistant"
        )
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content ?? "",
          citations: message.citations,
        })),
    []
  );

  const loadBillingStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/billing/status", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as BillingStatus;
      setIsAdminBypass(data.adminBypass === true);
      const cap = data.limits?.maxAssistantQueries;
      if (Number.isFinite(cap)) {
        setAssistantCapLabel(`${cap} questions/mo`);
      } else {
        setAssistantCapLabel("Unlimited");
      }
    } catch {
      setAssistantCapLabel(null);
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setLoadingMessages(true);
      setMessageError(null);
      setGateMessage(null);

      try {
        const res = await fetch(`/api/assistant/conversations/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          const error = await res
            .json()
            .catch(() => ({ error: "Unable to load thread" }));
          throw new Error(error.error ?? "Unable to load thread");
        }

        const data = (await res.json()) as {
          messages: Array<{
            id: string;
            role: "user" | "assistant";
            content: string | null;
            citations: Citation[] | null;
          }>;
        };

        setConversationId(id);
        setMessages(normalizeMessages(data.messages));
      } catch (error) {
        setMessageError(
          error instanceof Error ? error.message : "Unable to load thread"
        );
      } finally {
        setLoadingMessages(false);
      }
    },
    [normalizeMessages]
  );

  const loadConversations = useCallback(
    async (options?: { selectLatest?: boolean }) => {
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

        const data = (await res.json()) as Conversation[];
        setConversations(data);

        if (options?.selectLatest && data[0]) {
          await selectConversation(data[0].id);
          return;
        }

        if (!conversationId && data[0]) {
          await selectConversation(data[0].id);
        }
      } catch (error) {
        setThreadError(
          error instanceof Error ? error.message : "Unable to load threads"
        );
      } finally {
        setLoadingThreads(false);
      }
    },
    [conversationId, llcId, selectConversation]
  );

  useEffect(() => {
    void Promise.all([loadConversations(), loadBillingStatus()]);
  }, [loadBillingStatus, loadConversations]);

  useEffect(() => {
    const viewport = messagesViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [input]);

  function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setMessageError(null);
    setGateMessage(null);
    setInput("");
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, llcId, message: trimmedInput }),
      });

      if (!res.ok) {
        const message = await res.text();
        gateMessageText = message;
        setGateMessage(message);
        throw new Error(message);
      }

      acceptedByServer = true;
      nextConversationId =
        res.headers.get("x-conversation-id") ?? conversationId;

      if (nextConversationId) {
        setConversationId(nextConversationId);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === optimisticAssistantId
              ? { ...message, content: assistantContent }
              : message
          )
        );
      }

      if (nextConversationId) {
        await loadConversations();
        await selectConversation(nextConversationId);
      } else {
        await loadConversations({ selectLatest: true });
      }
    } catch (error) {
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

        if (nextConversationId) {
          await selectConversation(nextConversationId);
        } else if (conversationId) {
          await selectConversation(conversationId);
        }
      }

      setMessageError(
        gateMessageText ??
          fallbackMessage ??
          "Sorry, something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
      {/* ─── Thread Sidebar ─────────────────────────────────────── */}
      <ThreadSidebar
        conversations={conversations}
        conversationId={conversationId}
        loadingThreads={loadingThreads}
        threadError={threadError}
        assistantCapLabel={assistantCapLabel}
        isAdminBypass={isAdminBypass}
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
            viewportRef={messagesViewportRef}
          />
        )}

        {/* ─── Composer ─────────────────────────────────────────── */}
        <Composer
          input={input}
          isLoading={isLoading}
          composerRef={composerRef}
          onChange={setInput}
          onSend={() => void handleSend()}
          onKeyDown={handleComposerKeyDown}
        />
      </section>
    </div>
  );
}
