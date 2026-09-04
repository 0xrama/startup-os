import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { polar } from "@/lib/polar";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await request.json();

  const productId =
    plan === "pro"
      ? process.env.POLAR_PRO_PRODUCT_ID!
      : process.env.POLAR_STARTER_PRODUCT_ID!;

  const checkout = await polar.checkouts.create({
    products: [productId],
    successUrl: `${request.nextUrl.origin}/dashboard/settings/billing?success=true&plan=${plan}`,
    metadata: {
      userId: session.user.id,
    },
  });

  return NextResponse.json({ checkoutUrl: checkout.url });
}
