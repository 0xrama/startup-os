import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { complianceTasks } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

const updateTaskSchema = z.object({
  status: z.string().optional(),
  metadata: z
    .object({
      filingCode: z.string().optional(),
      filingYear: z.number().optional(),
      optional: z.boolean().optional(),
      applicable: z.boolean().optional(),
      optionalPrompt: z.string().optional(),
      checklist: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            done: z.boolean().optional(),
          })
        )
        .optional(),
      filing: z
        .object({
          filedAt: z.string().nullable().optional(),
          filedMethod: z
            .enum([
              "fax",
              "mail",
              "online",
              "e-file",
              "phone",
              "manual",
              "other",
            ])
            .nullable()
            .optional(),
          acknowledgementStatus: z
            .enum(["received", "pending", "not_available"])
            .nullable()
            .optional(),
          acknowledgementReference: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;

  const { id, taskId } = await params;
  const parsed = updateTaskSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid task payload" },
      { status: 400 }
    );
  }

  const body = parsed.data;

  // Verify LLC ownership
  const llc = await requireApiLlcAccess(session.user.id, id);

  if ("response" in llc) return llc.response;

  const updateData: Partial<typeof complianceTasks.$inferInsert> = {
    ...body,
    updatedAt: new Date(),
  };

  if (body.status === "completed") {
    updateData.completedAt = new Date();
  } else if (body.status && body.status !== "completed") {
    updateData.completedAt = null;
  }

  const [updated] = await db
    .update(complianceTasks)
    .set(updateData)
    .where(and(eq(complianceTasks.id, taskId), eq(complianceTasks.llcId, id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
