"use client";

type BannerTone = "info" | "warning" | "error";

const TONE_CLASS = {
  info: "border-border bg-secondary/40 text-muted-foreground",
  warning: "border-border bg-secondary text-foreground",
  error: "border-destructive/20 bg-destructive/5 text-destructive",
} as const;

type StatusBannerProps = {
  tone: BannerTone;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean };
};

export function StatusBanner({ tone, children, action }: StatusBannerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pt-3">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`flex items-center justify-between gap-3 border px-4 py-2.5 text-xs ${TONE_CLASS[tone]}`}
      >
        <span>{children}</span>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="flex-shrink-0 border border-current px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-background/60 disabled:opacity-50"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
