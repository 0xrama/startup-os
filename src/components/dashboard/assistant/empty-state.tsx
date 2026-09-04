"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/motion";

const SUGGESTED_PROMPTS = [
  {
    label: "Upcoming deadlines",
    prompt:
      "What are my next 3 compliance deadlines and what should I prepare now?",
  },
  {
    label: "Search documents",
    prompt:
      "Search my uploaded files for IRS or state notices that need action.",
  },
  {
    label: "Form 5472 timeline",
    prompt: "Explain my Form 5472 timeline in plain English for this LLC.",
  },
  {
    label: "Monthly checklist",
    prompt: "Create a simple monthly compliance checklist for this LLC.",
  },
] as const;

type EmptyStateProps = {
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  onSelectPrompt: (prompt: string) => void;
};

export function EmptyState({ composerRef, onSelectPrompt }: EmptyStateProps) {
  function handlePromptClick(prompt: string) {
    onSelectPrompt(prompt);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="heading-serif text-4xl tracking-tight">
            What can I help you with?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Ask about deadlines, filings, notices, or any compliance question
            for this LLC.
          </p>
        </div>

        <StaggerContainer className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.map((item) => (
            <StaggerItem key={item.label}>
              <button
                type="button"
                onClick={() => handlePromptClick(item.prompt)}
                className="group w-full border border-border bg-background px-5 py-4 text-left transition-all hover:border-foreground/20 hover:bg-secondary/40"
              >
                <span className="text-[13px] font-medium text-foreground">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {item.prompt}
                </span>
              </button>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-center">
          <AlertCircle className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
          <p className="text-[11px] text-muted-foreground/70">
            Pax Navigator provides informational guidance only, not legal, tax,
            or accounting advice.
          </p>
        </div>
      </div>
    </div>
  );
}
