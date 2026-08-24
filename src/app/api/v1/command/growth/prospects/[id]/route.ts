import {
  archiveGrowthProspect,
  getGrowthProspect,
  restoreGrowthProspect,
  updateGrowthProspect,
} from "@dg/platform-core";
import type { ProspectPipelineStage } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const prospect = await getGrowthProspect(id, session.organisationId);
  if (!prospect) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: prospect });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const updated = await updateGrowthProspect({
    prospectId: id,
    organisationId: session.organisationId,
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

/** Soft-archive prospect (demo cleanup). Audits/reports remain; hidden from default lists. */
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
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

/** Restore a soft-archived prospect (`{ "action": "restore" }`). */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.action !== "restore") {
    return NextResponse.json(
      { error: { code: "validation_error", message: 'Expected action: "restore"' } },
      { status: 422 },
    );
  }

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
