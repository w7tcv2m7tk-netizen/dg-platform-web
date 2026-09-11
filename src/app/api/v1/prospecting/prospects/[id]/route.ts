import {
  archiveGrowthProspect,
  restoreGrowthProspect,
  updateGrowthProspect,
  type ProspectPipelineStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireProspectWriter(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  return denied ?? session;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireProspectWriter(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Valid prospect changes are required" } },
      { status: 422 },
    );
  }

  const updated = await updateGrowthProspect({
    prospectId: id,
    organisationId: session.organisationId,
    businessName: typeof body.businessName === "string" ? body.businessName : undefined,
    contactName: typeof body.contactName === "string" ? body.contactName : undefined,
    contactEmail: typeof body.contactEmail === "string" ? body.contactEmail : undefined,
    contactPhone: typeof body.contactPhone === "string" ? body.contactPhone : undefined,
    industry: typeof body.industry === "string" ? body.industry : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    websiteUrl: typeof body.websiteUrl === "string" ? body.websiteUrl : undefined,
    stage: typeof body.stage === "string" ? (body.stage as ProspectPipelineStage) : undefined,
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

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requireProspectWriter(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const archived = await archiveGrowthProspect({
    prospectId: id,
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!archived) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: archived });
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requireProspectWriter(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  if (body?.action !== "restore") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Restore action is required" } },
      { status: 422 },
    );
  }

  const { id } = await params;
  const restored = await restoreGrowthProspect({
    prospectId: id,
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!restored) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: restored });
}
