import { getOrganisationMrr, listSubscriptions } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const [subscriptions, mrr] = await Promise.all([
    listSubscriptions(session.organisationId, { status }),
    getOrganisationMrr(session.organisationId),
  ]);

  return NextResponse.json({
    data: {
      subscriptions,
      mrrCents: mrr.mrrCents,
      activeCount: mrr.activeCount,
    },
  });
}
