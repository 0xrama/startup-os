import { requirePageSubscription } from "@/lib/access";

export default async function LlcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSubscription();

  return children;
}
