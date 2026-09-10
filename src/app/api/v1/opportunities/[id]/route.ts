import {
  deleteOpportunity,
  getOpportunity,
  updateOpportunityStage,
  updateOpportunityStatus,
} from "@dg/platform-core";
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

  let body: { stage?: unknown; status?: unknown; lostReason?: unknown };
  try {
    body = (await req.json()) as { stage?: unknown; status?: unknown; lostReason?: unknown };
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const hasStage = body.stage !== undefined;
  const hasStatus = body.status !== undefined;
  if (hasStage === hasStatus) {
    return NextResponse.json(
      { error: { code: "invalid_update", message: "Update either stage or status" } },
      { status: 422 },
    );
  }

  const { id } = await params;

  if (hasStage) {
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

  if (body.status !== "open" && body.status !== "won" && body.status !== "lost") {
    return NextResponse.json(
      { error: { code: "invalid_status", message: "Status must be open, won, or lost" } },
      { status: 422 },
    );
  }

  const existing = await getOpportunity(session.organisationId, id);
  if (!existing) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Opportunity not found" } },
      { status: 404 },
    );
  }
  if (existing.pipelineId === "founding_10") {
    return NextResponse.json(
      {
        error: {
          code: "managed_workflow",
          message: "Use the Founding workflow controls for this opportunity",
        },
      },
      { status: 409 },
    );
  }

  const lostReason =
    typeof body.lostReason === "string" ? body.lostReason.trim().slice(0, 500) : "";
  if (body.status === "lost" && !lostReason) {
    return NextResponse.json(
      { error: { code: "lost_reason_required", message: "Add a reason before marking this lost" } },
      { status: 422 },
    );
  }

  const updated = await updateOpportunityStatus({
    organisationId: session.organisationId,
    opportunityId: id,
    status: body.status,
    actorId: session.clerkUserId,
    lostReason: body.status === "lost" ? lostReason : null,
  });

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
