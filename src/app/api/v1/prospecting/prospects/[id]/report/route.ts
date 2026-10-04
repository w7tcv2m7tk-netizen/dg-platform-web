import { randomBytes } from "node:crypto";
import { organisationGrowthScope, getGrowthProspect } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;

  const { id } = await params;
  const prospect = await getGrowthProspect(id, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) {
    return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  }

  const { prisma } = await import("@dg/database");
  const audit = await prisma.growthProspectAudit.findFirst({
    where: { prospectId: id, prospect: { organisationId: session.organisationId } },
    orderBy: { auditedAt: "desc" },
  });
  if (!audit) {
    return NextResponse.json({ error: { code: "audit_required", message: "Run the research audit before generating a report." } }, { status: 409 });
  }

  const existing = await prisma.growthProspectReport.findFirst({ where: { prospectId: id }, orderBy: { generatedAt: "desc" } });
  const report = existing ?? await prisma.growthProspectReport.create({
    data: {
      prospectId: id,
      auditId: audit.id,
      shareToken: randomBytes(24).toString("hex"),
      executiveSummary: `Digital opportunity report for ${prospect.businessName}, grounded in the latest verified DigitalGate research audit.`,
    },
  });
  if (!existing) {
    await prisma.growthProspectEngagement.create({ data: { prospectId: id, reportId: report.id, type: "report_generated", metadata: { actorId: session.clerkUserId } } });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json({ data: { id: report.id, shareUrl: `${origin}/opportunity-report/${report.shareToken}` } }, { status: existing ? 200 : 201 });
}
