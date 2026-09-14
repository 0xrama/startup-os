import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { llcs, user, userEncryption } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedComplianceTasks } from "@/lib/compliance-tasks";
import { logAudit } from "@/lib/audit";
import { requireApiContext } from "@/lib/route-guards";
import { createLogger } from "@/lib/logger";
import { directIndividualOwnerSchema } from "@/lib/ownership-input";
import {
  getOwnerResidency,
  summarizeOwnerTaxStatuses,
} from "@/lib/ownership-scope";
import { z } from "zod";

const logger = createLogger("api.llcs");

const ownershipSummarySchema = z.object({
  ownerCount: z.number().int().min(1).max(100),
  foreignOwnerCount: z.number().int().min(0).max(100),
  usOwnerCount: z.number().int().min(0).max(100),
  ownershipTotal: z.number().refine((value) => Math.abs(value - 100) < 0.01, {
    message: "Ownership percentages must total 100%.",
  }),
});

const llcInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    state: z.string().trim().min(2).max(20),
    entityType: z.enum(["single-member", "multi-member"]),
    ownersAreIndividuals: z.literal(true),
    ownershipIsDirect: z.literal(true),
    ownershipSummary: ownershipSummarySchema,
    formationDate: z.string().nullable().optional(),
    ein: z.string().max(30).nullable().optional(),
    einStatus: z.enum(["received", "pending", "not_needed"]).optional(),
    taxYearEnd: z.literal("12-31"),
    taxClassification: z.enum(["disregarded", "partnership"]),
    registeredAgent: z.string().max(300).nullable().optional(),
    raRenewalDate: z.string().nullable().optional(),
    members: z.array(directIndividualOwnerSchema).max(100).optional(),
    filingPreferences: z
      .object({
        remindDaysBefore: z.number().int().min(1).max(90),
        channels: z
          .array(z.enum(["email", "whatsapp"]))
          .min(1)
          .max(2),
        wyAnnualFeeReminderEnabled: z.boolean().optional(),
      })
      .optional(),
    encryptedData: z
      .object({
        version: z.literal(1),
        iv: z.string(),
        ciphertext: z.string(),
      })
      .nullable()
      .optional(),
  })
  .superRefine((body, context) => {
    const summary = body.ownershipSummary;

    if (
      summary.foreignOwnerCount + summary.usOwnerCount !==
      summary.ownerCount
    ) {
      context.addIssue({
        code: "custom",
        path: ["ownershipSummary"],
        message: "Every owner must have a U.S. tax status.",
      });
    }

    if (
      body.entityType === "single-member" &&
      (body.taxClassification !== "disregarded" || summary.ownerCount !== 1)
    ) {
      context.addIssue({
        code: "custom",
        path: ["entityType"],
        message:
          "Single-member LLCs must have one direct individual owner and disregarded tax treatment.",
      });
    }

    if (
      body.entityType === "multi-member" &&
      (body.taxClassification !== "partnership" || summary.ownerCount < 2)
    ) {
      context.addIssue({
        code: "custom",
        path: ["entityType"],
        message:
          "Multi-member LLCs must have at least two direct individual owners and partnership tax treatment.",
      });
    }

    if (body.members?.length) {
      const derived = summarizeOwnerTaxStatuses(body.members);

      const ownershipTotal = body.members.reduce(
        (total, member) => total + member.ownershipPct,
        0
      );

      if (
        derived.ownerCount !== summary.ownerCount ||
        derived.foreignOwnerCount !== summary.foreignOwnerCount ||
        derived.usOwnerCount !== summary.usOwnerCount ||
        Math.abs(ownershipTotal - summary.ownershipTotal) >= 0.01
      ) {
        context.addIssue({
          code: "custom",
          path: ["ownershipSummary"],
          message: "The ownership summary does not match the owner list.",
        });
      }
    }

    if (
      body.filingPreferences?.wyAnnualFeeReminderEnabled &&
      body.state !== "WY"
    ) {
      context.addIssue({
        code: "custom",
        path: ["filingPreferences", "wyAnnualFeeReminderEnabled"],
        message: "The Wyoming annual fee reminder is only available for WY.",
      });
    }

    if (
      body.filingPreferences?.wyAnnualFeeReminderEnabled &&
      !body.formationDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["formationDate"],
        message:
          "A formation date is required for the Wyoming annual fee reminder.",
      });
    }
  });

