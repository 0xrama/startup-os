import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/assistant-store";
import { requireApiContext, requireApiLlcAccess } from "@/lib/route-guards";

export async function GET(request: NextRequest) {
  try {
    const context = await requireApiContext({ feature: "assistant" });
    if ("response" in context) return context.response;
    const { session } = context;
    const llcId = request.nextUrl.searchParams.get("llcId") ?? undefined;

    if (llcId) {
      const access = await requireApiLlcAccess(session.user.id, llcId);
      if ("response" in access) return access.response;
    }

    const conversations = await listConversations(session.user.id, llcId);
    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load conversations" },
      { status: 500 }
    );
  }
}
