"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type ComposerProps = {
  input: string;
  isLoading: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

export function Composer({
  input,
  isLoading,
  composerRef,
  onChange,
  onSend,
  onKeyDown,
}: ComposerProps) {
  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30 shadow-sm transition-colors focus-within:border-foreground/20 focus-within:bg-background focus-within:shadow-md">
          <Textarea
            ref={composerRef}
            value={input}
            rows={1}
            placeholder="Message Pax Navigator..."
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="max-h-[220px] min-h-[48px] resize-none border-0 bg-transparent px-4 py-3 text-[14px] leading-6 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[11px] text-muted-foreground/50">
              Enter to send · Shift+Enter for new line
            </span>
            <button
              type="button"
              onClick={onSend}
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
