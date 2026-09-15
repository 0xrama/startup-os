"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import type { Message } from "./types";

type MessageListProps = {
  messages: Message[];
  isLoading: boolean;
  loadingMessages: boolean;
  hasOlderMessages: boolean;
  loadingOlderMessages: boolean;
  onLoadOlder: () => void;
};

export function MessageList({
  messages,
  isLoading,
  loadingMessages,
  hasOlderMessages,
  loadingOlderMessages,
  onLoadOlder,
}: MessageListProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);
  // Scroll height captured when older messages are requested, so prepending
  // them keeps the message the reader was looking at in place.
  const anchorHeight = useRef<number | null>(null);
  const hasMessages = messages.length > 0;
  const lastMessage = messages.at(-1);
  const firstMessageId = messages[0]?.id;

  // Follow the stream only while the reader is already at the bottom, so
  // scrolling up to re-read an earlier answer is not undone by the next token.
  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const viewport = event.currentTarget;

    pinnedToBottom.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
  }

  function loadOlder() {
    anchorHeight.current = viewportRef.current?.scrollHeight ?? null;
    onLoadOlder();
  }

  useEffect(() => {
    if (loadingMessages) pinnedToBottom.current = true;
  }, [loadingMessages]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || anchorHeight.current === null) return;
    viewport.scrollTop += viewport.scrollHeight - anchorHeight.current;
    anchorHeight.current = null;
  }, [firstMessageId]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !pinnedToBottom.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [lastMessage, isLoading]);

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto"
    >
      {loadingMessages ? (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
          <div className="flex gap-3">
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-secondary" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-2/3" />
          </div>
          <div className="flex gap-3">
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-secondary" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          </div>
        </div>
      ) : hasMessages ? (
        <div className="mx-auto max-w-3xl px-4 py-6">
          {hasOlderMessages ? (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                className="border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                disabled={loadingOlderMessages || isLoading}
                onClick={loadOlder}
              >
                {loadingOlderMessages ? "Loading…" : "Load earlier messages"}
              </button>
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading && message === messages[messages.length - 1]}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
