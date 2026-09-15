"use client";

import { useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type ComposerProps = {
  input: string;
  isLoading: boolean;
  disabled?: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
};

export function Composer({
  input,
  isLoading,
  disabled = false,
  composerRef,
  onChange,
  onSend,
  onStop,
}: ComposerProps) {
  useEffect(() => {
    const textarea = composerRef.current;

    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [composerRef, input]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape" && isLoading) {
      event.preventDefault();
      onStop();

      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden border border-border bg-secondary/30 shadow-sm transition-colors focus-within:border-foreground/20 focus-within:bg-background focus-within:shadow-md">
          <Textarea
            ref={composerRef}
            value={input}
            rows={1}
            placeholder="Message Pax Navigator..."
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-[220px] min-h-[48px] resize-none border-0 bg-transparent px-4 py-3 text-[14px] leading-6 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[11px] text-muted-foreground/50">
              {isLoading
                ? "Generating — press Esc or Stop to cancel"
                : "Enter to send · Shift+Enter for new line"}
            </span>
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                className="flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-[11px] font-medium text-primary-foreground transition-all hover:opacity-90"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={onSend}
                disabled={!input.trim() || disabled}
                aria-label="Send message"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
