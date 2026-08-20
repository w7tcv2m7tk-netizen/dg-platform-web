import { getCommunicationsOverview, getVoiceProviderStatus } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.analytics.read");
  if (denied) return denied;

  const [overview, provider] = await Promise.all([
    getCommunicationsOverview(session.organisationId),
    getVoiceProviderStatus(),
  ]);

  const billingDenied = requireFeature(session, "comms.billing.read");
  return NextResponse.json({
    data: {
      overview: billingDenied
        ? { ...overview, estimatedCostCents: 0 }
        : overview,
      provider: billingDenied ? { ...provider, usage: null } : provider,
    },
  });
}
