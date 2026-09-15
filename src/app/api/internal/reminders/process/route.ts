import { NextRequest, NextResponse } from "next/server";
import { authorizeInternalRequest } from "@/lib/internal-auth";
import { enqueueDueReminders } from "@/lib/reminders";

async function run(request: NextRequest) {
  if (!authorizeInternalRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await enqueueDueReminders();

  return NextResponse.json({ queued: count, delivery: "background_worker" });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
