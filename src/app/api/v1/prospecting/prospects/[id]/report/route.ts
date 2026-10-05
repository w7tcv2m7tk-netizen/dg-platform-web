import { randomBytes } from "node:crypto";
import { buildFreeAuditSequenceStamp, organisationGrowthScope, getGrowthProspect } from "@dg/platform-core";
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


export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;
  const { id } = await params;
  const prospect = await getGrowthProspect(id, organisationGrowthScope(session.organisationId));
  if (!prospect || prospect.archivedAt) return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (body?.action !== "email_sent") return NextResponse.json({ error: { code: "validation_error", message: "Unsupported report action" } }, { status: 422 });
  const { prisma } = await import("@dg/database");
  const report = await prisma.growthProspectReport.findFirst({ where: { prospectId: id }, orderBy: { generatedAt: "desc" } });
  if (!report) return NextResponse.json({ error: { code: "report_required", message: "Generate the report before recording delivery." } }, { status: 409 });
  const recipientEmail = String(body?.to || "").trim();
  await prisma.growthProspectEngagement.create({ data: { prospectId: id, reportId: report.id, type: "report_emailed", metadata: { actorId: session.clerkUserId, to: recipientEmail, subject: String(body?.subject || "") } } });
  await prisma.growthProspectReport.update({ where: { id: report.id }, data: { sentAt: report.sentAt ?? new Date() } });

  // A manually delivered Prospecting report enters the same five-email
  // Digital Opportunity Report nurture as an inbound Business Audit.
  // Reuse an existing tenant-scoped lead where possible; otherwise create an
  // acquisition lead linked to the prospect so this is not treated as a customer.
  if (recipientEmail) {
    const findings = (audit.findings as Record<string, unknown> | null) ?? {};
    const scorecard = (findings.scorecard as Record<string, unknown> | null) ?? {};
    const firstName = (prospect.contactName || "").trim().split(/\s+/)[0] || "there";
    let lead = await prisma.lead.findFirst({
      where: {
        organisationId: session.organisationId,
        contact: { email: { equals: recipientEmail, mode: "insensitive" } },
        OR: [
          { source: "free_audit" },
          { metadata: { path: ["growth_prospect_id"], equals: id } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!lead) {
      const contact = await prisma.contact.findFirst({
        where: { organisationId: session.organisationId, email: { equals: recipientEmail, mode: "insensitive" } },
        select: { id: true },
      });
      lead = await prisma.lead.create({
        data: {
          organisationId: session.organisationId,
          contactId: contact?.id ?? null,
          source: "prospecting_opportunity_report",
          status: "new",
          title: `Digital Opportunity Report — ${prospect.businessName}`,
          metadata: { growth_prospect_id: id, capture_path: "prospecting_opportunity_report" },
        },
      });
    }
    const meta = (lead.metadata as Record<string, unknown> | null) ?? {};
    const sequence = buildFreeAuditSequenceStamp({
      firstName,
      fullName: prospect.contactName || firstName,
      companyName: prospect.businessName,
      websiteUrl: prospect.websiteUrl || "",
      email: recipientEmail,
      aiScore: audit.aiVisibility ?? 0,
      websiteScore: audit.websiteHealth ?? 0,
      seoScore: audit.seoScore ?? 0,
      overallScore: audit.businessHealth ?? 0,
      opportunityCount: Array.isArray(findings.items) ? findings.items.length : undefined,
      email1Sent: true,
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { metadata: { ...meta, free_audit_sequence: sequence, growth_prospect_id: id, opportunity_report_id: report.id } },
    });
  }

  return NextResponse.json({ data: { recorded: true, nurtureActivated: Boolean(recipientEmail) } });
}
