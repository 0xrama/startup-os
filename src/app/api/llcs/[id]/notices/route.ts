import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { noticeCases } from "@/lib/schema";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const manualNoticeSchema = z.object({
  issuer: z.string().trim().min(1).max(200),
  noticeType: z.string().trim().max(120).optional(),
  taxYear: z.number().int().min(2010).max(2100).optional(),
  responseDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")
    .optional(),
  summary: z.string().trim().max(2_000).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;
    const access = await requireApiLlcAccess(session.user.id, id);

    if ("response" in access) return access.response;

    const notices = await db.query.noticeCases.findMany({
      where: eq(noticeCases.llcId, id),
    });

    return NextResponse.json(notices);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load notices",
      },
      { status: 500 }
    );
  }
}

/**
 * Records a notice by hand, without an uploaded document. The draft task
 * payload mirrors what extraction produces so Confirm works the same way for
 * both: it creates the response task and schedules reminders.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;
    const access = await requireApiLlcAccess(session.user.id, id);

    if ("response" in access) return access.response;

    const parsed = manualNoticeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Issuer and valid dates are required.",
        },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const [created] = await db
      .insert(noticeCases)
      .values({
        documentId: null,
        llcId: id,
        userId: session.user.id,
        status: "ready",
        issuer: body.issuer,
        noticeType: body.noticeType ?? null,
        taxYear: body.taxYear ?? null,
        responseDueDate: body.responseDueDate ?? null,
        summary: body.summary ?? null,
        riskLevel: body.riskLevel ?? "medium",
        structuredData: { source: "manual" },
        draftTaskPayload: body.responseDueDate
          ? {
              title: `Respond to ${body.issuer} notice`,
              description:
                body.summary ??
                `A notice from ${body.issuer} was recorded manually. Respond by the due date and keep proof of your response.`,
              dueDate: body.responseDueDate,
              category: "notice",
            }
          : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to record notice",
      },
      { status: 500 }
    );
  }
}
