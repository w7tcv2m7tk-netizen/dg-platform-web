import {
  canAccessCommandCentre,
  listPlatformOpportunities,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

/** Lightweight badge counts for Command Centre sidebar. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.opportunities.read");
  if (denied) return denied;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
    principalId: session.clerkUserId,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Command Centre is internal only" } },
      { status: 403 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ attentionCount: 0, opportunityCount: 0 });
  }

  const data = await listPlatformOpportunities({ scope: "staff", limit: 40 });
  return NextResponse.json({
    attentionCount: data.attentionCount,
    opportunityCount: data.opportunityCount,
    generatedAt: data.generatedAt,
  });
}
