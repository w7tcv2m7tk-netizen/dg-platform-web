import {
  listGrowthProspectAudits,
  listProspectsNeedingAudit,
  runGrowthProspectAudit,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("needsAudit") === "1") {
    const needs = await listProspectsNeedingAudit();
    return NextResponse.json({ data: needs });
  }

  const audits = await listGrowthProspectAudits();
  return NextResponse.json({ data: audits });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const prospectId = typeof body?.prospectId === "string" ? body.prospectId.trim() : "";
  if (!prospectId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "prospectId is required" } },
      { status: 422 },
    );
  }

  const result = await runGrowthProspectAudit({
    prospectId,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
