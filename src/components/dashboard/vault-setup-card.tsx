"use client";

import { FolderLock, KeyRound, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEncryption } from "@/components/security/encryption-provider";

export function VaultSetupCard() {
  const {
    configured,
    unlocked,
    loading,
    error,
    openVaultSetup,
    openVaultUnlock,
  } = useEncryption();

  if (loading || unlocked) {
    return null;
  }

  return (
    <div className="mb-8 border border-border p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-secondary">
            {error ? (
              <ShieldAlert className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            ) : configured ? (
              <KeyRound className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            ) : (
              <FolderLock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {error ? "Vault unavailable" : configured ? "Vault locked" : "Set up your vault"}
            </p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {error
                ? "The vault service could not be loaded. You can still manage your LLC."
                : configured
                  ? "Unlock to access encrypted documents and private details."
                  : "Create a PIN to protect documents and sensitive information."}
            </p>
          </div>
        </div>
        {!error && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 text-[13px]"
            onClick={configured ? openVaultUnlock : openVaultSetup}
          >
            {configured ? "Unlock" : "Set up"}
          </Button>
        )}
      </div>
    </div>
  );
}
