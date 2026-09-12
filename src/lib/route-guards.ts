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
