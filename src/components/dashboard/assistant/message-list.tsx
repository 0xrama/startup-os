"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import type { Message } from "./types";

type MessageListProps = {
  messages: Message[];
  isLoading: boolean;
  loadingMessages: boolean;
  viewportRef: React.RefObject<HTMLDivElement | null>;
};

export function MessageList({
  messages,
  isLoading,
  loadingMessages,
  viewportRef,
}: MessageListProps) {
  const hasMessages = messages.length > 0;

  return (
    <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto">
      {loadingMessages ? (
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
          <div className="flex gap-3">
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-secondary" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-3/4 rounded" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
          </div>
          <div className="flex gap-3">
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-secondary" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="mt-2 h-4 w-5/6 rounded" />
              <Skeleton className="mt-2 h-4 w-2/3 rounded" />
            </div>
          </div>
        </div>
      ) : hasMessages ? (
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isLoading={isLoading}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
