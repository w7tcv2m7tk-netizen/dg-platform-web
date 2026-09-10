import { deleteOpportunity, getOpportunity, updateOpportunityStage } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.opportunities.read");
  if (denied) return denied;

  const { id } = await params;
  const row = await getOpportunity(session.organisationId, id);
  if (!row) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Opportunity not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: row });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.opportunities.write");
  if (denied) return denied;

  let body: { stage?: unknown };
  try {
    body = (await req.json()) as { stage?: unknown };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  if (typeof body.stage !== "string") {
    return NextResponse.json(
      { error: { code: "invalid_stage", message: "Stage is required" } },
      { status: 422 },
    );
  }

  const stage = body.stage.trim().replace(/\s+/g, "_").toLowerCase();
  if (!stage || stage.length > 80) {
    return NextResponse.json(
      { error: { code: "invalid_stage", message: "Use a stage between 1 and 80 characters" } },
      { status: 422 },
    );
  }

  const { id } = await params;
  const updated = await updateOpportunityStage(
    session.organisationId,
    id,
    stage,
    session.clerkUserId,
  );

  if (!updated) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Opportunity not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const writeDenied = requireFeature(session, "crm.opportunities.write");
  if (writeDenied) return writeDenied;

  const { id } = await params;
  const existing = await getOpportunity(session.organisationId, id);
  if (!existing) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Opportunity not found" } },
      { status: 404 },
    );
  }

  // deleteOpportunity currently removes its linked source Lead as a lifecycle
  // side-effect. Do not permit that cross-object mutation without Lead write authority.
  if (existing.leadId) {
    const leadWriteDenied = requireFeature(session, "crm.leads.write");
    if (leadWriteDenied) return leadWriteDenied;
  }

  const deleted = await deleteOpportunity({
    organisationId: session.organisationId,
    opportunityId: id,
    actorId: session.clerkUserId,
  });

  if (!deleted) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Opportunity not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id: deleted.id, deleted: true } });
}
