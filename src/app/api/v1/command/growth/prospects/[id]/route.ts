import { getGrowthProspect, updateGrowthProspect } from "@dg/platform-core";
import type { ProspectPipelineStage } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformSession } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.read");
  if (denied) return denied;

  const { id } = await params;
  const prospect = await getGrowthProspect(id);
  if (!prospect) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: prospect });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const updated = await updateGrowthProspect({
    prospectId: id,
    businessName: body?.businessName,
    contactName: body?.contactName,
    contactEmail: body?.contactEmail,
    contactPhone: body?.contactPhone,
    industry: body?.industry,
    location: body?.location,
    websiteUrl: body?.websiteUrl,
    stage: body?.stage as ProspectPipelineStage | undefined,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
