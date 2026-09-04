"use client";

import { MessageSquare, PanelLeftClose, Plus, RefreshCw } from "lucide-react";
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
  assistantCapLabel: string | null;
  isAdminBypass: boolean;
  sidebarOpen: boolean;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onCloseSidebar: () => void;
  onRetryThreads: () => void;
};

export function ThreadSidebar({
  conversations,
  conversationId,
  loadingThreads,
  threadError,
  assistantCapLabel,
  isAdminBypass,
  sidebarOpen,
  onSelectConversation,
  onNewConversation,
  onCloseSidebar,
  onRetryThreads,
}: ThreadSidebarProps) {
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease }}
          className="flex-shrink-0 flex-col overflow-hidden border-r border-border bg-secondary/20"
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
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="New thread"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onCloseSidebar}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Close sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {loadingThreads ? (
              <div className="space-y-1">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-lg px-3 py-2.5">
                    <Skeleton className="h-3.5 w-3/4 rounded" />
                    <Skeleton className="mt-2 h-2.5 w-1/3 rounded" />
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
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => onSelectConversation(conversation.id)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                      conversation.id === conversationId
                        ? "bg-secondary text-foreground"
                        : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">
                        {conversation.title || "Untitled"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(conversation.updatedAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {assistantCapLabel || isAdminBypass ? (
            <div className="border-t border-border px-3 py-2.5">
              {isAdminBypass ? (
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-medium text-amber-600">
                    Admin — billing gates bypassed
                  </span>
                </div>
              ) : null}
              {assistantCapLabel ? (
                <span className="text-[11px] text-muted-foreground">
                  {assistantCapLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
