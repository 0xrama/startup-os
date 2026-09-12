import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { getAiConfig } from "@/lib/ai-config";
import { requireApiContext } from "@/lib/route-guards";

const SINGLETON_ID = "singleton";

const settingsSchema = z.object({
  aiBaseUrl: z.string().optional(),
  aiModel: z.string().optional(),
  aiApiKey: z.string().optional(),
});

function normalizeOptionalString(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const context = await requireApiContext();

  if ("response" in context) return context.response;

  const config = await getAiConfig();

  return NextResponse.json({
    aiBaseUrl: config.baseUrl,
    aiModel: config.model,
    hasAiApiKey: Boolean(config.apiKey),
    aiApiKeyLast4: config.apiKey ? config.apiKey.slice(-4) : null,
  });
}

export async function PUT(request: Request) {
  const context = await requireApiContext();

  if ("response" in context) return context.response;

  const parsed = settingsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid settings payload" },
      { status: 400 }
    );
  }

  const existing = await db.query.appSettings.findFirst({
    where: eq(appSettings.id, SINGLETON_ID),
  });

  const submittedKey = normalizeOptionalString(parsed.data.aiApiKey);

  const values = {
    aiBaseUrl: normalizeOptionalString(parsed.data.aiBaseUrl),
    aiModel: normalizeOptionalString(parsed.data.aiModel),
    aiApiKey: submittedKey ?? existing?.aiApiKey ?? null,
    updatedAt: new Date(),
  };

  await db
    .insert(appSettings)
    .values({ id: SINGLETON_ID, ...values })
    .onConflictDoUpdate({ target: appSettings.id, set: values });

  return NextResponse.json({ success: true });
}