export async function GET() {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;

  const userLlcs = await db
    .select()
    .from(llcs)
    .where(eq(llcs.userId, session.user.id));

  return NextResponse.json(userLlcs);
}

export async function POST(request: NextRequest) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;

  try {
    const parsed = llcInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "The entity profile is outside the supported scope.",
        },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const ownerResidency = body.members?.length
      ? summarizeOwnerTaxStatuses(body.members).ownerResidency
      : getOwnerResidency(
          body.ownershipSummary.ownerCount,
          body.ownershipSummary.foreignOwnerCount,
          body.ownershipSummary.usOwnerCount
        );

    const encryption = await db.query.userEncryption.findFirst({
      where: eq(userEncryption.userId, session.user.id),
    });

    const hasEncryption = !!encryption;

    if (hasEncryption && !body.encryptedData) {
      return NextResponse.json(
        { error: "Encrypted payload required for this account" },
        { status: 400 }
      );
    }

    if (!hasEncryption && !body.members?.length) {
      return NextResponse.json(
        { error: "The owner list is required." },
        { status: 400 }
      );
    }

    if (!hasEncryption && body.encryptedData) {
      return NextResponse.json(
        { error: "Encrypted ownership data requires a configured vault." },
        { status: 400 }
      );
    }

    const llc = await db.transaction(async (transaction) => {
      const [createdLlc] = await transaction
        .insert(llcs)
        .values({
          userId: session.user.id,
          name: body.name.trim(),
          state: body.state,
          entityType: body.entityType,
          ownerResidency,
          ownersAreIndividuals: body.ownersAreIndividuals,
          ownershipIsDirect: body.ownershipIsDirect,
          ownerCount: body.ownershipSummary.ownerCount,
          foreignOwnerCount: body.ownershipSummary.foreignOwnerCount,
          usOwnerCount: body.ownershipSummary.usOwnerCount,
          formationDate: body.formationDate,
          ein: hasEncryption ? null : body.ein,
          einStatus: body.einStatus || "pending",
          taxYearEnd: body.taxYearEnd || "12-31",
          taxClassification: body.taxClassification,
          registeredAgent: hasEncryption ? null : body.registeredAgent,
          raRenewalDate: body.raRenewalDate,
          members: hasEncryption ? null : body.members,
          filingPreferences: body.filingPreferences || {
            remindDaysBefore: 30,
            channels: ["email"],
            wyAnnualFeeReminderEnabled: false,
          },
          encryptedData: body.encryptedData ?? null,
        })
        .returning();

      await seedComplianceTasks(
        createdLlc.id,
        {
          id: createdLlc.id,
          state: createdLlc.state,
          entityType: createdLlc.entityType,
          ownerResidency: createdLlc.ownerResidency,
          ownersAreIndividuals: createdLlc.ownersAreIndividuals,
          ownershipIsDirect: createdLlc.ownershipIsDirect,
          ownerCount: createdLlc.ownerCount,
          foreignOwnerCount: createdLlc.foreignOwnerCount,
          usOwnerCount: createdLlc.usOwnerCount,
          taxClassification: createdLlc.taxClassification,
          einStatus: createdLlc.einStatus,
          formationDate: createdLlc.formationDate,
          raRenewalDate: createdLlc.raRenewalDate,
          annualReportMonth: createdLlc.annualReportMonth,
          taxYearEnd: createdLlc.taxYearEnd,
          filingPreferences: createdLlc.filingPreferences,
        },
        transaction
      );

      await logAudit(
        {
          userId: session.user.id,
          action: "llc.created",
          resourceType: "llc",
          resourceId: createdLlc.id,
          metadata: {
            name: createdLlc.name,
            state: createdLlc.state,
            encrypted: !!body.encryptedData,
          },
        },
        transaction
      );

      await transaction
        .update(user)
        .set({ onboardingCompleted: true, updatedAt: new Date() })
        .where(eq(user.id, session.user.id));

      return createdLlc;
    });

    return NextResponse.json(llc, { status: 201 });
  } catch (error) {
    logger.error("Failed to create entity", {
      error: error instanceof Error ? error : new Error("Unknown error"),
      userId: session.user.id,
    });

    return NextResponse.json(
      { error: "Unable to create the entity. Please try again." },
      { status: 500 }
    );
  }
}
