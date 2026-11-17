import { getGrowthProspect, organisationGrowthScope, runGrowthProspectAudit } from "@dg/platform-core";
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
  const scope = organisationGrowthScope(session.organisationId);
  const prospect = await getGrowthProspect(id, scope);
  if (!prospect || prospect.archivedAt) {
    return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  }
  // Research is allowed without a website: the presence audit records the
  // missing-website limitation explicitly rather than blocking CRM/ABR
  // evidence from progressing. Website probes only run for a valid HTTP(S) URL.
  const audit = await runGrowthProspectAudit({
    prospectId: id,
    scope,
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
