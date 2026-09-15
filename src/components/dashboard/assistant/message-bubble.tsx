"use client";

import { BookOpen, Check, Copy, FileText, Sparkles } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "./markdown";
import { describeToolActivity } from "./tool-labels";
import type { Message, ToolActivity } from "./types";

function SourceIcon({ type }: { type: string }) {
  if (type === "irs" || type === "state") {
    return <BookOpen className="h-3 w-3" />;
  }

  return <FileText className="h-3 w-3" />;
}

function PulseDots() {
  return (
    <span className="flex items-center gap-1.5">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/40"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}

// Tool steps stream no text, so the server reports each tool call and the
// indicator names the step in progress instead of guessing.
function ToolActivityList({ activity }: { activity: ToolActivity[] }) {
  return (
    <ul className="space-y-1 py-1 text-[12px]" aria-live="polite">
      {activity.map((step) => (
        <li key={step.id} className="flex items-center gap-2">
          {step.status === "running" ? (
            <PulseDots />
          ) : (
            <Check className="h-3 w-3 text-muted-foreground/60" />
          )}
          <span
            className={
              step.status === "running"
                ? "text-foreground/80"
                : "text-muted-foreground"
            }
          >
            {describeToolActivity(step.name)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PendingIndicator() {
  return (
    <div className="flex items-center gap-2 py-2" aria-live="polite">
      <PulseDots />
    </div>
  );
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);

    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      toast.error("Could not copy to the clipboard.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label="Copy answer"
      className="flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

type MessageBubbleProps = {
  message: Message;
  isLoading: boolean;
};

export const MessageBubble = memo(function MessageBubble({
  message,
  isLoading,
}: MessageBubbleProps) {
  const isPending = message.content === "" && isLoading;

  // Tool steps can follow a first sentence, so the list stays visible under
  // partial text while any step is still running.
  const showActivity =
    isLoading &&
    !!message.activity?.length &&
    (isPending || message.activity.some((step) => step.status === "running"));

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group mb-5 last:mb-0"
    >
      {message.role === "user" ? (
        /* User message — right-aligned bubble */
        <div className="flex justify-end">
          <div className="max-w-[80%] bg-primary px-4 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
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
            {isPending && !showActivity ? <PendingIndicator /> : null}

            {message.content ? <Markdown source={message.content} /> : null}

            {showActivity && message.activity ? (
              <ToolActivityList activity={message.activity} />
            ) : null}

            {message.content && !isLoading ? (
              <div className="-ml-1.5 mt-1">
                <CopyButton content={message.content} />
              </div>
            ) : null}

            {message.citations?.length ? (
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Sources
                </span>
                <div className="space-y-1.5">
                  {message.citations.map((citation, citIndex) => (
                    <div
                      key={`${message.id}-${citIndex}`}
                      className="flex items-start gap-2.5 border border-border/60 bg-secondary/30 px-3 py-2.5"
                    >
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center bg-secondary text-muted-foreground">
                        <SourceIcon type={citation.sourceType} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-4 text-[9px] uppercase tracking-wider"
                          >
                            {citation.sourceType.replace("_", " ")}
                          </Badge>
                          {citation.sourceUrl ? (
                            <a
                              href={citation.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-xs font-medium underline-offset-2 hover:underline"
                            >
                              {citation.sourceTitle}
                            </a>
                          ) : (
                            <span className="truncate text-xs font-medium">
                              {citation.sourceTitle}
                            </span>
                          )}
                        </div>
                        {citation.section || citation.revision ? (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {[citation.section, citation.revision]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
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
});
