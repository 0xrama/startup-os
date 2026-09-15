import { z } from "zod";

export const ownerTaxStatusSchema = z.enum(["us_person", "foreign_person"]);

export const directIndividualOwnerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  ownershipPct: z.number().gt(0).max(100),
  country: z.string().trim().min(1).max(100),
  taxIdType: z.string().trim().min(1).max(100),
  usTaxStatus: ownerTaxStatusSchema,
});
