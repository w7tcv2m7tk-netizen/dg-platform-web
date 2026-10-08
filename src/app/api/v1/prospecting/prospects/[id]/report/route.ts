import { generateGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";
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
  const snapshot = await generateGrowthReportSnapshot(prisma, id, session.organisationId);
  if (!snapshot) {
    return NextResponse.json({ error: { code: "audit_required", message: "An active prospect and research audit are required before generating a report." } }, { status: 409 });
  }
  const { report, created } = snapshot;

  const origin = new URL(req.url).origin;
  return NextResponse.json({ data: { id: report.id, shareUrl: `${origin}/opportunity-report/${report.shareToken}` } }, { status: created ? 201 : 200 });
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
  if (typeof body.reportId !== "string" || !body.reportId.trim()) return NextResponse.json({ error: { code: "validation_error", message: "The delivered report snapshot is required" } }, { status: 422 });
  const { prisma } = await import("@dg/database");
  const report = await prisma.growthProspectReport.findFirst({ where: { id: body.reportId, prospectId: id, revokedAt: null } });
  if (!report?.auditId) return NextResponse.json({ error: { code: "report_required", message: "Active report snapshot not found" } }, { status: 409 });
  const audit = await prisma.growthProspectAudit.findFirst({
    where: { id: report.auditId, prospectId: id, prospect: { organisationId: session.organisationId } },
  });
  if (!audit) return NextResponse.json({ error: { code: "audit_required", message: "Research audit is required before recording report delivery." } }, { status: 409 });
  const recipientEmail = String(body?.to || "").trim();
  await prisma.growthProspectEngagement.create({ data: { prospectId: id, reportId: report.id, type: "report_emailed", metadata: { actorId: session.clerkUserId, to: recipientEmail, subject: String(body?.subject || "") } } });
  await prisma.growthProspectReport.update({ where: { id: report.id }, data: { sentAt: report.sentAt ?? new Date() } });

  // A manually delivered Prospecting report enters the same five-email
  // Digital Opportunity Report nurture as an inbound Business Audit.
  // Reuse an existing tenant-scoped lead where possible; otherwise create an
  // acquisition lead linked to the prospect so this is not treated as a customer.
  if (recipientEmail) {
    const findings = (audit.findings as Record<string, unknown> | null) ?? {};
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
