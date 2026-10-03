import { getGrowthProspect, organisationGrowthScope, researchProspectDecisionMaker } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;
  const { id } = await params;
  const prospect = await getGrowthProspect(id, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  if (prospect.stage !== "audit_created") return NextResponse.json({ error: { code: "invalid_stage", message: "Decision-maker research is only available during Research." } }, { status: 409 });
  const result = await researchProspectDecisionMaker(prospect.websiteUrl);
  return NextResponse.json({ data: result });
}
