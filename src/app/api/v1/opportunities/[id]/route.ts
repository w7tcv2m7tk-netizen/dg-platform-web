import { deleteOpportunity, getOpportunity } from "@dg/platform-core";
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

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.opportunities.write");
  if (denied) return denied;

  const { id } = await params;
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
