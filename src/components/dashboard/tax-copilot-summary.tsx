"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEncryption } from "@/components/security/encryption-provider";
import { decryptJson, type CipherPayload } from "@/lib/e2ee";
import type { SecureLlcPayload } from "@/lib/secure-llc";
import {
  assessFederalTaxFiling,
  buildPreparationChecks,
  type TaxEntityProfile,
} from "@/lib/tax-copilot";

type TaxCopilotSummaryProps = {
  llcId: string;
  profile: TaxEntityProfile;
  encryptedData: CipherPayload | null;
};

function statusIcon(status: "complete" | "action_needed" | "review") {
  if (status === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  }

  if (status === "review") {
    return <CircleAlert className="h-4 w-4 text-amber-700" />;
  }

  return <AlertTriangle className="h-4 w-4 text-destructive" />;
}

export function TaxCopilotSummary({
  llcId,
  profile,
  encryptedData,
}: TaxCopilotSummaryProps) {
  const { masterKey } = useEncryption();

  const [securePayload, setSecurePayload] = useState<SecureLlcPayload | null>(
    profile.ein || profile.members
      ? {
          ein: profile.ein ?? null,
          registeredAgent: null,
          members: profile.members ?? [],
        }
      : null
  );

  useEffect(() => {
    let cancelled = false;

    async function decrypt() {
      if (!masterKey || !encryptedData) return;

      const value = await decryptJson<SecureLlcPayload>(
        masterKey,
        encryptedData
      );

      if (!cancelled) setSecurePayload(value);
    }

    void decrypt().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [encryptedData, masterKey]);

  const mergedProfile = useMemo(
    () => ({
      ...profile,
      ein: securePayload?.ein ?? profile.ein,
      members: securePayload?.members ?? profile.members,
    }),
    [profile, securePayload]
  );

  const assessment = useMemo(
    () => assessFederalTaxFiling(mergedProfile),
    [mergedProfile]
  );

  const checks = useMemo(
    () => buildPreparationChecks(mergedProfile, assessment),
    [assessment, mergedProfile]
  );

  const completeCount = checks.filter(
    (check) => check.status === "complete"
  ).length;

  return (
    <section className="mb-10 overflow-hidden border border-border bg-background">
      <div className="border-b border-border bg-secondary/30 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Federal tax copilot
              </p>
            </div>
            <h2 className="heading-serif text-2xl">{assessment.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {assessment.summary}
            </p>
          </div>
          <Badge
            variant={
              assessment.status === "needs_review" ? "destructive" : "secondary"
            }
            className="w-fit"
          >
            {assessment.status.replaceAll("_", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="border-b border-border p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex flex-wrap gap-2">
            {assessment.forms.map((form) => (
              <Badge key={form} variant="secondary">
                {form}
              </Badge>
            ))}
          </div>

          {assessment.status === "needs_review" &&
          assessment.reasons.length > 0 ? (
            <div className="mb-6 border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="text-sm font-medium">
                Confirm the ownership profile
              </p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                {assessment.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="mb-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Tax year</dt>
              <dd className="mt-1 font-mono font-medium">
                {assessment.taxYear}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Calculated filing date
              </dt>
              <dd className="mt-1 font-mono font-medium">
                {assessment.dueDate ?? "Depends on owner return"}
              </dd>
            </div>
          </dl>

          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-3 border border-border/70 px-3 py-3"
              >
                <div className="mt-0.5">{statusIcon(check.status)}</div>
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    {check.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="p-5 sm:p-6">
          <p className="text-sm font-medium">
            Profile readiness: {completeCount}/{checks.length}
          </p>
          <div className="mt-3 h-2 overflow-hidden bg-secondary">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(completeCount / checks.length) * 100}%` }}
            />
          </div>

          {assessment.warnings.length ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Review flags
              </p>
              {assessment.warnings.map((warning) => (
                <p
                  key={warning}
                  className="border-l-2 border-amber-500 pl-3 text-xs leading-5 text-muted-foreground"
                >
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official sources
            </p>
            {assessment.sources.map((source) => (
              <a
                key={`${source.title}-${source.revision}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 border border-border/70 px-3 py-2 text-xs hover:bg-secondary/40"
              >
                <span>
                  {source.title} · {source.revision}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ))}
          </div>

          <Button
            className="mt-6 w-full"
            render={<Link href={`/dashboard/llc/${llcId}/assistant`} />}
          >
            Review with Pax
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
            Filing dates are calculated from the saved tax year end and rolled
            for weekends. Confirm legal-holiday changes before filing.
          </p>
        </aside>
      </div>
    </section>
  );
}
