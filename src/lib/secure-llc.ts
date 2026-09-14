import type { TaxMember } from "./tax-copilot";

export type SecureLlcPayload = {
  ein: string | null;
  registeredAgent: string | null;
  members: TaxMember[];
};
