import { requirePageSession } from "@/lib/access";
import { SettingsPageClient } from "@/components/dashboard/settings-page-client";

export default async function SettingsPage() {
  await requirePageSession();

  return <SettingsPageClient />;
}
