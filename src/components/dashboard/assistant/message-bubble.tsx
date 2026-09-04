"use client";

import { BookOpen, FileText, Sparkles } from "lucide-react";
import { motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import type { Message } from "./types";

function SourceIcon({ type }: { type: string }) {
  if (type === "irs" || type === "state") {
    return <BookOpen className="h-3 w-3" />;
  }
  return <FileText className="h-3 w-3" />;
}

type MessageBubbleProps = {
  message: Message;
  isLoading: boolean;
};

export function MessageBubble({ message, isLoading }: MessageBubbleProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5 last:mb-0"
    >
      {message.role === "user" ? (
        /* User message — right-aligned bubble */
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ) : (
        /* Assistant message — left-aligned with avatar */
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {message.content === "" && isLoading ? (
              <div className="flex items-center gap-1.5 py-2">
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
                  style={{ animationDelay: "0s" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
                  style={{ animationDelay: "0.3s" }}
                />
              </div>
            ) : (
              <div className="text-[14px] leading-7 text-foreground/90">
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )}

            {message.citations?.length ? (
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Sources
                </span>
                <div className="space-y-1.5">
                  {message.citations.map((citation, citIndex) => (
                    <div
                      key={`${message.id}-${citIndex}`}
                      className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2.5"
                    >
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-secondary text-muted-foreground">
                        <SourceIcon type={citation.sourceType} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-4 rounded text-[9px] uppercase tracking-wider"
                          >
                            {citation.sourceType.replace("_", " ")}
                          </Badge>
                          <span className="truncate text-xs font-medium">
                            {citation.sourceTitle}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {citation.excerpt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </motion.article>
  );
}
