import { NextRequest } from "next/server";
import { z } from "zod";
import { createOperatingAgreementDraft } from "@/lib/operating-agreement";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const draftRequestSchema = z.object({
  registeredAgent: z.string().max(300).optional().nullable(),
  businessPurpose: z.string().max(2_000).optional().nullable(),
  members: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        ownershipPct: z.number().min(0).max(100),
        country: z.string().max(100),
        taxIdType: z.string().max(100),
      })
    )
    .max(100)
    .optional(),
});

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  const parsed = draftRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return new Response("Valid member information is required", {
      status: 400,
    });
  }

  const llc = access.access.llc;

  const draft = createOperatingAgreementDraft({
    name: llc.name,
    state: llc.state,
    formationDate: llc.formationDate,
    entityType: llc.entityType,
    taxClassification: llc.taxClassification,
    registeredAgent: parsed.data.registeredAgent ?? llc.registeredAgent,
    businessPurpose: parsed.data.businessPurpose,
    members: parsed.data.members ?? llc.members ?? [],
  });

  return new Response(draft, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${safeFileName(llc.name)}-operating-agreement-draft.md"`,
      "cache-control": "no-store",
    },
  });
}
