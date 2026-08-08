import type { ProspectAuditFinding } from "./types";
import { newShareToken } from "./audits";
import { updateGrowthProspect } from "./prospects";

function findingItems(findings: unknown): ProspectAuditFinding[] {
  if (!findings || typeof findings !== "object") return [];
  const items = (findings as { items?: ProspectAuditFinding[] }).items;
  return Array.isArray(items) ? items : [];
}

function buildExecutiveSummary(input: {
  businessName: string;
  businessHealth: number | null;
  websiteHealth: number | null;
  seoScore: number | null;
  aiVisibility: number | null;
  findings: ProspectAuditFinding[];
}) {
  const score = input.businessHealth ?? 0;
  const critical = input.findings.filter((f) => f.severity === "critical").length;
  const top = input.findings.slice(0, 3).map((f) => f.title);

  return [
    `${input.businessName} scored ${score}/100 on Digital Business Health from a live presence audit.`,
    `Website ${input.websiteHealth ?? "—"} · SEO ${input.seoScore ?? "—"} · AI Visibility ${input.aiVisibility ?? "—"}.`,
    critical > 0
      ? `${critical} critical finding${critical === 1 ? "" : "s"} need attention before growth spend.`
      : "No critical blockers — focus on opportunity-level improvements.",
    top.length ? `Priorities: ${top.join("; ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function listGrowthProspectReports(options?: { limit?: number }) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 50, 100);

  const rows = await prisma.growthProspectReport.findMany({
    orderBy: { generatedAt: "desc" },
    take: limit,
    include: {
      prospect: {
        select: {
          id: true,
          businessName: true,
          websiteUrl: true,
          industry: true,
          location: true,
          stage: true,
          contactEmail: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    prospectId: row.prospectId,
    auditId: row.auditId,
    shareToken: row.shareToken,
    executiveSummary: row.executiveSummary,
    viewCount: row.viewCount,
    sentAt: row.sentAt?.toISOString() ?? null,
    firstViewedAt: row.firstViewedAt?.toISOString() ?? null,
    generatedAt: row.generatedAt.toISOString(),
    sharePath: `/command/growth-engine/reports?token=${row.shareToken}`,
    prospect: row.prospect,
  }));
}

export async function createGrowthProspectReport(input: {
  prospectId: string;
  auditId?: string;
  actorId?: string;
  operatorOrganisationId?: string;
  markSent?: boolean;
}) {
  const { prisma } = await import("@dg/database");

  const prospect = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
  });
  if (!prospect) return null;

  const audit = input.auditId
    ? await prisma.growthProspectAudit.findFirst({
        where: { id: input.auditId, prospectId: prospect.id },
      })
    : await prisma.growthProspectAudit.findFirst({
        where: { prospectId: prospect.id },
        orderBy: { auditedAt: "desc" },
      });

  if (!audit) {
    return { error: "audit_required" as const };
  }

  const findings = findingItems(audit.findings);
  const executiveSummary = buildExecutiveSummary({
    businessName: prospect.businessName,
    businessHealth: audit.businessHealth,
    websiteHealth: audit.websiteHealth,
    seoScore: audit.seoScore,
    aiVisibility: audit.aiVisibility,
    findings,
  });

  const sentAt = input.markSent ? new Date() : null;
  const report = await prisma.growthProspectReport.create({
    data: {
      prospectId: prospect.id,
      auditId: audit.id,
      shareToken: newShareToken(),
      executiveSummary,
      sentAt,
    },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: prospect.id,
      reportId: report.id,
      type: sentAt ? "report_sent" : "report_generated",
      metadata: {
        auditId: audit.id,
        businessHealth: audit.businessHealth,
      },
    },
  });

  if (sentAt) {
    await updateGrowthProspect({
      prospectId: prospect.id,
      stage: "report_sent",
      actorId: input.actorId,
      operatorOrganisationId: input.operatorOrganisationId,
    });
  }

  return {
    id: report.id,
    prospectId: report.prospectId,
    auditId: report.auditId,
    shareToken: report.shareToken,
    executiveSummary: report.executiveSummary,
    viewCount: report.viewCount,
    sentAt: report.sentAt?.toISOString() ?? null,
    firstViewedAt: report.firstViewedAt?.toISOString() ?? null,
    generatedAt: report.generatedAt.toISOString(),
    sharePath: `/command/growth-engine/reports?token=${report.shareToken}`,
    prospect: {
      id: prospect.id,
      businessName: prospect.businessName,
      websiteUrl: prospect.websiteUrl,
      industry: prospect.industry,
      location: prospect.location,
      stage: prospect.stage,
      contactEmail: prospect.contactEmail,
    },
    scores: {
      businessHealth: audit.businessHealth,
      websiteHealth: audit.websiteHealth,
      seoScore: audit.seoScore,
      aiVisibility: audit.aiVisibility,
    },
    findings,
  };
}

export async function markGrowthReportSent(input: {
  reportId: string;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.growthProspectReport.findUnique({
    where: { id: input.reportId },
  });
  if (!existing) return null;

  const report = await prisma.growthProspectReport.update({
    where: { id: input.reportId },
    data: { sentAt: existing.sentAt ?? new Date() },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: report.prospectId,
      reportId: report.id,
      type: "report_sent",
      metadata: {},
    },
  });

  await updateGrowthProspect({
    prospectId: report.prospectId,
    stage: "report_sent",
    actorId: input.actorId,
    operatorOrganisationId: input.operatorOrganisationId,
  });

  return {
    id: report.id,
    sentAt: report.sentAt?.toISOString() ?? null,
  };
}
