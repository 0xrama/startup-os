"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Save, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEncryption } from "@/components/security/encryption-provider";
import { decryptJson, encryptJson, type CipherPayload } from "@/lib/e2ee";
import { summarizeOwnerTaxStatuses } from "@/lib/ownership-scope";
import type { SecureLlcPayload } from "@/lib/secure-llc";
import type { TaxMember } from "@/lib/tax-copilot";

type EditableMember = TaxMember & {
  usTaxStatus?: "us_person" | "foreign_person";
};

function emptyMember(): EditableMember {
  return {
    name: "",
    ownershipPct: 0,
    country: "",
    taxIdType: "",
    usTaxStatus: undefined,
  };
}

export function OwnershipScopeEditor({
  llcId,
  entityType,
  taxClassification,
  ownerResidency,
  ownersAreIndividuals,
  ownershipIsDirect,
  encryptedData,
  fallbackEin,
  fallbackRegisteredAgent,
  fallbackMembers,
}: {
  llcId: string;
  entityType: string;
  taxClassification: string | null;
  ownerResidency: string | null;
  ownersAreIndividuals: boolean | null;
  ownershipIsDirect: boolean | null;
  encryptedData: CipherPayload | null;
  fallbackEin: string | null;
  fallbackRegisteredAgent: string | null;
  fallbackMembers: TaxMember[] | null;
}) {
  const router = useRouter();
  const { configured, masterKey } = useEncryption();
  const [isPending, startTransition] = useTransition();

  const [securePayload, setSecurePayload] = useState<SecureLlcPayload | null>(
    fallbackMembers
      ? {
          ein: fallbackEin,
          registeredAgent: fallbackRegisteredAgent,
          members: fallbackMembers,
        }
      : null
  );

  const [members, setMembers] = useState<EditableMember[]>(
    fallbackMembers?.length
      ? fallbackMembers
      : [
          {
            ...emptyMember(),
            ownershipPct: entityType === "single-member" ? 100 : 0,
          },
        ]
  );

  const [individualsConfirmed, setIndividualsConfirmed] = useState(
    ownersAreIndividuals === true
  );

  const [directConfirmed, setDirectConfirmed] = useState(
    ownershipIsDirect === true
  );

  const [error, setError] = useState<string | null>(null);

  const classificationIsSupported =
    (entityType === "single-member" && taxClassification === "disregarded") ||
    (entityType === "multi-member" && taxClassification === "partnership");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!encryptedData || !masterKey) return;

      const decrypted = await decryptJson<SecureLlcPayload>(
        masterKey,
        encryptedData
      );

      if (cancelled) return;
      setSecurePayload(decrypted);
      setMembers(
        decrypted.members?.length
          ? decrypted.members
          : [
              {
                ...emptyMember(),
                ownershipPct: entityType === "single-member" ? 100 : 0,
              },
            ]
      );
    }

    void load().catch(() => {
      if (!cancelled) setError("Could not decrypt the saved owner profile.");
    });

    return () => {
      cancelled = true;
    };
  }, [encryptedData, entityType, masterKey]);

  function updateMember(index: number, patch: Partial<EditableMember>) {
    setMembers((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member
      )
    );
  }

  function removeMember(index: number) {
    setMembers((current) =>
      current.filter((_, memberIndex) => memberIndex !== index)
    );
  }

  function save() {
    setError(null);

    if (!classificationIsSupported) {
      setError(
        "This entity uses an unsupported type or corporate tax classification."
      );

      return;
    }

    if (configured && !masterKey) {
      setError("Unlock the vault before updating ownership.");

      return;
    }

    if (!individualsConfirmed || !directConfirmed) {
      setError(
        "Confirm that every owner is an individual and holds the interest directly."
      );

      return;
    }

    const ownershipTotal = members.reduce(
      (total, member) => total + member.ownershipPct,
      0
    );

    const expectedCountValid =
      entityType === "single-member"
        ? members.length === 1
        : members.length >= 2;

    const membersComplete = members.every(
      (member) =>
        member.name.trim() &&
        member.country.trim() &&
        member.taxIdType.trim() &&
        member.usTaxStatus &&
        member.ownershipPct > 0
    );

    if (
      !expectedCountValid ||
      !membersComplete ||
      Math.abs(ownershipTotal - 100) >= 0.01
    ) {
      setError(
        entityType === "single-member"
          ? "Record one complete owner with 100% ownership."
          : "Record at least two complete owners whose ownership totals 100%."
      );

      return;
    }

    startTransition(() => {
      void (async () => {
        const { foreignOwnerCount, usOwnerCount } =
          summarizeOwnerTaxStatuses(members);

        const nextEncryptedData = masterKey
          ? await encryptJson(masterKey, {
              ein: securePayload?.ein ?? fallbackEin,
              registeredAgent:
                securePayload?.registeredAgent ?? fallbackRegisteredAgent,
              members,
            })
          : null;

        const response = await fetch(`/api/llcs/${llcId}/ownership`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownersAreIndividuals: true,
            ownershipIsDirect: true,
            ownerCount: members.length,
            foreignOwnerCount,
            usOwnerCount,
            ownershipTotal,
            members: configured ? undefined : members,
            encryptedData: configured ? nextEncryptedData : undefined,
          }),
        });

        // SAFETY: the ownership endpoint returns either an updated LLC row or
        // a JSON error object, and only the optional error field is read here.
        const result = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        if (!response.ok) {
          setError(result?.error ?? "Could not update ownership.");

          return;
        }

        toast.success("Ownership profile confirmed");
        router.refresh();
      })().catch((saveError) => {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Could not update ownership."
        );
      });
    });
  }

  const locked = Boolean(encryptedData && !masterKey);

  return (
    <section className="mt-6 border-t border-border pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            Supported ownership
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pax supports direct individual owners only. Confirm every owner
            before relying on tax forms or deadlines.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {ownersAreIndividuals === true && ownershipIsDirect === true
            ? "Confirmed"
            : "Needs confirmation"}
        </span>
      </div>

      {locked ? (
        <p className="mt-4 border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          Unlock the vault to review and confirm the owner list.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setIndividualsConfirmed((current) => !current)}
              className={`border p-3 text-left text-xs ${
                individualsConfirmed
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              Every owner is an individual
            </button>
            <button
              type="button"
              onClick={() => setDirectConfirmed((current) => !current)}
              className={`border p-3 text-left text-xs ${
                directConfirmed
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              Every owner holds the interest directly
            </button>
          </div>

          {members.map((member, index) => (
            <div key={index} className="space-y-3 border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Owner {index + 1}</p>
                {members.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(index)}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Full name</Label>
                  <Input
                    value={member.name}
                    onChange={(event) =>
                      updateMember(index, { name: event.target.value })
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
                    onChange={(event) =>
                      updateMember(index, {
                        ownershipPct: Number(event.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Country of residence</Label>
                  <Input
                    value={member.country}
                    onChange={(event) =>
                      updateMember(index, { country: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tax ID type</Label>
                  <Input
                    value={member.taxIdType}
                    onChange={(event) =>
                      updateMember(index, { taxIdType: event.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  {
                    value: "foreign_person" as const,
                    label: "Foreign person",
                  },
                  { value: "us_person" as const, label: "U.S. person" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateMember(index, { usTaxStatus: option.value })
                    }
                    className={`border px-3 py-2 text-xs ${
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
          ))}

          {entityType === "multi-member" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setMembers((current) => [...current, emptyMember()])
              }
              className="w-full"
            >
              Add owner
            </Button>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Saved status:{" "}
            {ownerResidency === "mixed"
              ? "mixed U.S. and foreign owners"
              : ownerResidency === "us_resident"
                ? "U.S. person"
                : "foreign person"}
          </p>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Confirm ownership
          </Button>
        </div>
      )}
    </section>
  );
}
