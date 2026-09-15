import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  filingAssessments,
  llcs,
  relatedPartyTransactions,
} from "@/lib/schema";
import {
  sealText,
  openText,
} from "@/infrastructure/security/server-encryption";
import { assessFederalTaxFiling } from "@/lib/tax-copilot";
import { COMPLIANCE_RULE_VERSION, COMPLIANCE_RULE_REVIEW } from "./deadlines";

const amount = z.string().regex(/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/);

export const transactionSchema = z.object({
  date: z.iso
    .date()
    .refine(
      (date) =>
        Number(date.slice(0, 4)) >= 2000 && Number(date.slice(0, 4)) <= 2100
    ),
  relatedParty: z.string().trim().min(1).max(200),
  relationship: z.enum(["owner", "related_entity", "other_related_party"]),
  category: z.enum([
    "contribution",
    "distribution",
    "loan",
    "repayment",
    "owner_paid_expense",
    "reimbursement",
    "sale",
    "service",
    "other",
  ]),
  direction: z.enum(["received", "paid"]),
  amount,
  currency: z.string().regex(/^[A-Z]{3}$/),
  usdAmount: amount,
  description: z.string().trim().min(1).max(2000),
  evidenceReference: z.string().max(300).optional(),
});

export const taxYearSchema = z.coerce.number().int().min(2000).max(2100);

export async function listTransactions(llcId: string, taxYear: number) {
  const rows = await db
    .select()
    .from(relatedPartyTransactions)
    .where(
      and(
        eq(relatedPartyTransactions.llcId, llcId),
        eq(relatedPartyTransactions.taxYear, taxYear)
      )
    )
    .orderBy(desc(relatedPartyTransactions.createdAt))
    .limit(1000);

  return rows.map(({ encryptedData, ...row }) => ({
    ...row,
    facts: transactionSchema.parse(JSON.parse(openText(encryptedData))),
  }));
}

export async function recordTransaction(
  llcId: string,
  facts: z.infer<typeof transactionSchema>
) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: llcs.id })
      .from(llcs)
      .where(eq(llcs.id, llcId))
      .for("update");

    const [row] = await tx
      .insert(relatedPartyTransactions)
      .values({
        llcId,
        taxYear: Number(facts.date.slice(0, 4)),
        encryptedData: sealText(JSON.stringify(facts)),
      })
      .returning({ id: relatedPartyTransactions.id });

    return row;
  });
}

export async function createAssessment(llcId: string, taxYear: number) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(llcs)
      .where(eq(llcs.id, llcId))
      .for("update");

    if (!profile) throw new Error("Entity not found");

    const transactions = await tx
      .select()
      .from(relatedPartyTransactions)
      .where(
        and(
          eq(relatedPartyTransactions.llcId, llcId),
          eq(relatedPartyTransactions.taxYear, taxYear)
        )
      )
      .limit(1001);

    if (transactions.length > 1000)
      throw new Error("More than 1000 transactions require an external review");

    const snapshot = {
      assessment: assessFederalTaxFiling(profile, { taxYear }),
      ruleReview: COMPLIANCE_RULE_REVIEW,
      profile,
      transactions: transactions.map(({ encryptedData, ...row }) => ({
        ...row,
        facts: transactionSchema.parse(JSON.parse(openText(encryptedData))),
      })),
      warning:
        "User-recorded facts may be incomplete. This snapshot does not prove filing eligibility or professional review.",
    };

    const [row] = await tx
      .insert(filingAssessments)
      .values({
        llcId,
        taxYear,
        ruleVersion: COMPLIANCE_RULE_VERSION,
        encryptedSnapshot: sealText(JSON.stringify(snapshot)),
      })
      .returning({ id: filingAssessments.id });

    return row;
  });
}

export async function listAssessments(llcId: string, taxYear: number) {
  const rows = await db
    .select()
    .from(filingAssessments)
    .where(
      and(
        eq(filingAssessments.llcId, llcId),
        eq(filingAssessments.taxYear, taxYear)
      )
    )
    .orderBy(desc(filingAssessments.createdAt))
    .limit(30);

  return rows.map(({ encryptedSnapshot, reviewNotes, ...row }) => ({
    ...row,

    reviewNotes: reviewNotes ? openText(reviewNotes) : null,

    // SAFETY: the snapshot was written by createAssessment as sealed JSON of
    // the assessment structure, so parsing it back yields that same shape.
    snapshot: JSON.parse(openText(encryptedSnapshot)) as unknown,
  }));
}

export async function reviewAssessment(
  llcId: string,
  id: string,
  notes: string
) {
  return db
    .update(filingAssessments)
    .set({
      reviewStatus: "user_reviewed",
      reviewedAt: new Date(),
      reviewNotes: sealText(notes),
    })
    .where(
      and(
        eq(filingAssessments.id, id),
        eq(filingAssessments.llcId, llcId),
        eq(filingAssessments.reviewStatus, "unreviewed")
      )
    )
    .returning({ id: filingAssessments.id });
}

export async function removeTransaction(llcId: string, id: string) {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: llcs.id })
      .from(llcs)
      .where(eq(llcs.id, llcId))
      .for("update");

    return tx
      .delete(relatedPartyTransactions)
      .where(
        and(
          eq(relatedPartyTransactions.llcId, llcId),
          eq(relatedPartyTransactions.id, id)
        )
      )
      .returning({ id: relatedPartyTransactions.id });
  });
}
