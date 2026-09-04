"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Shield, KeyRound, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearPersistedMasterKey,
  generateMasterKey,
  generateRecoveryCode,
  isValidPin,
  persistMasterKey,
  restoreMasterKey,
  unwrapMasterKey,
  wrapMasterKey,
  type WrappedMasterKeyPayload,
} from "@/lib/e2ee";

type EncryptionStatus = {
  configured: boolean;
  pinWrappedMasterKey: WrappedMasterKeyPayload | null;
  recoveryWrappedMasterKey: WrappedMasterKeyPayload | null;
};

type EncryptionContextValue = {
  available: boolean;
  configured: boolean;
  unlocked: boolean;
  loading: boolean;
  error: string | null;
  masterKey: CryptoKey | null;
  refresh: () => Promise<void>;
  lock: () => void;
  openVaultSetup: () => void;
  openVaultUnlock: () => void;
  closeVaultPrompt: () => void;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithRecoveryCode: (recoveryCode: string) => Promise<void>;
  setupVault: (pin: string) => Promise<string>;
};

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

async function getStatus(): Promise<EncryptionStatus> {
  const response = await fetch("/api/account/encryption/status", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404 || response.status >= 500) {
      throw new Error("Failed to load encryption status");
    }
    return {
      configured: false,
      pinWrappedMasterKey: null,
      recoveryWrappedMasterKey: null,
    };
  }

  return response.json();
}

function normalizeRecoveryCode(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function VaultSetup({
  onSubmit,
  onSkip,
  loading,
}: {
  onSubmit: (pin: string) => Promise<string>;
  onSkip?: () => void;
  loading: boolean;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  async function handleSubmit() {
    setError("");

    if (!isValidPin(pin)) {
      setError("Use a 4 to 6 digit PIN.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PIN confirmation does not match.");
      return;
    }

    try {
      const code = await onSubmit(pin);
      setRecoveryCode(code);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to set up encryption");
    }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="heading-serif text-2xl">Set your vault PIN</h2>
          <p className="text-sm text-muted-foreground">
            This PIN or the recovery code is required to unlock encrypted documents and private account data.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!recoveryCode ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-pin">PIN</Label>
            <Input
              id="vault-pin"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="4 to 6 digits"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-pin-confirm">Confirm PIN</Label>
            <Input
              id="vault-pin-confirm"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              type="password"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Repeat PIN"
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full btn-warm border-0">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Securing account…
              </>
            ) : (
              "Create encrypted vault"
            )}
          </Button>
          {onSkip ? (
            <Button type="button" variant="secondary" onClick={onSkip} className="w-full">
              Continue without vault setup
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Recovery Code
            </p>
            <p className="mt-2 font-mono text-lg">{recoveryCode}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Save this now. If you lose both the PIN and this code, encrypted data cannot be recovered.
            </p>
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(recoveryCode);
              toast.success("Recovery code copied");
            }}
            variant="secondary"
            className="w-full"
          >
            Copy recovery code
          </Button>
        </div>
      )}
    </div>
  );
}

