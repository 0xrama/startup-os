"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEncryption } from "@/components/security/encryption-provider";
import { decryptJson, type CipherPayload } from "@/lib/e2ee";
import type { SecureLlcPayload } from "@/lib/secure-llc";

export function LlcSecureDetails({
  encryptedData,
  fallbackEin,
  fallbackRegisteredAgent,
  fallbackMembers,
}: {
  encryptedData: CipherPayload | null;
  fallbackEin: string | null;
  fallbackRegisteredAgent: string | null;
  fallbackMembers: Array<{
    name: string;
    ownershipPct: number;
    country: string;
    taxIdType: string;
    usTaxStatus?: "us_person" | "foreign_person";
  }> | null;
}) {
  const { masterKey } = useEncryption();

  const [secureData, setSecureData] = useState<SecureLlcPayload | null>(
    fallbackEin || fallbackRegisteredAgent || fallbackMembers
      ? {
          ein: fallbackEin,
          registeredAgent: fallbackRegisteredAgent,
          members: fallbackMembers ?? [],
        }
      : null
  );

  useEffect(() => {
    async function run() {
      if (!masterKey || !encryptedData) return;

      try {
        const value = await decryptJson<SecureLlcPayload>(
          masterKey,
          encryptedData
        );

        setSecureData(value);
      } catch {
        setSecureData(null);
      }
    }

    void run();
  }, [encryptedData, masterKey]);

  return (
    <>
      <div>
        <p className="text-muted-foreground text-xs mb-1">EIN</p>
        <p className="font-medium font-mono">{secureData?.ein || "—"}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs mb-1">Registered Agent</p>
        <p className="font-medium">{secureData?.registeredAgent || "—"}</p>
      </div>

      {secureData?.members?.length ? (
        <div className="mt-6 pt-6 border-t border-border col-span-full">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Members
          </h3>
          <div className="space-y-2">
            {secureData.members.map((member, index) => (
              <div
                key={`${member.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.country} · {member.taxIdType}
                    {member.usTaxStatus
                      ? ` · ${
                          member.usTaxStatus === "us_person"
                            ? "U.S. person"
                            : "Foreign person"
                        }`
                      : ""}
                  </p>
                </div>
                <Badge variant="secondary">{member.ownershipPct}%</Badge>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
