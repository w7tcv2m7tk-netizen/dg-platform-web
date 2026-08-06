import {
  generateAppraisalSummary,
  generateRePipelineReport,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "pipeline_report") {
    const report = await generateRePipelineReport(session.organisationId);
    return NextResponse.json({ data: { markdown: report } });
  }

  if (action === "appraisal_summary") {
    const propertyId = body.propertyId as string | undefined;
    if (!propertyId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "propertyId required" } },
        { status: 422 },
      );
    }
    const report = await generateAppraisalSummary(session.organisationId, propertyId);
    if (!report) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { markdown: report } });
  }

  return NextResponse.json(
    { error: { code: "unknown_action", message: "Supported: pipeline_report, appraisal_summary" } },
    { status: 400 },
  );
}
