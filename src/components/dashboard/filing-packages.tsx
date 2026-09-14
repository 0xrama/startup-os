"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileStack, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilingPackageSummary = {
  id: string;
  packageType: string;
  taxYear: number;
  version: number;
  status: string;
  title: string;
  fileName: string;
  checksum: string;
  byteSize: number;
  markedFiledAt: string | null;
  filedMethod: string | null;
  filedReference: string | null;
  createdAt: string;
};

const TYPE_LABELS = {
  form_5472_proforma_1120: "Form 5472 + pro forma 1120",
  form_1065: "Form 1065",
} as const;

const METHOD_LABELS = {
  fax: "Fax",
  mail: "Mail",
  "e-file": "E-file through your own provider",
  other: "Other",
} as const;

function labelFor(labels: Record<string, string>, key: string | null) {
  if (!key) return null;

  return labels[key] ?? null;
}

export function FilingPackages({ llcId }: { llcId: string }) {
  const [packages, setPackages] = useState<FilingPackageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [filedMethod, setFiledMethod] = useState("fax");
  const [filedReference, setFiledReference] = useState("");
  const [filedAt, setFiledAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    try {
      const response = await fetch(`/api/llcs/${llcId}/packages`, {
        cache: "no-store",
      });

      if (!response.ok) return;

      // SAFETY: the packages endpoint serializes document_packages rows
      // selected by the summary shape above (content column excluded).
      setPackages((await response.json()) as FilingPackageSummary[]);
    } finally {
      setLoading(false);
    }
  }, [llcId]);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  async function generatePackage() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/llcs/${llcId}/packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      // SAFETY: error responses from the packages API are validated at the
      // route with Zod; the shape here is only read for an optional message.
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setError(result?.error ?? "Could not generate the package.");

        return;
      }

      toast.success("Draft package created");
      await loadPackages();
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPackage(packageId: string) {
    const response = await fetch(`/api/llcs/${llcId}/packages/${packageId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      toast.error("Could not download the package.");

      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download =
      packages.find((item) => item.id === packageId)?.fileName ?? "package.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function markFiled(packageId: string) {
    setError(null);

    const response = await fetch(
      `/api/llcs/${llcId}/packages/${packageId}/mark-filed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filedMethod,
          filedReference: filedReference || undefined,
          filedAt: filedAt || undefined,
        }),
      }
    );

    // SAFETY: mark-filed responses are validated at the route with Zod; the
    // shape here is only read for optional error/message strings.
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      setError(result?.error ?? "Could not record the filing.");

      return;
    }

    toast.success(result?.message ?? "Recorded as filed by you");
    setMarkingId(null);
    setFiledReference("");
    setFiledAt("");
    await loadPackages();
  }

  return (
    <section className="mb-10 border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 heading-serif text-xl">
            <FileStack className="h-5 w-5 text-primary" />
            Filing packages
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Draft preparation packages you download and file yourself. Each
            version is frozen with a checksum. Downloading is not filing: Pax
            never transmits anything, and a marked-filed status is your record,
            not a verified submission.
          </p>
        </div>
        <Button
          onClick={() => void generatePackage()}
          disabled={generating}
          className="btn-warm border-0"
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate draft
        </Button>
      </div>

      {error ? (
        <p className="border-b border-border bg-destructive/5 px-5 py-3 text-xs text-destructive sm:px-6">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="px-5 py-6 text-xs text-muted-foreground sm:px-6">
          Loading packages…
        </p>
      ) : packages.length === 0 ? (
        <p className="px-5 py-6 text-xs text-muted-foreground sm:px-6">
          No packages yet. Generate a draft to produce a versioned preparation
          document for the current tax year.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {packages.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {labelFor(TYPE_LABELS, item.packageType) ??
                      item.packageType}{" "}
                    · {item.taxYear}
                  </p>
                  <Badge variant="secondary">v{item.version}</Badge>
                  {item.status === "marked_filed" ? (
                    <Badge variant="secondary">
                      Filed by you
                      {item.markedFiledAt
                        ? ` · ${new Date(item.markedFiledAt).toISOString().slice(0, 10)}`
                        : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                  {item.filedMethod ? (
                    <span className="text-[11px] text-muted-foreground">
                      via{" "}
                      {labelFor(METHOD_LABELS, item.filedMethod) ??
                        item.filedMethod}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  sha256 {item.checksum.slice(0, 16)}… ·{" "}
                  {(item.byteSize / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {markingId === item.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={filedMethod}
                        onChange={(event) => setFiledMethod(event.target.value)}
                        className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                      >
                        {Object.entries(METHOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={filedAt}
                        onChange={(event) => setFiledAt(event.target.value)}
                        className="h-9 w-36 text-xs"
                      />
                      <Input
                        placeholder="Reference (optional)"
                        value={filedReference}
                        onChange={(event) =>
                          setFiledReference(event.target.value)
                        }
                        className="h-9 w-40 text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void markFiled(item.id)}
                        className="btn-warm border-0"
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Record as filed
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMarkingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void downloadPackage(item.id)}
                      className="hover:text-primary"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {item.status === "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMarkingId(item.id)}
                      >
                        Mark filed
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
