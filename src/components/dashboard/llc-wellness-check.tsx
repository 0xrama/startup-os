"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEncryption } from "@/components/security/encryption-provider";
import { decryptJson, type CipherPayload } from "@/lib/e2ee";
import type { SecureLlcPayload } from "@/lib/secure-llc";
import {
  assessLlcWellness,
  getEinFaxGuide,
  type WellnessDocument,
  type WellnessProfile,
  type WellnessTask,
} from "@/lib/llc-wellness";
import type { TaxEntityProfile } from "@/lib/tax-copilot";

type LlcWellnessCheckProps = {
  llcId: string;
  profile: TaxEntityProfile;
  encryptedData: CipherPayload | null;
  fallbackRegisteredAgent: string | null;
  documents: WellnessDocument[];
  tasks: WellnessTask[];
  initialWellness: WellnessProfile | null;
};

const BOOLEAN_FIELDS: Array<{
  key: keyof Pick<
    WellnessProfile,
    | "hasUSBankAccount"
    | "bookkeepingCurrent"
    | "hasEmployees"
    | "usesContractors"
    | "makesTaxableSales"
    | "operatesOutsideFormationState"
  >;
  label: string;
}> = [
  { key: "hasUSBankAccount", label: "Separate U.S. business bank account" },
  { key: "bookkeepingCurrent", label: "Bookkeeping is current" },
  { key: "hasEmployees", label: "Has employees" },
  { key: "usesContractors", label: "Uses contractors" },
  { key: "makesTaxableSales", label: "May make taxable sales" },
  {
    key: "operatesOutsideFormationState",
    label: "Operates outside the formation state",
  },
];

function checkIcon(status: string) {
  if (status === "healthy") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-700" />;
  }

  if (status === "action_needed") {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  return <CircleAlert className="h-4 w-4 text-amber-700" />;
}

function setBooleanField(
  wellness: WellnessProfile,
  key: (typeof BOOLEAN_FIELDS)[number]["key"],
  checked: boolean
) {
  return { ...wellness, [key]: checked };
}

function parseBusinessStatus(value: string): WellnessProfile["businessStatus"] {
  if (
    value === "not_started" ||
    value === "pre_revenue" ||
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }

  return undefined;
}

function parseYesNoUnsure(
  value: string
): WellnessProfile["engagedInUSTradeOrBusiness"] {
  if (value === "yes" || value === "no" || value === "unsure") return value;

  return "unsure";
}

function parsePrincipalPlace(
  value: string
): WellnessProfile["principalPlaceOfBusiness"] {
  if (value === "us" || value === "outside_us" || value === "unsure") {
    return value;
  }

  return "unsure";
}

