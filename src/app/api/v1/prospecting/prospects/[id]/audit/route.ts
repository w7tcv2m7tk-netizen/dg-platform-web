import { organisationGrowthScope, runGrowthProspectAudit } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;

  const { id } = await params;
  const audit = await runGrowthProspectAudit({
    prospectId: id,
    scope: organisationGrowthScope(session.organisationId),
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!audit) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: audit }, { status: 201 });
}
