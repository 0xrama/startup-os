"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  FileText,
  Users,
  Bell,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { useEncryption } from "@/components/security/encryption-provider";
import { encryptJson } from "@/lib/e2ee";
import { summarizeOwnerTaxStatuses } from "@/lib/ownership-scope";

const STEPS = [
  { id: "entity", label: "Entity", icon: Building2 },
  { id: "state", label: "State & EIN", icon: MapPin },
  { id: "tax", label: "Tax Info", icon: FileText },
  { id: "members", label: "Members", icon: Users },
  { id: "preferences", label: "Preferences", icon: Bell },
] as const;

const US_STATES = [
  { value: "WY", label: "Wyoming" },
  { value: "NM", label: "New Mexico" },
  { value: "FL", label: "Florida" },
  { value: "DE", label: "Delaware" },
  { value: "TX", label: "Texas" },
  { value: "NV", label: "Nevada" },
  { value: "CO", label: "Colorado" },
  { value: "CA", label: "California" },
  { value: "NY", label: "New York" },
  { value: "WA", label: "Washington" },
  { value: "OTHER", label: "Other state" },
];

const ENTITY_TYPES = [
  {
    value: "single-member",
    label: "Single-Member LLC",
    desc: "One owner, best for straightforward solo businesses",
  },
  {
    value: "multi-member",
    label: "Multi-Member LLC",
    desc: "Two or more owners with basic shared operations",
  },
];

const TAX_CLASSIFICATIONS = [
  {
    value: "disregarded",
    label: "Disregarded Entity",
    desc: "Default for single-member",
  },
  {
    value: "partnership",
    label: "Partnership",
    desc: "Default for multi-member",
  },
];

type MemberEntry = {
  name: string;
  ownershipPct: number;
  country: string;
  taxIdType: string;
  usTaxStatus?: "us_person" | "foreign_person";
};

