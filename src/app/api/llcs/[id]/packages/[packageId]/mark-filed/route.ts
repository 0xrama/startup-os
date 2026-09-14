import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { documentPackages } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const markFiledSchema = z.object({
  filedMethod: z.enum(["fax", "mail", "e-file", "other"]),
  filedReference: z.string().trim().max(200).optional(),
  filedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
    .optional(),
});

/**
 * Records that the user filed the package themselves, outside Pax. This is a
 * user record: Pax never verifies a submission and never receives an IRS
 * acknowledgement, and the copy says so.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packageId: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;
  const { id, packageId } = await params;

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;

  const parsed = markFiledSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "A filing method and valid dates are required.",
      },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(documentPackages)
    .where(
      and(eq(documentPackages.id, packageId), eq(documentPackages.llcId, id))
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: "This package is already marked as filed." },
      { status: 409 }
    );
  }

  const filedAt = parsed.data.filedAt
    ? new Date(`${parsed.data.filedAt}T00:00:00.000Z`)
    : new Date();

  const [updated] = await db
    .update(documentPackages)
    .set({
      status: "marked_filed",
      markedFiledAt: filedAt,
      filedMethod: parsed.data.filedMethod,
      filedReference: parsed.data.filedReference ?? null,
      updatedAt: new Date(),
    })
    .where(eq(documentPackages.id, packageId))
    .returning();

  await logAudit({
    userId: session.user.id,
    action: "package.marked_filed",
    resourceType: "document_package",
    resourceId: packageId,
    metadata: {
      packageType: existing.packageType,
      taxYear: existing.taxYear,
      version: existing.version,
      checksum: existing.checksum,
      filedMethod: parsed.data.filedMethod,
    },
  });

  return NextResponse.json({
    package: {
      id: updated.id,
      status: updated.status,
      markedFiledAt: updated.markedFiledAt,
      filedMethod: updated.filedMethod,
      filedReference: updated.filedReference,
    },
    message:
      "Recorded as filed by you. Pax did not transmit anything and cannot verify the submission.",
  });
}