function VaultUnlock({
  onPinUnlock,
  onRecoveryUnlock,
  onSkip,
  loading,
}: {
  onPinUnlock: (pin: string) => Promise<void>;
  onRecoveryUnlock: (recoveryCode: string) => Promise<void>;
  onSkip?: () => void;
  loading: boolean;
}) {
  const [mode, setMode] = useState<"pin" | "recovery">("pin");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  async function handleUnlock() {
    setError("");

    try {
      if (mode === "pin") {
        await onPinUnlock(value);
      } else {
        await onRecoveryUnlock(value);
      }
      setValue("");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unable to unlock vault");
    }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="heading-serif text-2xl">Unlock encrypted vault</h2>
          <p className="text-sm text-muted-foreground">
            Use your PIN or recovery code to decrypt private account data in this browser session.
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          variant={mode === "pin" ? "default" : "secondary"}
          className={mode === "pin" ? "btn-warm border-0 flex-1" : "flex-1"}
          onClick={() => {
            setMode("pin");
            setValue("");
            setError("");
          }}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          PIN
        </Button>
        <Button
          type="button"
          variant={mode === "recovery" ? "default" : "secondary"}
          className={mode === "recovery" ? "btn-warm border-0 flex-1" : "flex-1"}
          onClick={() => {
            setMode("recovery");
            setValue("");
            setError("");
          }}
        >
          Recovery code
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vault-unlock-value">{mode === "pin" ? "PIN" : "Recovery code"}</Label>
          <Input
            id="vault-unlock-value"
            type={mode === "pin" ? "password" : "text"}
            inputMode={mode === "pin" ? "numeric" : "text"}
            value={value}
            onChange={(event) =>
              setValue(mode === "pin" ? event.target.value.replace(/\D/g, "").slice(0, 6) : event.target.value.toUpperCase())
            }
            placeholder={mode === "pin" ? "4 to 6 digits" : "ABCD-EF12-3456-7890"}
          />
        </div>
        <Button onClick={handleUnlock} disabled={loading || !value} className="w-full btn-warm border-0">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unlocking…
            </>
          ) : (
            "Unlock vault"
          )}
        </Button>
        {onSkip ? (
          <Button type="button" variant="secondary" onClick={onSkip} className="w-full">
            Not now
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<EncryptionStatus | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<"setup" | "unlock" | null>(null);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [encryptionStatus, restoredMasterKey] = await Promise.all([getStatus(), restoreMasterKey()]);
      setStatus(encryptionStatus);
      setMasterKey(restoredMasterKey);
      setError(null);
    } catch {
      setStatus({
        configured: false,
        pinWrappedMasterKey: null,
        recoveryWrappedMasterKey: null,
      });
      setMasterKey(null);
      setError("Vault setup is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function setupVault(pin: string) {
    if (!isValidPin(pin)) {
      throw new Error("Use a 4 to 6 digit PIN.");
    }

    setBusy(true);

    try {
      const masterKeyValue = await generateMasterKey();
      const recoveryCode = generateRecoveryCode();
      const payload = {
        pinWrappedMasterKey: await wrapMasterKey(masterKeyValue, pin),
        recoveryWrappedMasterKey: await wrapMasterKey(masterKeyValue, normalizeRecoveryCode(recoveryCode)),
      };

      const response = await fetch("/api/account/encryption/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to save encryption setup");
      }

      await persistMasterKey(masterKeyValue);
      setMasterKey(masterKeyValue);
      setPromptMode(null);
      setPendingRecoveryCode(recoveryCode);
      setStatus({
        configured: true,
        pinWrappedMasterKey: payload.pinWrappedMasterKey,
        recoveryWrappedMasterKey: payload.recoveryWrappedMasterKey,
      });

      return recoveryCode;
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithPin(pin: string) {
    if (!status?.configured || !status.pinWrappedMasterKey) {
      throw new Error("Encryption is not configured.");
    }

    setBusy(true);

    try {
      const unlockedKey = await unwrapMasterKey(status.pinWrappedMasterKey, pin);
      await persistMasterKey(unlockedKey);
      setMasterKey(unlockedKey);
      setPromptMode(null);
      toast.success("Vault unlocked");
    } catch {
      throw new Error("Incorrect PIN.");
    } finally {
      setBusy(false);
    }
  }

  async function unlockWithRecoveryCode(recoveryCode: string) {
    if (!status?.configured || !status.recoveryWrappedMasterKey) {
      throw new Error("Encryption is not configured.");
    }

    setBusy(true);

    try {
      const unlockedKey = await unwrapMasterKey(
        status.recoveryWrappedMasterKey,
        normalizeRecoveryCode(recoveryCode)
      );
      await persistMasterKey(unlockedKey);
      setMasterKey(unlockedKey);
      setPromptMode(null);
      toast.success("Vault unlocked");
    } catch {
      throw new Error("Invalid recovery code.");
    } finally {
      setBusy(false);
    }
  }

  function lock() {
    clearPersistedMasterKey();
    setMasterKey(null);
  }

  const shouldAutoPrompt = pathname.includes("/documents") && !error;
  const activePrompt =
    pendingRecoveryCode ? "recovery" : promptMode ?? (shouldAutoPrompt ? (status?.configured ? (!masterKey ? "unlock" : null) : "setup") : null);

  const value: EncryptionContextValue = {
    available: !error,
    configured: !!status?.configured,
    unlocked: !!masterKey,
    loading,
    error,
    masterKey,
    refresh,
    lock,
    openVaultSetup: () => setPromptMode("setup"),
    openVaultUnlock: () => setPromptMode("unlock"),
    closeVaultPrompt: () => setPromptMode(null),
    unlockWithPin,
    unlockWithRecoveryCode,
    setupVault,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
      {!loading && activePrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          {pendingRecoveryCode ? (
            <div className="w-full max-w-lg rounded-3xl border border-border bg-background p-8 shadow-2xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="heading-serif text-2xl">Save your recovery code</h2>
                  <p className="text-sm text-muted-foreground">
                    Without your PIN or this code, encrypted data is permanently inaccessible.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Recovery Code
                </p>
                <p className="mt-2 font-mono text-lg">{pendingRecoveryCode}</p>
              </div>
              <div className="mt-4 flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(pendingRecoveryCode);
                    toast.success("Recovery code copied");
                  }}
                >
                  Copy code
                </Button>
                <Button className="flex-1 btn-warm border-0" onClick={() => setPendingRecoveryCode(null)}>
                  I saved it
                </Button>
              </div>
            </div>
          ) : activePrompt === "unlock" ? (
            <VaultUnlock
              onPinUnlock={unlockWithPin}
              onRecoveryUnlock={unlockWithRecoveryCode}
              onSkip={() => setPromptMode(null)}
              loading={busy}
            />
          ) : (
            <VaultSetup onSubmit={setupVault} onSkip={() => setPromptMode(null)} loading={busy} />
          )}
        </div>
      ) : null}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = useContext(EncryptionContext);

  if (!context) {
    throw new Error("useEncryption must be used within EncryptionProvider");
  }

  return context;
}
