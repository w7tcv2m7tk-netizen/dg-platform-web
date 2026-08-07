import {
  convertLeadToOpportunity,
  createOpportunity,
  getOpportunity,
  listOpportunities,
  updateOpportunityStage,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.opportunities.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const stage = searchParams.get("stage") ?? undefined;
  const leadId = searchParams.get("leadId") ?? undefined;
  const id = searchParams.get("id");

  if (id) {
    const row = await getOpportunity(session.organisationId, id);
    if (!row) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Opportunity not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: row });
  }

  const result = await listOpportunities({
    organisationId: session.organisationId,
    status,
    stage,
    leadId,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.opportunities.write");
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));

  if (body.action === "convert_lead" || body.leadId) {
    const leadId = typeof body.leadId === "string" ? body.leadId : "";
    if (!leadId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "leadId required" } },
        { status: 422 },
      );
    }
    const opportunity = await convertLeadToOpportunity({
      organisationId: session.organisationId,
      leadId,
      actorId: session.clerkUserId,
      stage: typeof body.stage === "string" ? body.stage : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      valueCents:
        typeof body.valueCents === "number" ? body.valueCents : undefined,
    });
    if (!opportunity) {
      return NextResponse.json(
        { error: { code: "lead_not_found", message: "Lead not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: opportunity }, { status: 201 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const stage = typeof body.stage === "string" ? body.stage.trim() : "";
  if (!title || !stage) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "title and stage required",
        },
      },
      { status: 422 },
    );
  }

  const opportunity = await createOpportunity({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    title,
    stage,
    contactId: typeof body.contactId === "string" ? body.contactId : undefined,
    companyId: typeof body.companyId === "string" ? body.companyId : undefined,
    valueCents: typeof body.valueCents === "number" ? body.valueCents : undefined,
    pipelineId: typeof body.pipelineId === "string" ? body.pipelineId : undefined,
  });

  return NextResponse.json({ data: opportunity }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "crm.opportunities.write");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  const stage = body?.stage as string | undefined;

  if (!id || !stage) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id and stage required" } },
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
