import { NextResponse } from "next/server";
import {
  getConversation,
  getConversationMessages,
} from "@/lib/assistant-store";
import { requireApiContext } from "@/lib/route-guards";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;

    const conversation = await getConversation(session.user.id, id);

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const search = new URL(request.url).searchParams;

    const page = await getConversationMessages(conversation.id, {
      before: search.get("before") ?? undefined,
      limit: Number(search.get("limit") ?? 100),
    });

    return NextResponse.json({
      conversation,
      ...page,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load conversation",
      },
      { status: 500 }
    );
  }
}
