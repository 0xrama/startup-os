"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { signOut } from "@/lib/auth-client";
import { Mail, Trash2, AlertTriangle, Loader2 } from "lucide-react";

type AccountPageClientProps = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
  };
};

export function AccountPageClient({ user }: AccountPageClientProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete account. Please try again.");
        setDeleting(false);

        return;
      }

      signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/";
          },
        },
      });
    } catch {
      alert("Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-8 sm:mb-10">
        <h1 className="heading-serif text-3xl mb-1">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your profile.</p>
      </div>

      {/* Profile section */}
      <div className="card-warm p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-5">
          <Avatar size="lg">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name ?? "Profile"} />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 className="font-semibold text-lg truncate">
              {user.name || "—"}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card-warm border-destructive/20 p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-destructive">Danger zone</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This action
          cannot be undone.
        </p>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger
            render={
              <Button variant="destructive" size="sm" className="gap-2" />
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This will permanently delete your account, all LLCs, documents,
                and compliance data. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Type <span className="font-mono text-destructive">DELETE</span>{" "}
                to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-destructive/30"
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete my account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
