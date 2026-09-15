import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CONVERSATION_TITLE_MAX_CHARS,
  deleteConversation,
  getConversation,
  getConversationMessages,
  renameConversation,
} from "@/lib/assistant-store";
import { logAudit } from "@/lib/audit";
import { requireApiContext } from "@/lib/route-guards";

const renameSchema = z.object({
  title: z.string().trim().min(1).max(CONVERSATION_TITLE_MAX_CHARS),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;

    const parsed = renameSchema.safeParse(
      await request.json().catch(() => null)
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A title of 1 to 80 characters is required" },
        { status: 400 }
      );
    }

    const conversation = await renameConversation(
      session.user.id,
      id,
      parsed.data.title
    );

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to rename thread",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireApiContext();

    if ("response" in context) return context.response;
    const { session } = context;
    const { id } = await params;

    const deleted = await deleteConversation(session.user.id, id);

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await logAudit({
      userId: session.user.id,
      action: "conversation.deleted",
      resourceType: "conversation",
      resourceId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to delete thread",
      },
      { status: 500 }
    );
  }
}

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
