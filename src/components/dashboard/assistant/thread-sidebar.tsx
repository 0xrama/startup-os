"use client";

import {
  Check,
  MessageSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Conversation } from "./types";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";

  if (diffMins < 60) return `${diffMins}m ago`;

  if (diffHours < 24) return `${diffHours}h ago`;

  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type ThreadSidebarProps = {
  conversations: Conversation[];
  conversationId: string | null;
  loadingThreads: boolean;
  threadError: string | null;
  sidebarOpen: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onCloseSidebar: () => void;
  onRetryThreads: () => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
};

const ICON_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

type ThreadRowProps = {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => Promise<void>;
  onDelete: () => Promise<void>;
};

function ThreadRow({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: ThreadRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft(conversation.title ?? "");
    setEditing(true);
  }

  async function commitRename() {
    const title = draft.trim();

    if (!title || title === conversation.title) {
      setEditing(false);

      return;
    }

    setBusy(true);

    try {
      await onRename(title);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this thread and its messages?")) return;
    setBusy(true);

    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <form
        className="flex items-center gap-1 px-2 py-1"
        onSubmit={(event) => {
          event.preventDefault();
          void commitRename();
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          maxLength={80}
          disabled={busy}
          aria-label="Thread title"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
          }}
          className="h-7 min-w-0 flex-1 border border-border bg-background px-2 text-[13px] outline-none focus-visible:border-foreground/40"
        />
        <button
          type="submit"
          disabled={busy}
          className={ICON_BUTTON_CLASS}
          aria-label="Save title"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(false)}
          className={ICON_BUTTON_CLASS}
          aria-label="Cancel rename"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div
      className={`group flex items-center transition-colors ${
        active
          ? "bg-secondary text-foreground"
          : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
      >
        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px]">
            {conversation.title || "Untitled"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </span>
      </button>
      <span className="flex items-center pr-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          disabled={busy}
          onClick={startEditing}
          className={ICON_BUTTON_CLASS}
          aria-label="Rename thread"
          title="Rename"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleDelete()}
          className={`${ICON_BUTTON_CLASS} hover:text-destructive`}
          aria-label="Delete thread"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}

export function ThreadSidebar({
  conversations,
  conversationId,
  loadingThreads,
  threadError,
  sidebarOpen,
  onSelectConversation,
  onNewConversation,
  onCloseSidebar,
  onRetryThreads,
  onRenameConversation,
  onDeleteConversation,
}: ThreadSidebarProps) {
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCloseSidebar}
          aria-hidden
          className="absolute inset-0 z-10 bg-foreground/20 md:hidden"
        />
      )}
      {sidebarOpen && (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease }}
          className="absolute inset-y-0 left-0 z-20 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background md:relative md:z-auto md:bg-secondary/20"
          style={{ display: "flex" }}
        >
          <div className="flex items-center justify-between px-3 py-3">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Threads
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onNewConversation}
                className={ICON_BUTTON_CLASS}
                title="New thread"
                aria-label="New thread"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onCloseSidebar}
                className={ICON_BUTTON_CLASS}
                title="Close sidebar"
                aria-label="Close thread list"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {loadingThreads ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-3 py-2.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="mt-2 h-2.5 w-1/3" />
                  </div>
                ))}
              </div>
            ) : threadError ? (
              <div className="px-3 py-4">
                <p className="text-xs text-destructive">{threadError}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={onRetryThreads}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Your first message starts a thread.
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 pb-2">
                {conversations.map((conversation) => (
                  <ThreadRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === conversationId}
                    onSelect={() => onSelectConversation(conversation.id)}
                    onRename={(title) =>
                      onRenameConversation(conversation.id, title)
                    }
                    onDelete={() => onDeleteConversation(conversation.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
