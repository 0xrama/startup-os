import { NextResponse } from "next/server";
import { requireRecentApiContext } from "@/lib/route-guards";
import { deleteAccount } from "@/modules/identity/delete-account";

export async function DELETE() {
  const context = await requireRecentApiContext();

  if ("response" in context) return context.response;

  await deleteAccount(context.session.user.id);

  return NextResponse.json({ success: true, storageCleanup: "queued" });
}
