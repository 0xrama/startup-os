import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { llcs, userEncryption } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { seedComplianceTasks } from "@/lib/compliance-tasks";
import { logAudit } from "@/lib/audit";
import { requireApiContext } from "@/lib/route-guards";

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
  const context = await requireApiContext({ feature: "llcs" });
  if ("response" in context) return context.response;
  const { session } = context;

  const body = await request.json();
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

  const [llc] = await db
    .insert(llcs)
    .values({
      userId: session.user.id,
      name: body.name,
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

  // Auto-generate compliance tasks
  await seedComplianceTasks(llc.id, {
    id: llc.id,
    state: llc.state,
    entityType: llc.entityType,
    ownerResidency: llc.ownerResidency,
    taxClassification: llc.taxClassification,
    einStatus: llc.einStatus,
    formationDate: llc.formationDate,
    raRenewalDate: llc.raRenewalDate,
    annualReportMonth: llc.annualReportMonth,
    taxYearEnd: llc.taxYearEnd,
  });

  await logAudit({
    userId: session.user.id,
    action: "llc.created",
    resourceType: "llc",
    resourceId: llc.id,
    metadata: { name: llc.name, state: llc.state, encrypted: !!body.encryptedData },
  });

  return NextResponse.json(llc, { status: 201 });
}
