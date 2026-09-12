import { requirePageSession } from "@/lib/access";

export default async function LlcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();

  return children;
}
