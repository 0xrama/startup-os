import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import {
  createAssessment,
  listAssessments,
  listTransactions,
  recordTransaction,
  removeTransaction,
  reviewAssessment,
  taxYearSchema,
  transactionSchema,
} from "@/modules/compliance/records";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remove"),
    id: z.string().uuid(),
    confirmed: z.literal(true),
  }),
  z.object({ action: z.literal("record"), facts: transactionSchema }),

  z.object({ action: z.literal("assess"), taxYear: taxYearSchema }),

  z.object({
    action: z.literal("review"),
    id: z.string().uuid(),
    notes: z.string().trim().min(1).max(2000),
    confirmed: z.literal(true),
  }),
]);

type Params = { params: Promise<{ id: string }> };

async function authorize(
  params: Params
): Promise<{ id: string } | { error: NextResponse }> {
  const context = await requireApiContext();

  if (context.response) return { error: context.response };

  const { id } = await params.params;

  const access = await requireApiLlcAccess(context.session.user.id, id);

  if (access.response) return { error: access.response };

  return { id };
}

export async function GET(request: Request, params: Params) {
  const access = await authorize(params);

  if ("error" in access) return access.error;

  const year = taxYearSchema.safeParse(
    new URL(request.url).searchParams.get("year")
  );

  if (!year.success) {
    return NextResponse.json({ error: "Select a tax year" }, { status: 400 });
  }

  const [transactions, assessments] = await Promise.all([
    listTransactions(access.id, year.data),

    listAssessments(access.id, year.data),
  ]);

  return NextResponse.json(
    { transactions, assessments },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request, params: Params) {
  const access = await authorize(params);

  if ("error" in access) return access.error;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review data" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === "remove") {
    const [removed] = await removeTransaction(access.id, data.id);

    return removed
      ? NextResponse.json(removed)
      : NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (data.action === "record") {
    return NextResponse.json(await recordTransaction(access.id, data.facts), {
      status: 201,
    });
  }

  if (data.action === "assess") {
    return NextResponse.json(await createAssessment(access.id, data.taxYear), {
      status: 201,
    });
  }

  const [reviewed] = await reviewAssessment(access.id, data.id, data.notes);

  return reviewed
    ? NextResponse.json(reviewed)
    : NextResponse.json(
        { error: "Assessment not found or already reviewed" },
        { status: 409 }
      );
}
