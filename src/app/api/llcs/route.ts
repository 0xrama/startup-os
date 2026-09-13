import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { llcs, user, userEncryption } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedComplianceTasks } from "@/lib/compliance-tasks";
import { logAudit } from "@/lib/audit";
import { requireApiContext } from "@/lib/route-guards";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api.llcs");

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
    const body = await request.json();

    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      typeof body.state !== "string" ||
      !body.state ||
      typeof body.entityType !== "string" ||
      !body.entityType
    ) {
      return NextResponse.json(
        { error: "Name, state, and entity type are required." },
        { status: 400 }
      );
    }

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

    const llc = await db.transaction(async (transaction) => {
      const [createdLlc] = await transaction
        .insert(llcs)
        .values({
          userId: session.user.id,
          name: body.name.trim(),
          state: body.state,
          entityType: body.entityType,
          ownerResidency: body.ownerResidency || "non_us",
          formationDate: body.formationDate,
          ein: hasEncryption ? null : body.ein,
          einStatus: body.einStatus || "pending",
          taxYearEnd: body.taxYearEnd || "12-31",
          taxClassification: body.taxClassification,
          registeredAgent: hasEncryption ? null : body.registeredAgent,
          raRenewalDate: body.raRenewalDate,
          annualReportMonth: body.annualReportMonth,
          members: hasEncryption ? null : body.members,
          filingPreferences: body.filingPreferences || {
            remindDaysBefore: 30,
            channels: ["email"],
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
          taxClassification: createdLlc.taxClassification,
          einStatus: createdLlc.einStatus,
          formationDate: createdLlc.formationDate,
          raRenewalDate: createdLlc.raRenewalDate,
          annualReportMonth: createdLlc.annualReportMonth,
          taxYearEnd: createdLlc.taxYearEnd,
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