export function LlcWellnessCheck({
  llcId,
  profile,
  encryptedData,
  fallbackRegisteredAgent,
  documents,
  tasks,
  initialWellness,
}: LlcWellnessCheckProps) {
  const { masterKey } = useEncryption();

  const [securePayload, setSecurePayload] = useState<SecureLlcPayload | null>(
    profile.ein || profile.members || fallbackRegisteredAgent
      ? {
          ein: profile.ein ?? null,
          registeredAgent: fallbackRegisteredAgent,
          members: profile.members ?? [],
        }
      : null
  );

  const [wellness, setWellness] = useState<WellnessProfile>(
    initialWellness ?? {}
  );

  const [showQuestionnaire, setShowQuestionnaire] = useState(
    !initialWellness?.businessStatus
  );

  const [showEinGuide, setShowEinGuide] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

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
    () =>
      assessLlcWellness({ profile: mergedProfile, wellness, documents, tasks }),
    [documents, mergedProfile, tasks, wellness]
  );

  const einGuide = useMemo(
    () =>
      getEinFaxGuide({
        profile: mergedProfile,
        principalPlaceOfBusiness: wellness.principalPlaceOfBusiness,
      }),
    [mergedProfile, wellness.principalPlaceOfBusiness]
  );

  function saveWellness() {
    const payload = {
      ...wellness,
      engagedInUSTradeOrBusiness:
        wellness.engagedInUSTradeOrBusiness ?? "unsure",
      principalPlaceOfBusiness: wellness.principalPlaceOfBusiness ?? "unsure",
      hasUSBankAccount: wellness.hasUSBankAccount ?? false,
      bookkeepingCurrent: wellness.bookkeepingCurrent ?? false,
      hasEmployees: wellness.hasEmployees ?? false,
      usesContractors: wellness.usesContractors ?? false,
      makesTaxableSales: wellness.makesTaxableSales ?? false,
      operatesOutsideFormationState:
        wellness.operatesOutsideFormationState ?? false,
      updatedAt: new Date().toISOString(),
    };

    setWellness(payload);

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/llcs/${llcId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wellnessProfile: payload }),
        });

        if (!response.ok) {
          toast.error("Could not save the wellness check.");

          return;
        }

        setShowQuestionnaire(false);
        toast.success("LLC wellness check saved.");
      })();
    });
  }

  async function downloadOperatingAgreement() {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/llcs/${llcId}/operating-agreement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registeredAgent: securePayload?.registeredAgent,
          businessPurpose: wellness.businessDescription,
          members: securePayload?.members ?? profile.members ?? [],
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("content-disposition");
      const match = /filename="([^"]+)"/.exec(disposition ?? "");

      anchor.href = url;
      anchor.download = match?.[1] ?? "operating-agreement-draft.md";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Operating agreement draft downloaded.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the operating agreement draft."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const visibleChecks = assessment.checks.filter(
    (check) => check.status !== "not_applicable"
  );

  const agreementMissing = assessment.checks.some(
    (check) =>
      check.id === "operating-agreement" && check.status === "action_needed"
  );

  const einMissing = assessment.checks.some(
    (check) => check.id === "ein" && check.status === "action_needed"
  );

  const showInternationalEinOption =
    einMissing && mergedProfile.ownerResidency === "non_us";

  return (
    <section className="mt-10 border border-border bg-background">
      <div className="flex flex-col gap-4 border-b border-border bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              LLC wellness check
            </p>
          </div>
          <h2 className="heading-serif text-2xl">{assessment.score}% ready</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {assessment.headline}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowQuestionnaire((current) => !current)}
        >
          {showQuestionnaire ? "Close questionnaire" : "Update activity"}
        </Button>
      </div>

      {showQuestionnaire ? (
        <div className="border-b border-border p-5 sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="business-status">Current operating status</Label>
              <select
                id="business-status"
                value={wellness.businessStatus ?? ""}
                onChange={(event) =>
                  setWellness((current) => ({
                    ...current,
                    businessStatus: parseBusinessStatus(event.target.value),
                  }))
                }
                className="h-9 w-full border border-input bg-background px-3 text-sm"
              >
                <option value="">Select status</option>
                <option value="not_started">Not started</option>
                <option value="pre_revenue">Active but pre-revenue</option>
                <option value="active">Actively doing business</option>
                <option value="inactive">Inactive or dormant</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="us-trade-business">
                Engaged in a U.S. trade or business?
              </Label>
              <select
                id="us-trade-business"
                value={wellness.engagedInUSTradeOrBusiness ?? "unsure"}
                onChange={(event) =>
                  setWellness((current) => ({
                    ...current,
                    engagedInUSTradeOrBusiness: parseYesNoUnsure(
                      event.target.value
                    ),
                  }))
                }
                className="h-9 w-full border border-input bg-background px-3 text-sm"
              >
                <option value="unsure">Unsure</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="principal-business">
                Principal place of business
              </Label>
              <select
                id="principal-business"
                value={wellness.principalPlaceOfBusiness ?? "unsure"}
                onChange={(event) =>
                  setWellness((current) => ({
                    ...current,
                    principalPlaceOfBusiness: parsePrincipalPlace(
                      event.target.value
                    ),
                  }))
                }
                className="h-9 w-full border border-input bg-background px-3 text-sm"
              >
                <option value="unsure">Unsure</option>
                <option value="us">United States</option>
                <option value="outside_us">Outside the United States</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-description">Business activity</Label>
              <Input
                id="business-description"
                value={wellness.businessDescription ?? ""}
                onChange={(event) =>
                  setWellness((current) => ({
                    ...current,
                    businessDescription: event.target.value,
                  }))
                }
                placeholder="Software consulting, online retail, holding company…"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BOOLEAN_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-3 border border-border/70 px-3 py-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={wellness[field.key] === true}
                  onChange={(event) =>
                    setWellness((current) =>
                      setBooleanField(current, field.key, event.target.checked)
                    )
                  }
                />
                {field.label}
              </label>
            ))}
          </div>

          <Button
            onClick={saveWellness}
            disabled={isPending || !wellness.businessStatus}
            className="mt-5"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save wellness check
          </Button>
        </div>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
        <div className="divide-y divide-border lg:border-r lg:border-border">
          {visibleChecks.map((check) => (
            <div key={check.id} className="flex gap-3 px-5 py-4 sm:px-6">
              <div className="mt-0.5">{checkIcon(check.status)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{check.title}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {check.category}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {check.explanation}
                </p>
                {check.action ? (
                  <p className="mt-1 text-xs font-medium">
                    Next: {check.action}
                  </p>
                ) : null}
                {check.source ? (
                  <a
                    href={check.source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {check.source.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-5 p-5 sm:p-6">
          {agreementMissing ? (
            <div>
              <p className="text-sm font-medium">Operating agreement missing</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Generate a starter Markdown draft using the saved LLC and owner
                information. Review state-specific terms before signing.
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => void downloadOperatingAgreement()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Create agreement draft
              </Button>
            </div>
          ) : null}

          {showInternationalEinOption ? (
            <div className="border-t border-border pt-5">
              <p className="text-sm font-medium">
                International EIN application
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Get the current Form SS-4 fax numbers and line-by-line notes for
                a foreign-owned U.S. LLC.
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setShowEinGuide((current) => !current)}
              >
                {showEinGuide ? "Hide EIN guide" : "Show EIN fax guide"}
              </Button>
            </div>
          ) : null}
        </aside>
      </div>

      {showEinGuide && showInternationalEinOption ? (
        <div className="border-t border-border bg-secondary/20 p-5 sm:p-6">
          <h3 className="text-base font-semibold">{einGuide.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {einGuide.important}
          </p>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fax number
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {einGuide.faxNumbers.map((number) => (
                <li key={number}>{number}</li>
              ))}
            </ul>
          </div>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6">
            {einGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            {einGuide.timing}
          </p>
          <a
            href={einGuide.source.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
          >
            Open official Form SS-4 instructions
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}
    </section>
  );
}
