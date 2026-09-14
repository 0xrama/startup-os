import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { llcs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";
import { z } from "zod";

const filingPreferencesSchema = z.object({
  remindDaysBefore: z.number().int().min(1).max(90),
  channels: z
    .array(z.enum(["email", "whatsapp"]))
    .min(1)
    .max(2),
  checklists: z
    .object({
      first30Days: z.record(z.string(), z.boolean()).optional(),
    })
    .optional(),
  wyAnnualFeeReminderEnabled: z.boolean().optional(),
});

const wellnessProfileSchema = z
  .object({
    businessStatus: z
      .enum(["not_started", "pre_revenue", "active", "inactive"])
      .optional(),
    businessDescription: z.string().max(2_000).optional(),
    engagedInUSTradeOrBusiness: z.enum(["yes", "no", "unsure"]).optional(),
    principalPlaceOfBusiness: z.enum(["us", "outside_us", "unsure"]).optional(),
    hasUSBankAccount: z.boolean().optional(),
    bookkeepingCurrent: z.boolean().optional(),
    hasEmployees: z.boolean().optional(),
    usesContractors: z.boolean().optional(),
    makesTaxableSales: z.boolean().optional(),
    operatesOutsideFormationState: z.boolean().optional(),
    updatedAt: z.string().optional(),
  })
  .nullable();

const patchSchema = z
  .object({
    filingPreferences: filingPreferencesSchema.optional(),
    wellnessProfile: wellnessProfileSchema.optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.filingPreferences !== undefined ||
      body.wellnessProfile !== undefined,
    { message: "No supported profile changes were provided." }
  );

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

  return NextResponse.json(access.access.llc);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;
  const { session } = context;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "No supported profile changes were provided.",
      },
      { status: 400 }
    );
  }

  const access = await requireApiLlcAccess(session.user.id, id);

  if ("response" in access) return access.response;
  const llc = access.access.llc;
  const body = parsed.data;

  const filingPreferences = body.filingPreferences
    ? {
        remindDaysBefore: body.filingPreferences.remindDaysBefore,
        channels: body.filingPreferences.channels,
        checklists:
          body.filingPreferences.checklists ??
          llc.filingPreferences?.checklists,
        wyAnnualFeeReminderEnabled:
          body.filingPreferences.wyAnnualFeeReminderEnabled ??
          llc.filingPreferences?.wyAnnualFeeReminderEnabled,
      }
    : undefined;

  const [updated] = await db
    .update(llcs)
    .set({
      filingPreferences,
      wellnessProfile: body.wellnessProfile,
      updatedAt: new Date(),
    })
    .where(eq(llcs.id, id))
    .returning();

  return NextResponse.json(updated);
}
