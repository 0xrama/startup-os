import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { directIndividualOwnerSchema } from "@/lib/ownership-input";
import { getOwnerResidency } from "@/lib/ownership-scope";
import { llcs, userEncryption } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const ownershipSchema = z
  .object({
    ownersAreIndividuals: z.literal(true),
    ownershipIsDirect: z.literal(true),
    ownerCount: z.number().int().min(1).max(100),
    foreignOwnerCount: z.number().int().min(0).max(100),
    usOwnerCount: z.number().int().min(0).max(100),
    ownershipTotal: z.number().refine((value) => Math.abs(value - 100) < 0.01, {
      message: "Ownership percentages must total 100%.",
    }),
    members: z.array(directIndividualOwnerSchema).max(100).optional(),
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
    if (body.foreignOwnerCount + body.usOwnerCount !== body.ownerCount) {
      context.addIssue({
        code: "custom",
        path: ["ownerCount"],
        message: "Every owner must have a U.S. tax status.",
      });
    }

    if (body.members?.length) {
      const ownershipTotal = body.members.reduce(
        (total, member) => total + member.ownershipPct,
        0
      );

      const foreignOwnerCount = body.members.filter(
        (member) => member.usTaxStatus === "foreign_person"
      ).length;

      const usOwnerCount = body.members.filter(
        (member) => member.usTaxStatus === "us_person"
      ).length;

      if (
        body.members.length !== body.ownerCount ||
        foreignOwnerCount !== body.foreignOwnerCount ||
        usOwnerCount !== body.usOwnerCount ||
        Math.abs(ownershipTotal - body.ownershipTotal) >= 0.01
      ) {
        context.addIssue({
          code: "custom",
          path: ["members"],
          message: "The ownership summary does not match the owner list.",
        });
      }
    }
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;
  const { id } = await params;

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;
  const llc = access.access.llc;

  const parsed = ownershipSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "A valid direct-individual ownership profile is required.",
      },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const expectedOwnerCount = llc.entityType === "single-member" ? 1 : 2;

  const classificationIsSupported =
    (llc.entityType === "single-member" &&
      llc.taxClassification === "disregarded") ||
    (llc.entityType === "multi-member" &&
      llc.taxClassification === "partnership");

  if (
    !classificationIsSupported ||
    (llc.entityType === "single-member" && body.ownerCount !== 1) ||
    (llc.entityType === "multi-member" && body.ownerCount < expectedOwnerCount)
  ) {
    return NextResponse.json(
      {
        error:
          "This entity type and tax classification are outside the supported scope.",
      },
      { status: 400 }
    );
  }

  const encryption = await db.query.userEncryption.findFirst({
    where: eq(userEncryption.userId, session.user.id),
  });

  const hasEncryption = Boolean(encryption);

  if (hasEncryption && !body.encryptedData) {
    return NextResponse.json(
      { error: "Unlock the vault before updating ownership." },
      { status: 400 }
    );
  }

  if (!hasEncryption && !body.members?.length) {
    return NextResponse.json(
      { error: "The owner list is required." },
      { status: 400 }
    );
  }

  const ownerResidency = getOwnerResidency(
    body.ownerCount,
    body.foreignOwnerCount,
    body.usOwnerCount
  );

  const updated = await db.transaction(async (transaction) => {
    const [updatedLlc] = await transaction
      .update(llcs)
      .set({
        ownerResidency,
        ownersAreIndividuals: body.ownersAreIndividuals,
        ownershipIsDirect: body.ownershipIsDirect,
        ownerCount: body.ownerCount,
        foreignOwnerCount: body.foreignOwnerCount,
        usOwnerCount: body.usOwnerCount,
        members: hasEncryption ? null : body.members,
        encryptedData: hasEncryption
          ? (body.encryptedData ?? llc.encryptedData)
          : llc.encryptedData,
        updatedAt: new Date(),
      })
      .where(eq(llcs.id, id))
      .returning();

    await logAudit(
      {
        userId: session.user.id,
        action: "llc.ownership_updated",
        resourceType: "llc",
        resourceId: id,
        metadata: {
          ownerCount: body.ownerCount,
          foreignOwnerCount: body.foreignOwnerCount,
          usOwnerCount: body.usOwnerCount,
        },
      },
      transaction
    );

    return updatedLlc;
  });

  return NextResponse.json(updated);
}