type LlcSummary = {
  id: string;
  name: string;
  state: string;
  entityType: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadEntities() {
  const response = await fetch("/api/llcs", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) return [];

  // SAFETY: /api/llcs returns LLC rows with the id, name, state, and entityType
  // fields selected by LlcSummary.
  return (await response.json()) as LlcSummary[];
}

async function recoverCreatedEntity({
  name,
  state,
  entityType,
}: Omit<LlcSummary, "id">) {
  for (const delay of [250, 750, 1500]) {
    await wait(delay);

    try {
      const entities = await loadEntities();

      const match = entities.find(
        (entity) =>
          entity.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          entity.state === state &&
          entity.entityType === entityType
      );

      if (match) return match;
    } catch {
      // The development server may still be restarting; retry briefly.
    }
  }

  return null;
}

function getTaxClassificationOptions(entityType: string) {
  if (entityType === "single-member") {
    return TAX_CLASSIFICATIONS.filter(
      (option) => option.value === "disregarded"
    );
  }

  return TAX_CLASSIFICATIONS.filter((option) => option.value === "partnership");
}

export default function OnboardingPage() {
  const router = useRouter();
  const { masterKey, unlocked, configured } = useEncryption();
  const whatsappAvailable = process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true";
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [state, setState] = useState("");
  const [formationDate, setFormationDate] = useState("");
  const [ein, setEin] = useState("");
  const [einStatus, setEinStatus] = useState("pending");
  const [taxClassification, setTaxClassification] = useState("");
  const taxYearEnd = "12-31";
  const [registeredAgent, setRegisteredAgent] = useState("");
  const [raRenewalDate, setRaRenewalDate] = useState("");

  const [members, setMembers] = useState<MemberEntry[]>([
    {
      name: "",
      ownershipPct: 100,
      country: "",
      taxIdType: "",
      usTaxStatus: undefined,
    },
  ]);

  const [ownersAreIndividuals, setOwnersAreIndividuals] = useState(false);
  const [ownershipIsDirect, setOwnershipIsDirect] = useState(false);

  const [remindDaysBefore, setRemindDaysBefore] = useState(30);
  const [channels, setChannels] = useState<string[]>(["email"]);

  const [wyAnnualFeeReminderEnabled, setWyAnnualFeeReminderEnabled] =
    useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") return;

    let cancelled = false;

    void loadEntities()
      .then((entities) => {
        if (!cancelled && entities[0]) {
          router.replace(`/dashboard/llc/${entities[0].id}`);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (entityType !== "single-member") return;

    setMembers((current) => {
      const primary = current[0] ?? {
        name: "",
        ownershipPct: 100,
        country: "",
        taxIdType: "",
        usTaxStatus: undefined,
      };

      if (current.length === 1 && primary.ownershipPct === 100) {
        return current;
      }

      return [{ ...primary, ownershipPct: 100 }];
    });
  }, [entityType]);

  useEffect(() => {
    const allowed = getTaxClassificationOptions(entityType).map(
      (option) => option.value
    );

    if (!entityType || allowed.includes(taxClassification)) return;

    if (entityType === "single-member") {
      setTaxClassification("disregarded");
    } else if (entityType === "multi-member") {
      setTaxClassification("partnership");
    }
  }, [entityType, taxClassification]);

  const availableTaxClassifications = getTaxClassificationOptions(entityType);

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return !!name && !!entityType;
      case 1:
        return !!state;
      case 2:
        return !!taxClassification;
      case 3:
        return (
          ownersAreIndividuals &&
          ownershipIsDirect &&
          members.every(
            (member) =>
              member.name &&
              member.country &&
              member.taxIdType &&
              member.usTaxStatus &&
              member.ownershipPct > 0
          ) &&
          Math.abs(
            members.reduce((total, member) => total + member.ownershipPct, 0) -
              100
          ) < 0.01 &&
          (entityType === "single-member"
            ? members.length === 1
            : members.length >= 2)
        );
      case 4:
        return channels.length > 0;
      default:
        return true;
    }
  }

  function addMember() {
    setMembers([
      ...members,
      {
        name: "",
        ownershipPct: 0,
        country: "",
        taxIdType: "",
        usTaxStatus: undefined,
      },
    ]);
  }

  function updateMember(index: number, patch: Partial<MemberEntry>) {
    const updated = [...members];
    updated[index] = { ...updated[index], ...patch };
    setMembers(updated);
  }

  function removeMember(index: number) {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit() {
    if (configured && !masterKey) {
      setError("Unlock your vault to continue.");

      return;
    }

    setLoading(true);
    setError("");

    try {
      const encryptedData = masterKey
        ? await encryptJson(masterKey, {
            ein: ein || null,
            registeredAgent: registeredAgent || null,
            members,
          })
        : null;

      const { foreignOwnerCount, usOwnerCount } =
        summarizeOwnerTaxStatuses(members);

      const ownershipTotal = members.reduce(
        (total, member) => total + member.ownershipPct,
        0
      );

      const res = await fetch("/api/llcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          entityType,
          ownersAreIndividuals,
          ownershipIsDirect,
          ownershipSummary: {
            ownerCount: members.length,
            foreignOwnerCount,
            usOwnerCount,
            ownershipTotal,
          },
          state,
          formationDate: formationDate || null,
          ein: masterKey ? null : ein || null,
          einStatus,
          taxClassification,
          taxYearEnd,
          registeredAgent: masterKey ? null : registeredAgent || null,
          raRenewalDate: raRenewalDate || null,
          members: masterKey ? [] : members,
          filingPreferences: {
            remindDaysBefore,
            channels,
            wyAnnualFeeReminderEnabled:
              state === "WY" && wyAnnualFeeReminderEnabled,
          },
          encryptedData,
        }),
      });

      const responseText = await res.text();

      // SAFETY: the LLC creation endpoint returns either a created LLC with an
      // id or a JSON error object, and only those two fields are read here.
      const data = responseText
        ? (JSON.parse(responseText) as { id?: string; error?: string })
        : null;

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create entity");
      }

      if (!data?.id) {
        throw new Error("The server returned an incomplete response.");
      }

      router.replace(`/dashboard/llc/${data.id}`);
      router.refresh();
    } catch (err) {
      const recoveredEntity = await recoverCreatedEntity({
        name,
        state,
        entityType,
      });

      if (recoveredEntity) {
        router.replace(`/dashboard/llc/${recoveredEntity.id}`);
        router.refresh();

        return;
      }

      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-2xl w-full px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="heading-serif text-xl block mb-6">Pax</span>
          {unlocked ? (
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Vault unlocked
            </p>
          ) : null}
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-0 sm:gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    i < step
                      ? "bg-primary text-white shadow-sm"
                      : i === step
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs mt-1.5 transition-colors duration-300 ${
                    i <= step
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden sm:block w-12 lg:w-16 h-0.5 mx-1.5 mt-[-18px] rounded-full transition-colors duration-500 ${
                    i < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card-warm p-8">
          {/* Step 0: Entity */}
          {step === 0 && (
            <>
              <div className="mb-6">
                <h2 className="heading-serif text-2xl mb-1">
                  What&apos;s your entity called?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pax currently supports direct individual ownership in
                  single-member and multi-member LLCs.
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="llc-name">Legal entity name</Label>
                  <Input
                    id="llc-name"
                    placeholder="e.g., Acme Services LLC"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Entity type</Label>
                  <div className="grid gap-3">
                    {ENTITY_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEntityType(t.value)}
                        className={`text-left rounded-lg border p-4 transition-all ${
                          entityType === t.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
                  Companies, trusts, indirect ownership, corporations, and LLC
                  corporate-tax elections are outside the current supported
                  scope.
                </div>
              </div>
            </>
          )}

          {/* Step 1: State & EIN */}
          {step === 1 && (
            <>
              <div className="mb-6">
                <h2 className="heading-serif text-2xl mb-1">
                  Where is it formed?
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select the formation state and add your EIN details if
                  available.
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Formation state</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {US_STATES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setState(s.value)}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                          state === s.value
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formation-date">Formation date</Label>
                  <Input
                    id="formation-date"
                    type="date"
                    value={formationDate}
                    onChange={(e) => setFormationDate(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label>EIN status</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "received", label: "I have an EIN" },
                      { value: "pending", label: "Applied / Pending" },
                      { value: "not_needed", label: "Not needed yet" },
                    ].map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setEinStatus(s.value)}
                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-all ${
                          einStatus === s.value
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                {einStatus === "received" && (
                  <div className="space-y-2">
                    <Label htmlFor="ein">EIN</Label>
                    <Input
                      id="ein"
                      placeholder="XX-XXXXXXX"
                      value={ein}
                      onChange={(e) => setEin(e.target.value)}
                      className="h-11 font-mono"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="ra">Registered agent (optional)</Label>
                  <Input
                    id="ra"
                    placeholder="e.g., Northwest Registered Agent"
                    value={registeredAgent}
                    onChange={(e) => setRegisteredAgent(e.target.value)}
                    className="h-11"
                  />
                </div>
                {registeredAgent && (
                  <div className="space-y-2">
                    <Label htmlFor="ra-renewal">
                      RA renewal date (optional)
                    </Label>
                    <Input
                      id="ra-renewal"
                      type="date"
                      value={raRenewalDate}
                      onChange={(e) => setRaRenewalDate(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: Tax Info */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <h2 className="heading-serif text-2xl mb-1">
                  Tax classification
                </h2>
                <p className="text-sm text-muted-foreground">
                  How is this entity classified for federal tax purposes?
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Classification</Label>
                  <div className="grid gap-3">
                    {availableTaxClassifications.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTaxClassification(t.value)}
                        className={`text-left rounded-lg border p-4 transition-all ${
                          taxClassification === t.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className="font-medium text-sm">{t.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-year-end">Tax year end</Label>
                  <Input
                    id="tax-year-end"
                    value={taxYearEnd}
                    readOnly
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    The first supported release is limited to calendar-year
                    entities ending 12-31.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Members */}
          {step === 3 && (
            <>
              <div className="mb-6">
                <h2 className="heading-serif text-2xl mb-1">Owners</h2>
                <p className="text-sm text-muted-foreground">
                  Add every direct individual owner and confirm their U.S. tax
                  status.
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOwnersAreIndividuals((current) => !current)
                    }
                    className={`rounded-lg border p-4 text-left transition-all ${
                      ownersAreIndividuals
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      All owners are individuals
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      No company, trust, partnership, or other entity is an
                      owner.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnershipIsDirect((current) => !current)}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      ownershipIsDirect
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      All ownership is direct
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Every listed person owns their LLC interest directly.
                    </p>
                  </button>
                </div>
                {members.map((member, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Owner {i + 1}</Badge>
                      {members.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(i)}
                          className="text-xs text-destructive"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Full name</Label>
                        <Input
                          placeholder="Jane Doe"
                          value={member.name}
                          onChange={(e) =>
                            updateMember(i, { name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ownership %</Label>
                        <Input
                          type="number"
                          min={0.01}
                          max={100}
                          value={member.ownershipPct}
                          onChange={(e) =>
                            updateMember(i, {
                              ownershipPct: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Country of residence</Label>
                        <Input
                          placeholder="e.g., Germany"
                          value={member.country}
                          onChange={(e) =>
                            updateMember(i, { country: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">U.S. tax status</Label>
                        <div className="flex gap-2">
                          {[
                            {
                              value: "foreign_person" as const,
                              label: "Foreign person",
                            },
                            {
                              value: "us_person" as const,
                              label: "U.S. person",
                            },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateMember(i, {
                                  usTaxStatus: option.value,
                                })
                              }
                              className={`flex-1 rounded-md border px-2 py-2 text-xs ${
                                member.usTaxStatus === option.value
                                  ? "border-primary bg-primary/5 font-medium"
                                  : "border-border"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tax ID type</Label>
                        <Input
                          placeholder="e.g., foreign, ITIN, SSN"
                          value={member.taxIdType}
                          onChange={(e) =>
                            updateMember(i, { taxIdType: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {entityType !== "single-member" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addMember}
                    className="w-full"
                  >
                    + Add member
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Ownership must total 100%. Entity owners and indirect
                  ownership require professional review and are not supported in
                  this release.
                </p>
              </div>
            </>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <>
              <div className="mb-6">
                <h2 className="heading-serif text-2xl mb-1">
                  Reminder preferences
                </h2>
                <p className="text-sm text-muted-foreground">
                  How and when should we remind you about deadlines?
                </p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="remind-days">
                    Remind me this many days before
                  </Label>
                  <Input
                    id="remind-days"
                    type="number"
                    min={1}
                    max={90}
                    value={remindDaysBefore}
                    onChange={(e) =>
                      setRemindDaysBefore(Number(e.target.value))
                    }
                    className="h-11"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Notification channels</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { value: "email", label: "Email" },
                      { value: "whatsapp", label: "WhatsApp" },
                    ].map((ch) => (
                      <button
                        key={ch.value}
                        type="button"
                        disabled={ch.value === "whatsapp" && !whatsappAvailable}
                        onClick={() => {
                          if (ch.value === "whatsapp" && !whatsappAvailable)
                            return;
                          setChannels((prev) =>
                            prev.includes(ch.value)
                              ? prev.filter((c) => c !== ch.value)
                              : [...prev, ch.value]
                          );
                        }}
                        className={`flex-1 rounded-lg border px-4 py-3 text-sm transition-all ${
                          channels.includes(ch.value)
                            ? "border-primary bg-primary/5 font-medium"
                            : "border-border hover:border-primary/40"
                        } ${ch.value === "whatsapp" && !whatsappAvailable ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                  {!whatsappAvailable ? (
                    <p className="text-xs text-muted-foreground">
                      WhatsApp reminders are not configured on this instance.
                    </p>
                  ) : null}
                </div>
                {state === "WY" ? (
                  <button
                    type="button"
                    disabled={!formationDate}
                    onClick={() => {
                      if (!formationDate) return;
                      setWyAnnualFeeReminderEnabled((current) => !current);
                    }}
                    className={`w-full rounded-lg border p-4 text-left transition-all ${
                      wyAnnualFeeReminderEnabled
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    } ${!formationDate ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <p className="text-sm font-medium">
                      Wyoming annual fee reminder
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Remind me to review and pay the Wyoming annual report
                      license tax. Pax will not submit the state filing.
                      {!formationDate
                        ? " Add the formation date before enabling this reminder."
                        : ""}
                    </p>
                  </button>
                ) : null}
              </div>
            </>
          )}

          {error && (
            <div className="mt-4">
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-warm border-0"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="btn-warm border-0"
              >
                {loading ? "Creating…" : "Create entity"}
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
