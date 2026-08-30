import type { ProspectAuditFinding } from "./types";
import { newShareToken } from "./audits";
import { updateGrowthProspect } from "./prospects";

/** Public, unauthenticated share path for opportunity reports */
export const GROWTH_PUBLIC_REPORT_BASE = "/opportunity";

import {
  growthScopeProspectWhere,
  growthScopeWhere,
  type GrowthScope,
} from "./scope";

export function growthReportSharePath(shareToken: string) {
  return `${GROWTH_PUBLIC_REPORT_BASE}/${shareToken}`;
}

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

function recommendedActions(findings: ProspectAuditFinding[]) {
  return findings
    .filter((f) => f.recommendedAction)
    .slice(0, 6)
    .map((f) => ({
      title: f.title,
      action: f.recommendedAction as string,
      severity: f.severity,
      domain: f.domain,
    }));
}

export async function listGrowthProspectReports(
  scope: GrowthScope,
  options?: { limit?: number },
) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 50, 100);

  const scoped = growthScopeProspectWhere(scope).prospect;
  const rows = await prisma.growthProspectReport.findMany({
    where: { prospect: { ...scoped, archivedAt: null } },
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
          convertedOrganisationId: true,
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
    sharePath: growthReportSharePath(row.shareToken),
    prospect: row.prospect,
  }));
}

export async function createGrowthProspectReport(input: {
  prospectId: string;
  scope: GrowthScope;
  auditId?: string;
  actorId?: string;
  operatorOrganisationId?: string;
  markSent?: boolean;
}) {
  const { prisma } = await import("@dg/database");

  const prospect = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, ...growthScopeWhere(input.scope) },
  });
  if (!prospect || prospect.archivedAt) return null;

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
    if (!prospect.organisationId) {
      throw new Error("organisationId is required to advance prospect stage");
    }
    await updateGrowthProspect({
      prospectId: prospect.id,
      organisationId: prospect.organisationId,
      stage: "report_sent",
      actorId: input.actorId,
      operatorOrganisationId: input.operatorOrganisationId ?? prospect.organisationId,
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
    sharePath: growthReportSharePath(report.shareToken),
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
  scope: GrowthScope;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.growthProspectReport.findFirst({
    where: {
      id: input.reportId,
      ...growthScopeProspectWhere(input.scope),
    },
    include: {
      prospect: { select: { stage: true, archivedAt: true, organisationId: true } },
    },
  });
  if (!existing || existing.prospect.archivedAt) return null;

  const alreadySent = Boolean(existing.sentAt);
  if (alreadySent) {
    return {
      id: existing.id,
      sentAt: existing.sentAt?.toISOString() ?? null,
      sharePath: growthReportSharePath(existing.shareToken),
      alreadySent: true,
    };
  }

  const report = await prisma.growthProspectReport.update({
    where: { id: input.reportId },
    data: { sentAt: new Date() },
  });

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: report.prospectId,
      reportId: report.id,
      type: "report_sent",
      metadata: {},
    },
  });

  // Don't rewind later funnel stages when marking sent.
  const mayAdvance = new Set(["prospect", "audit_created", "email_opened"]);
  if (mayAdvance.has(existing.prospect.stage)) {
    const organisationId =
      existing.prospect.organisationId ?? input.operatorOrganisationId;
    if (!organisationId) {
      throw new Error("organisationId is required to advance prospect stage");
    }
    await updateGrowthProspect({
      prospectId: report.prospectId,
      organisationId,
      stage: "report_sent",
      actorId: input.actorId,
      operatorOrganisationId: organisationId,
    });
  }

  return {
    id: report.id,
    sentAt: report.sentAt?.toISOString() ?? null,
    sharePath: growthReportSharePath(report.shareToken),
    alreadySent: false,
  };
}

const VIEW_STAGE_ADVANCE_FROM = new Set([
  "prospect",
  "audit_created",
  "report_sent",
  "email_opened",
  "follow_up_due",
]);

/**
 * Load a shareable opportunity report by token and record the view.
 * Pass `recordView: false` (staff preview) to skip engagement / stage advance.
 * Safe for unauthenticated public pages — returns only prospect-facing fields.
 */
export async function getPublicGrowthOpportunityReport(
  shareToken: string,
  options?: { recordView?: boolean },
) {
  const token = shareToken.trim();
  if (!token) return null;
  const recordView = options?.recordView !== false;

  const { prisma } = await import("@dg/database");

  const report = await prisma.growthProspectReport.findUnique({
    where: { shareToken: token },
    include: {
      prospect: {
        select: {
          id: true,
          organisationId: true,
          businessName: true,
          websiteUrl: true,
          industry: true,
          location: true,
          stage: true,
          archivedAt: true,
        },
      },
    },
  });
  // Soft-archived prospects: share tokens stay but public page is unavailable.
  if (!report || report.prospect.archivedAt) return null;

  const audit = report.auditId
    ? await prisma.growthProspectAudit.findUnique({ where: { id: report.auditId } })
    : await prisma.growthProspectAudit.findFirst({
        where: { prospectId: report.prospectId },
        orderBy: { auditedAt: "desc" },
      });

  const findings = findingItems(audit?.findings);
  let viewCount = report.viewCount;
  let firstViewedAt = report.firstViewedAt;

  if (recordView) {
    const now = new Date();
    const isFirstView = !report.firstViewedAt;

    const updated = await prisma.growthProspectReport.update({
      where: { id: report.id },
      data: {
        viewCount: { increment: 1 },
        firstViewedAt: report.firstViewedAt ?? now,
      },
    });
    viewCount = updated.viewCount;
    firstViewedAt = updated.firstViewedAt;

    await prisma.growthProspectEngagement.create({
      data: {
        prospectId: report.prospectId,
        reportId: report.id,
        type: "report_viewed",
        metadata: { firstView: isFirstView },
      },
    });

    if (VIEW_STAGE_ADVANCE_FROM.has(report.prospect.stage)) {
      if (report.prospect.organisationId) {
        await updateGrowthProspect({
          prospectId: report.prospectId,
          organisationId: report.prospect.organisationId,
          stage: "report_viewed",
        });
      }
    }
  }

  const scores = {
    businessHealth: audit?.businessHealth ?? null,
    websiteHealth: audit?.websiteHealth ?? null,
    seoScore: audit?.seoScore ?? null,
    aiVisibility: audit?.aiVisibility ?? null,
  };

  const { archivedAt: _archivedAt, ...publicProspect } = report.prospect;

  return {
    id: report.id,
    shareToken: report.shareToken,
    sharePath: growthReportSharePath(report.shareToken),
    executiveSummary: report.executiveSummary,
    viewCount,
    firstViewedAt: firstViewedAt?.toISOString() ?? null,
    generatedAt: report.generatedAt.toISOString(),
    auditedAt: audit?.auditedAt.toISOString() ?? null,
    prospect: publicProspect,
    scores,
    findings,
    recommendedActions: recommendedActions(findings),
    howDigitalGateHelps:
      "DigitalGate connects Website Health, AI Visibility™, SEO, and industry apps into one operating system — so these gaps become a managed programme, not a spreadsheet.",
    preview: !recordView,
  };
}
