"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OperationsPanel } from "./operations-panel";

type SettingsResponse = {
  aiBaseUrl: string;
  aiModel: string;
  hasAiApiKey: boolean;
  aiApiKeyLast4: string | null;
};

export function SettingsPageClient() {
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [keyLast4, setKeyLast4] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SettingsResponse | null) => {
        if (!data) return;

        setBaseUrl(data.aiBaseUrl ?? "");
        setModel(data.aiModel ?? "");
        setHasKey(data.hasAiApiKey);
        setKeyLast4(data.aiApiKeyLast4);
      })
      .catch(() => setError("Unable to load settings."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiBaseUrl: baseUrl,
          aiModel: model,
          aiApiKey: apiKey,
        }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));

        throw new Error(data.error ?? "Unable to save settings.");
      }

      if (apiKey.trim()) {
        setHasKey(true);
        setKeyLast4(apiKey.trim().slice(-4));
        setApiKey("");
      }

      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8 sm:mb-10">
        <h1 className="heading-serif text-3xl mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure the AI provider used by the assistant, document
          classification, and knowledge search.
        </p>
      </div>

      <div className="card-warm p-6 sm:p-8">
        <h2 className="font-semibold mb-1">AI provider</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Use an endpoint supporting OpenAI-compatible chat completions, tool
          calls, and structured output. Provider compatibility must be tested.
          Saved keys are encrypted with your server encryption key.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading settings…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ai-base-url">Base URL</Label>
              <Input
                id="ai-base-url"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                The OpenAI-compatible API root, for example
                https://api.openai.com/v1 or http://localhost:11434/v1.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-api-key">API key</Label>
              <Input
                id="ai-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  hasKey && keyLast4 ? `Saved · ending ${keyLast4}` : "Optional"
                }
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank to keep the current key. Not required for
                unauthenticated local servers.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              <Input
                id="ai-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="gpt-4o"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                The exact model ID supported by the endpoint.
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {saved ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Check className="h-4 w-4" />
                Settings saved.
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={saving}
              className="btn-warm border-0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </form>
        )}
      </div>
      <OperationsPanel />
    </div>
  );
}
