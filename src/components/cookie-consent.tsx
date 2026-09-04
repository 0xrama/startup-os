"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const COOKIE_CONSENT_KEY = "pax-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't pop in immediately
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fade-up">
      <div className="max-w-xl mx-auto card-elevated p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-border">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">We use cookies</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We use essential cookies for authentication and may use analytics
            cookies to improve our service. Read our{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            to learn more.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={decline}
            className="text-xs text-muted-foreground"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={accept}
            className="btn-warm border-0 text-xs px-4"
          >
            Accept
          </Button>
        </div>
        <button
          onClick={decline}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors sm:hidden"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
