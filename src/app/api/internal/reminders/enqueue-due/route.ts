import { NextRequest, NextResponse } from "next/server";
import { authorizeInternalRequest } from "@/lib/internal-auth";
import { enqueueDueReminders } from "@/modules/notifications/reminders";

async function run(request: NextRequest) {
  if (!authorizeInternalRequest(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ count: await enqueueDueReminders() });
}

export const GET = run;

export const POST = run;
