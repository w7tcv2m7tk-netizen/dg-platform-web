import {
  listGrowthProspectAudits,
  listProspectsNeedingAudit,
  organisationGrowthScope,
  runGrowthProspectAudit,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function GET(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("needsAudit") === "1") {
    const needs = await listProspectsNeedingAudit(
      organisationGrowthScope(session.organisationId),
    );
    return NextResponse.json({ data: needs });
  }

  const audits = await listGrowthProspectAudits(
    organisationGrowthScope(session.organisationId),
  );
  return NextResponse.json({ data: audits });
}

export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const prospectId = typeof body?.prospectId === "string" ? body.prospectId.trim() : "";
  if (!prospectId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "prospectId is required" } },
      { status: 422 },
    );
  }

  const audit = await runGrowthProspectAudit({
    prospectId,
    scope: organisationGrowthScope(session.organisationId),
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!audit) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: audit }, { status: 201 });
}
