import { createBillingPortalSession } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  try {
    const portal = await createBillingPortalSession(
      session.organisationId,
      body.returnUrl as string | undefined,
    );
    return NextResponse.json({ data: portal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal session failed";
    return NextResponse.json(
      { error: { code: "portal_failed", message } },
      { status: 422 },
    );
  }
}
