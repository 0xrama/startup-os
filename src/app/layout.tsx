import type { Metadata } from "next";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pax — LLC Compliance for Non-Resident Founders",
  description:
    "LLC compliance, simplified. Calendar, vault, reminders, and AI assistant — never miss an obligation again.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="font-sans antialiased">
        <AnalyticsProvider />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
