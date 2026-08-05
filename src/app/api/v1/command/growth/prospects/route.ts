import {
  createGrowthProspect,
  getGrowthEngineSummary,
  listGrowthProspects,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("summary") === "1") {
    const summary = await getGrowthEngineSummary();
    return NextResponse.json({ data: summary });
  }

  const stage = searchParams.get("stage") ?? undefined;
  const prospects = await listGrowthProspects({
    stage: stage as import("@dg/platform-core").ProspectPipelineStage | undefined,
    ownerClerkUserId: searchParams.get("owner") ?? undefined,
  });

  return NextResponse.json({ data: prospects });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.businessName !== "string" || !body.businessName.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "businessName is required" } },
      { status: 422 },
    );
  }

  const prospect = await createGrowthProspect({
    businessName: body.businessName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    industry: body.industry,
    location: body.location,
    websiteUrl: body.websiteUrl,
    ownerClerkUserId: session.clerkUserId,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  return NextResponse.json({ data: prospect }, { status: 201 });
}
