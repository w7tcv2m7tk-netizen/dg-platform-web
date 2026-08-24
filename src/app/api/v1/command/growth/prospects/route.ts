import {
  createGrowthProspect,
  getGrowthEngineSummary,
  listGrowthProspects,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function GET(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("summary") === "1") {
    const summary = await getGrowthEngineSummary(session.organisationId);
    return NextResponse.json({ data: summary });
  }

  const stage = searchParams.get("stage") ?? undefined;
  const archived = searchParams.get("archived");
  const prospects = await listGrowthProspects({
    organisationId: session.organisationId,
    stage: stage as import("@dg/platform-core").ProspectPipelineStage | undefined,
    ownerClerkUserId: searchParams.get("owner") ?? undefined,
    includeArchived: archived === "1" || archived === "all",
    archivedOnly: archived === "only",
  });

  return NextResponse.json({ data: prospects });
}

export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.businessName !== "string" || !body.businessName.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "businessName is required" } },
      { status: 422 },
    );
  }

  const prospect = await createGrowthProspect({
    organisationId: session.organisationId,
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
