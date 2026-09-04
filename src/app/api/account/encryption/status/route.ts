import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userEncryption } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({
        configured: false,
        pinWrappedMasterKey: null,
        recoveryWrappedMasterKey: null,
      });
    }

    const encryption = await db.query.userEncryption.findFirst({
      where: eq(userEncryption.userId, session.user.id),
    });

    return NextResponse.json({
      configured: !!encryption,
      pinWrappedMasterKey: encryption?.pinWrappedMasterKey ?? null,
      recoveryWrappedMasterKey: encryption?.recoveryWrappedMasterKey ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Vault status unavailable" }, { status: 503 });
  }
}
