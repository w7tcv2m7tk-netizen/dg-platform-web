import { getGrowthProspect, organisationGrowthScope, updateGrowthProspect } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams { params: Promise<{ id: string }>; }

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "qualify" && action !== "disqualify") {
    return NextResponse.json({ error: { code: "validation_error", message: "Qualification action is required" } }, { status: 422 });
  }

  const prospect = await getGrowthProspect(id, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) {
    return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  }
  if (prospect.stage !== "audit_created") {
    return NextResponse.json({ error: { code: "invalid_stage", message: "Only research-stage prospects can be qualified or disqualified." } }, { status: 409 });
  }
  if (action === "qualify" && (!prospect.contactName || (!prospect.contactPhone && !prospect.contactEmail))) {
    return NextResponse.json({ error: { code: "contact_required", message: "Identify the decision-maker and add a phone number or email before qualification." } }, { status: 422 });
  }

  const updated = await updateGrowthProspect({
    prospectId: id,
    organisationId: session.organisationId,
    stage: action === "qualify" ? "qualified" : "lost",
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });
  return NextResponse.json({ data: updated });
}
