import { createPlatformCheckoutSession } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, rejectDemoLiveAction, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const platformTier = (body.platformTier as string | undefined) ?? "professional";

  try {
    const checkout = await createPlatformCheckoutSession({
      organisationId: session.organisationId,
      email: session.email,
      platformTier,
      industryApps: body.industryApps,
      premiumApps: body.premiumApps,
      businessName: session.organisationName,
    });
    return NextResponse.json({ data: checkout });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json(
      { error: { code: "checkout_failed", message } },
      { status: 422 },
    );
  }
}
