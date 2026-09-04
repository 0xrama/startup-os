import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { userEncryption } from "@/lib/schema";

function isWrappedPayload(value: unknown): value is {
  version: 1;
  salt: string;
  iv: string;
  ciphertext: string;
} {
  return !!value && typeof value === "object"
    && "version" in value
    && "salt" in value
    && "iv" in value
    && "ciphertext" in value;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!isWrappedPayload(body.pinWrappedMasterKey) || !isWrappedPayload(body.recoveryWrappedMasterKey)) {
      return NextResponse.json({ error: "Invalid encryption payload" }, { status: 400 });
    }

    const existing = await db.query.userEncryption.findFirst({
      where: eq(userEncryption.userId, session.user.id),
    });

    if (existing) {
      return NextResponse.json({ error: "Encryption already configured" }, { status: 409 });
    }

    await db.insert(userEncryption).values({
      userId: session.user.id,
      pinWrappedMasterKey: body.pinWrappedMasterKey,
      recoveryWrappedMasterKey: body.recoveryWrappedMasterKey,
    });

    await logAudit({
      userId: session.user.id,
      action: "account.encryption_enabled",
      resourceType: "user_encryption",
      resourceId: session.user.id,
      metadata: { version: 1 },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Vault setup is temporarily unavailable" }, { status: 503 });
  }
}
