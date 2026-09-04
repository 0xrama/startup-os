import { NextRequest, NextResponse } from "next/server";
import { authorizeInternalRequest } from "@/lib/internal-auth";
import { processPendingReminders } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  if (!authorizeInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await processPendingReminders();
  return NextResponse.json({ processed: count });
}
