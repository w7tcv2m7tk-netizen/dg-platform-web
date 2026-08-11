import {
  generateAppraisalSummary,
  generatePropertyReport,
  generateRePipelineReport,
  sendPropertyReportEmail,
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

  if (action === "property_report") {
    const propertyId = body.propertyId as string | undefined;
    if (!propertyId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "propertyId required" } },
        { status: 422 },
      );
    }

    const refreshCotality = body.refreshCotality === true;
    const sendTo =
      typeof body.to === "string"
        ? body.to.trim()
        : typeof body.email === "string"
          ? body.email.trim()
          : "";

    if (sendTo) {
      const sent = await sendPropertyReportEmail({
        organisationId: session.organisationId,
        propertyId,
        to: sendTo,
        actorId: session.clerkUserId,
        refreshCotality,
      });
      if (!sent.ok) {
        const status =
          sent.reason === "property_not_found"
            ? 404
            : sent.reason === "validation_error"
              ? 422
              : 502;
        return NextResponse.json(
          { error: { code: sent.reason, message: sent.message } },
          { status },
        );
      }
      return NextResponse.json({
        data: {
          markdown: sent.report.markdown,
          report: sent.report,
          delivery: sent.delivery,
        },
      });
    }

    const report = await generatePropertyReport(
      session.organisationId,
      propertyId,
      {
        refreshCotality,
        actorId: session.clerkUserId,
      },
    );
    if (!report) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { markdown: report.markdown, report } });
  }

  return NextResponse.json(
    {
      error: {
        code: "unknown_action",
        message:
          "Supported: pipeline_report, appraisal_summary, property_report",
      },
    },
    { status: 400 },
  );
}

