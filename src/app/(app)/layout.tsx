import { Toaster } from "@/components/ui/sonner";
import { EncryptionProvider } from "@/components/security/encryption-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EncryptionProvider>
      {children}
      <Toaster />
    </EncryptionProvider>
  );
}
