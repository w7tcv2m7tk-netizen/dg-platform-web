import {
  createGrowthProspectReport,
  listGrowthProspectReports,
  markGrowthReportSent,
  organisationGrowthScope,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function GET(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  const reports = await listGrowthProspectReports(
    organisationGrowthScope(session.organisationId),
  );
  return NextResponse.json({ data: reports });
}

export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);

  if (body?.action === "mark_sent" && typeof body.reportId === "string") {
    const updated = await markGrowthReportSent({
      reportId: body.reportId,
      scope: organisationGrowthScope(session.organisationId),
      actorId: session.clerkUserId,
      operatorOrganisationId: session.organisationId,
    });
    if (!updated) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Report not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: updated });
  }

  const prospectId = typeof body?.prospectId === "string" ? body.prospectId.trim() : "";
  if (!prospectId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "prospectId is required" } },
      { status: 422 },
    );
  }

  const result = await createGrowthProspectReport({
    prospectId,
    scope: organisationGrowthScope(session.organisationId),
    auditId: typeof body?.auditId === "string" ? body.auditId : undefined,
    markSent: Boolean(body?.markSent),
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  if ("error" in result && result.error === "audit_required") {
    return NextResponse.json(
      {
        error: {
          code: "audit_required",
          message: "Run a presence audit before generating a report",
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
