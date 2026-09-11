import { convertGrowthProspectToCrm } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  for (const feature of [
    "prospecting.prospects.write",
    "crm.companies.write",
    "crm.contacts.write",
    "crm.opportunities.write",
  ] as const) {
    const denied = requireFeature(session, feature);
    if (denied) return denied;
  }

  const { id } = await params;
  const converted = await convertGrowthProspectToCrm({
    organisationId: session.organisationId,
    prospectId: id,
    actorId: session.clerkUserId,
  });

  if (!converted) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: converted });
}
