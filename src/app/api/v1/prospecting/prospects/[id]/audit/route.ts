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
  let hasWebsite = false;
  try { hasWebsite = ["http:", "https:"].includes(new URL(prospect.websiteUrl ?? "").protocol); } catch { /* Missing or invalid website. */ }
  if (!hasWebsite) {
    return NextResponse.json({ error: { code: "website_required", message: "Use Edit to add a valid business website before starting research." } }, { status: 422 });
  }
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
