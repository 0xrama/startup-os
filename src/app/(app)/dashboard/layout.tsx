import { requirePageSession } from "@/lib/access";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();

  return (
    <DashboardShell userName={session.user.name?.split(" ")[0] ?? "there"}>
      {children}
    </DashboardShell>
  );
}
