import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiContext, requireRecentApiContext } from "@/lib/route-guards";
import {
  getOperationsStatus,
  retryFailedJob,
} from "@/infrastructure/jobs/operations";

export async function GET() {
  const context = await requireApiContext();

  if (context.response) return context.response;

  return NextResponse.json(await getOperationsStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const context = await requireRecentApiContext();

  if (context.response) return context.response;

  const parsed = z
    .object({ id: z.string().uuid(), confirmed: z.literal(true) })
    .safeParse(await request.json().catch(() => null));

  if (!parsed.success)
    return NextResponse.json({ error: "Confirm a job ID" }, { status: 400 });

  const retried = await retryFailedJob(parsed.data.id);

  return retried
    ? NextResponse.json({ status: "queued" })
    : NextResponse.json(
        {
          error:
            "Job cannot be retried. Re-submit document analysis, or review uncertain delivery with your provider.",
        },
        { status: 409 }
      );
}
