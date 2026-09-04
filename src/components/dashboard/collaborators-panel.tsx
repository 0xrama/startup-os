"use client";

import { useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCollaboratorStatusIcon } from "@/lib/app-icons";

type Collaborator = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export function CollaboratorsPanel({
  llcId,
  collaborators: initialCollaborators,
  collaboratorsEnabled,
  canManage,
}: {
  llcId: string;
  collaborators: Collaborator[];
  collaboratorsEnabled: boolean;
  canManage: boolean;
}) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function invite() {
    if (!email.trim() || !collaboratorsEnabled || !canManage) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/llcs/${llcId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invite failed");
      }

      const collaborator = (await res.json()) as Collaborator;
      setCollaborators((prev) => [...prev, collaborator]);
      setEmail("");
      setRole("viewer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-warm p-6 mt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 heading-serif text-xl">
          <Users className="h-5 w-5 text-primary" />
          Collaborators
        </h2>
        <Badge variant="secondary">{collaborators.length}</Badge>
      </div>

      {!collaboratorsEnabled ? (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Collaborators are available on the Pro plan.
        </div>
      ) : null}

      {collaboratorsEnabled && !canManage ? (
        <div className="mb-4 rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
          Only the workspace owner can invite and manage collaborators.
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
        <Input
          placeholder="Invite by email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!collaboratorsEnabled || !canManage}
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={!collaboratorsEnabled || !canManage}
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <Button
          onClick={invite}
          disabled={submitting || !collaboratorsEnabled || !canManage}
          className="btn-warm border-0"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {collaborators.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-6 text-center">
          <UserPlus className="mx-auto h-6 w-6 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No collaborators yet. Invite an editor or viewer for this LLC.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  {(() => {
                    const Icon = getCollaboratorStatusIcon(collaborator.status);
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium">{collaborator.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {collaborator.status}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{collaborator.role}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
