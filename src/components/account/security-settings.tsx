"use client";

import { useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  CheckCircle2,
  Copy,
  Download,
  Fingerprint,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

type SecuritySettingsProps = {
  hasPassword: boolean;
  twoFactorEnabled: boolean;
  initialPasskeys: PasskeyRecord[];
};

type PasskeyRecord = {
  id: string;
  name?: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt?: Date | string | null;
};

function getErrorMessage(
  error: { message?: string } | null | undefined,
  fallback: string
) {
  return error?.message || fallback;
}

function getTotpSecret(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function formatPasskeyDate(value: Date | string | null | undefined) {
  if (!value) return "Date unavailable";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function downloadCodes(codes: string[]) {
  const file = new Blob(
    [
      "Pax two-factor recovery codes\n\n",
      ...codes.map((code) => `${code}\n`),
      "\nEach code can be used once. Store this file securely.\n",
    ],
    { type: "text/plain;charset=utf-8" }
  );

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pax-recovery-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function TwoFactorSettings({
  hasPassword,
  initiallyEnabled,
}: {
  hasPassword: boolean;
  initiallyEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const totpSecret = useMemo(() => getTotpSecret(totpUri), [totpUri]);

  function startRequest() {
    setBusy(true);
    setError(null);
    setMessage(null);
  }

  async function enable() {
    if (!password) return;

    startRequest();

    const result = await authClient.twoFactor.enable({
      password,
      issuer: "Pax",
    });

    if (result.error) {
      setError(getErrorMessage(result.error, "Unable to start setup."));
    } else if (result.data) {
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setPassword("");
      setMessage(
        "Scan the QR code, save the recovery codes, then verify one authenticator code."
      );
    }

    setBusy(false);
  }

  async function verify() {
    if (!totpCode) return;

    startRequest();

    const result = await authClient.twoFactor.verifyTotp({
      code: totpCode.replaceAll(" ", ""),
      trustDevice: true,
    });

    if (result.error) {
      setError(
        getErrorMessage(result.error, "The authenticator code was not valid.")
      );
    } else {
      setEnabled(true);
      setTotpUri("");
      setTotpCode("");
      setMessage(
        "Two-factor authentication is enabled. Keep the recovery codes somewhere safe."
      );
    }

    setBusy(false);
  }

  async function disable() {
    if (!password) return;

    startRequest();

    const result = await authClient.twoFactor.disable({ password });

    if (result.error) {
      setError(getErrorMessage(result.error, "Unable to disable two-factor."));
    } else {
      setEnabled(false);
      setTotpUri("");
      setBackupCodes([]);
      setPassword("");
      setMessage("Two-factor authentication is disabled.");
    }

    setBusy(false);
  }

  async function regenerateCodes() {
    if (!password) return;

    startRequest();

    const result = await authClient.twoFactor.generateBackupCodes({ password });

    if (result.error) {
      setError(
        getErrorMessage(result.error, "Unable to generate new recovery codes.")
      );
    } else if (result.data) {
      setBackupCodes(result.data.backupCodes);
      setPassword("");
      setMessage(
        "New recovery codes generated. Your previous codes no longer work."
      );
    }

    setBusy(false);
  }

  async function copySecret() {
    await navigator.clipboard.writeText(totpSecret);
    setMessage("Copied to clipboard.");
  }

  return (
    <section className="card-warm p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/8 p-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Authenticator codes</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Require a six-digit code after password sign-in. Recovery codes
              provide a fallback if you lose the authenticator.
            </p>
          </div>
        </div>
        <Badge variant={enabled ? "secondary" : "outline"}>
          {enabled ? "Enabled" : "Optional"}
        </Badge>
      </div>

      {!hasPassword ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Authenticator-code setup requires a password account. Your social
          sign-in and registered passkeys remain available.
        </p>
      ) : (
        <div className="space-y-4">
          {!totpUri ? (
            <div className="space-y-2">
              <Label htmlFor="security-password">Current password</Label>
              <Input
                id="security-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
          ) : null}

          {!enabled && !totpUri ? (
            <Button type="button" onClick={enable} disabled={!password || busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Set up authenticator
            </Button>
          ) : null}

          {totpUri && !enabled ? (
            <div className="space-y-5 border-t border-border pt-5">
              <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                <div className="rounded-lg bg-white p-3">
                  <QRCode value={totpUri} size={136} />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Scan with an authenticator app such as 1Password, Google
                    Authenticator, Microsoft Authenticator, or Authy.
                  </p>
                  {totpSecret ? (
                    <div>
                      <p className="mb-1 text-xs font-medium">Setup key</p>
                      <div className="flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all rounded bg-secondary px-2 py-1.5 text-xs">
                          {totpSecret}
                        </code>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label="Copy setup key"
                          onClick={copySecret}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totp-code">Six-digit code</Label>
                <Input
                  id="totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  maxLength={8}
                  placeholder="123456"
                />
              </div>
              <Button
                type="button"
                onClick={verify}
                disabled={!totpCode || busy}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Verify and enable
              </Button>
            </div>
          ) : null}

          {enabled ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={regenerateCodes}
                disabled={!password || busy}
              >
                Generate new recovery codes
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={disable}
                disabled={!password || busy}
              >
                Disable two-factor
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {backupCodes.length > 0 ? (
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Recovery codes</p>
              <p className="text-xs text-muted-foreground">
                Each code works once. Do not store these in the Pax vault.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadCodes(backupCodes)}
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Download
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-3 font-mono text-xs">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="mt-4 text-sm text-emerald-700">{message}</p>
      ) : null}
    </section>
  );
}

function PasskeySettings({
  initialPasskeys,
}: {
  initialPasskeys: PasskeyRecord[];
}) {
  const [passkeys, setPasskeys] = useState(initialPasskeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!("PublicKeyCredential" in window)) {
      setError(
        "This browser does not support passkeys. Use a current browser over HTTPS."
      );

      return;
    }

    setBusy(true);
    setError(null);

    const result = await authClient.passkey.addPasskey({
      name: name.trim() || undefined,
    });

    if (result.error) {
      setError(
        getErrorMessage(result.error, "Unable to register this passkey.")
      );
    } else if (result.data) {
      const passkey = result.data;

      setName("");
      setPasskeys((current) => [
        ...current,
        {
          id: passkey.id,
          name: passkey.name ?? null,
          deviceType: passkey.deviceType,
          backedUp: passkey.backedUp,
          createdAt: passkey.createdAt,
        },
      ]);
    }

    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);

    const result = await authClient.passkey.deletePasskey({ id });

    if (result.error) {
      setError(getErrorMessage(result.error, "Unable to remove this passkey."));
    } else {
      setPasskeys((current) => current.filter((passkey) => passkey.id !== id));
    }

    setBusy(false);
  }

  return (
    <section className="card-warm p-6 sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/8 p-2 text-primary">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Passkeys</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Sign in with device biometrics, a PIN, password manager, or
              hardware security key instead of a password.
            </p>
          </div>
        </div>
        <Badge variant={passkeys.length > 0 ? "secondary" : "outline"}>
          {passkeys.length} registered
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passkey-name">Passkey name</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="passkey-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="MacBook Touch ID"
              maxLength={100}
            />
            <Button type="button" onClick={add} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Fingerprint className="mr-2 h-4 w-4" />
              )}
              Add passkey
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No passkeys registered yet.
            </p>
          ) : (
            passkeys.map((passkey) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {passkey.name || "Passkey"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPasskeyDate(passkey.createdAt)} ·{" "}
                    {passkey.deviceType}
                    {passkey.backedUp ? " · synced" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${passkey.name || "passkey"}`}
                  onClick={() => remove(passkey.id)}
                  disabled={busy}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Passkeys are phishing-resistant and complete sign-in directly, so an
        authenticator code is not requested after passkey sign-in.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

export function SecuritySettings({
  hasPassword,
  twoFactorEnabled,
  initialPasskeys,
}: SecuritySettingsProps) {
  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-2">
      <TwoFactorSettings
        hasPassword={hasPassword}
        initiallyEnabled={twoFactorEnabled}
      />
      <PasskeySettings initialPasskeys={initialPasskeys} />
    </div>
  );
}
