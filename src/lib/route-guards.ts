import { NextResponse } from "next/server";
import { getLlcAccess, requireSession } from "./access";

export async function requireApiContext() {
  try {
    const session = await requireSession();

    return { session };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    throw error;
  }
}

export async function requireApiLlcAccess(userId: string, llcId: string) {
  const access = await getLlcAccess(userId, llcId);

  if (!access) {
    return {
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { access };
}

export async function requireRecentApiContext() {
  const context = await requireApiContext();

  if ("response" in context) return context;

  const createdAt = new Date(context.session.session.createdAt).getTime();

  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 15 * 60_000) {
    return {
      response: NextResponse.json(
        {
          error:
            "Sign out and sign in again before changing secrets or deleting your account.",
        },
        { status: 403 }
      ),
    };
  }

  return context;
}
