import { and, desc, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { documentPackages } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import {
  currentFilingTaxYear,
  assessFederalTaxFiling,
  buildPreparationChecks,
} from "@/lib/tax-copilot";
import {
  generateFilingPackage,
  resolvePackageType,
} from "@/lib/filing-package";

const generateSchema = z.object({
  taxYear: z.number().int().min(2017).max(2100).optional(),
});

const PACKAGE_TYPE_LABELS = {
  form_5472_proforma_1120: "Form 5472 + pro forma 1120",
  form_1065: "Form 1065",
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;
  const { id } = await params;

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;

  const packages = await db
    .select({
      id: documentPackages.id,
      packageType: documentPackages.packageType,
      taxYear: documentPackages.taxYear,
      version: documentPackages.version,
      status: documentPackages.status,
      title: documentPackages.title,
      fileName: documentPackages.fileName,
      checksum: documentPackages.checksum,
      byteSize: documentPackages.byteSize,
      markedFiledAt: documentPackages.markedFiledAt,
      filedMethod: documentPackages.filedMethod,
      filedReference: documentPackages.filedReference,
      proofDocumentId: documentPackages.proofDocumentId,
      createdAt: documentPackages.createdAt,
    })
    .from(documentPackages)
    .where(eq(documentPackages.llcId, id))
    .orderBy(desc(documentPackages.createdAt));

  return NextResponse.json(packages);
}

export async function POST(
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

  const parsed = generateSchema.safeParse(
    await request.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid tax year is required." },
      { status: 400 }
    );
  }

  const profile = { ...llc };
  const assessment = assessFederalTaxFiling(profile);
  const packageType = resolvePackageType(assessment.route);

  if (!packageType) {
    return NextResponse.json(
      {
        error:
          assessment.route === "domestic_disregarded_entity"
            ? "A domestic disregarded entity's activity belongs on the owner's return, so Pax does not produce a separate federal filing package for it."
            : "Confirm the supported ownership profile before generating a filing package.",
        scopeReasons: assessment.reasons,
      },
      { status: 400 }
    );
  }

  const taxYear = parsed.data.taxYear ?? currentFilingTaxYear(new Date());
  const checks = buildPreparationChecks(profile, assessment);

  const [latest] = await db
    .select({ version: documentPackages.version })
    .from(documentPackages)
    .where(
      and(
        eq(documentPackages.llcId, id),
        eq(documentPackages.packageType, packageType),
        eq(documentPackages.taxYear, taxYear)
      )
    )
    .orderBy(desc(documentPackages.version))
    .limit(1);

  const version = (latest?.version ?? 0) + 1;

  const generated = generateFilingPackage({
    profile,
    assessment,
    checks,
    packageType,
    state: llc.state,
    version,
  });

  const checksum = createHash("sha256")
    .update(generated.markdown, "utf8")
    .digest("hex");

  const [created] = await db
    .insert(documentPackages)
    .values({
      llcId: id,
      userId: session.user.id,
      packageType,
      taxYear,
      version,
      status: "draft",
      title: generated.title,
      fileName: generated.fileName,
      contentFormat: "text/markdown",
      content: generated.markdown,
      checksum,
      byteSize: Buffer.byteLength(generated.markdown, "utf8"),
    })
    .returning();

  await logAudit({
    userId: session.user.id,
    action: "package.generated",
    resourceType: "document_package",
    resourceId: created.id,
    metadata: {
      packageType,
      taxYear,
      version,
      checksum,
    },
  });

  // JSON.stringify drops undefined properties, so the package content never
  // leaves the server in the create response; downloads use the bytes route.
  return NextResponse.json(
    {
      ...created,
      content: undefined,
      typeLabel: PACKAGE_TYPE_LABELS[packageType],
    },
    { status: 201 }
  );
}
