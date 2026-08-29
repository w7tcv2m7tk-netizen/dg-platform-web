/**
 * Prospecting Activity workspace — operational surface over prospect-linked history.
 *
 * Architectural rule (locked):
 * All prospect activity is stored against the prospect’s universal identity
 * (GrowthProspect + related engagements/audits/reports/Activities) and MUST be
 * preserved when the prospect is promoted into CRM. Never duplicate or orphan
 * activity during conversion — link CRM entities back to growthProspectId.
 */

import { computeProspectOpportunityScore } from "../command-centre/growth-engine/opportunity-engine";
import type { ProspectPipelineStage } from "../command-centre/growth-engine/types";
import { workspaceStageForProspectStage } from "./pipeline-workspace";

export type ProspectActivityKind =
  | "call"
  | "note"
  | "task"
  | "email"
  | "sms"
  | "meeting"
  | "follow_up"
  | "audit"
  | "report"
  | "engagement"
  | "other";

export type ProspectActivityTimeBucket = "today" | "upcoming" | "overdue" | "recent" | "earlier";

export type ProspectActivityFeedItem = {
  id: string;
  kind: ProspectActivityKind;
  occurredAt: string;
  bucket: ProspectActivityTimeBucket;
  prospectId: string;
  businessName: string;
  contactName: string | null;
  title: string;
  body: string | null;
  nextAction: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  source: "engagement" | "audit" | "report" | "activity" | "intelligence";
};

export type ProspectActivitySummary = {
  callsDue: number;
  followUpsDue: number;
  tasksDue: number;
  overdue: number;
  recentCount: number;
};

export type ProspectActivityIntelligence = {
  followUpsNeedingAttention: number;
  quietProspects: number;
  highValueMissingNextAction: number;
  topRecommendation: {
    prospectId: string;
    businessName: string;
    actionLabel: string;
    reason: string;
  } | null;
};

export type ProspectingActivityWorkspace = {
  generatedAt: string;
  organisationId: string;
  summary: ProspectActivitySummary;
  intelligence: ProspectActivityIntelligence;
  feed: ProspectActivityFeedItem[];
  prospectCount: number;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function mapEngagementKind(type: string): ProspectActivityKind {
  const t = type.toLowerCase();
  if (t.includes("email")) return "email";
  if (t.includes("sms") || t.includes("message")) return "sms";
  if (t.includes("meeting") || t.includes("call")) return "meeting";
  if (t.includes("follow")) return "follow_up";
  if (t.includes("proposal") || t.includes("report")) return "email";
  return "engagement";
}

function engagementTitle(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function bucketFor(iso: string, now = new Date()): ProspectActivityTimeBucket {
  const at = new Date(iso);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (at >= todayStart && at <= todayEnd) return "today";
  if (at > todayEnd) return "upcoming";
  const ageHours = (now.getTime() - at.getTime()) / 3_600_000;
  if (ageHours <= 72) return "recent";
  return "earlier";
}

function mapActivityKind(activityType: string, title: string): ProspectActivityKind {
  const hay = `${activityType} ${title}`.toLowerCase();
  if (hay.includes("call") || hay.includes("phone")) return "call";
  if (hay.includes("email") || hay.includes("mail")) return "email";
  if (hay.includes("sms") || hay.includes("text")) return "sms";
  if (hay.includes("meeting") || hay.includes("appointment")) return "meeting";
  if (hay.includes("task") || hay.includes("todo")) return "task";
  if (hay.includes("note") || hay.includes("memo")) return "note";
  if (hay.includes("follow")) return "follow_up";
  return "other";
}

/**
 * Build the Activity workspace for a tenant organisation’s prospect book.
 */
export async function buildProspectingActivityWorkspace(
  organisationId: string,
): Promise<ProspectingActivityWorkspace> {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const idleCutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const prospects = await prisma.growthProspect.findMany({
    where: { organisationId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      engagements: { orderBy: { occurredAt: "desc" }, take: 20 },
      audits: { orderBy: { auditedAt: "desc" }, take: 1 },
      reports: { orderBy: { generatedAt: "desc" }, take: 3 },
    },
  });

  const prospectIds = prospects.map((p) => p.id);
  const prospectById = new Map(prospects.map((p) => [p.id, p]));

  const platformActivities =
    prospectIds.length > 0
      ? await prisma.activity.findMany({
          where: {
            organisationId,
            entityType: "GrowthProspect",
            entityId: { in: prospectIds },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];

  const feed: ProspectActivityFeedItem[] = [];

  for (const p of prospects) {
    for (const e of p.engagements) {
      const kind = mapEngagementKind(e.type);
      feed.push({
        id: `eng-${e.id}`,
        kind,
        occurredAt: e.occurredAt.toISOString(),
        bucket: bucketFor(e.occurredAt.toISOString(), now),
        prospectId: p.id,
        businessName: p.businessName,
        contactName: p.contactName,
        title: engagementTitle(e.type),
        body: null,
        nextAction: null,
        ctaLabel: "View pipeline",
        ctaHref: "/apps/prospecting/pipeline",
        source: "engagement",
      });
    }

    for (const report of p.reports) {
      if (report.sentAt) {
        feed.push({
          id: `report-sent-${report.id}`,
          kind: "email",
          occurredAt: report.sentAt.toISOString(),
          bucket: bucketFor(report.sentAt.toISOString(), now),
          prospectId: p.id,
          businessName: p.businessName,
          contactName: p.contactName,
          title: "Email sent",
          body: report.executiveSummary?.slice(0, 160) ?? "Opportunity report sent.",
          nextAction: report.viewCount === 0 ? "Follow up if unopened" : null,
          ctaLabel: "Follow up",
          ctaHref: "/apps/prospecting/pipeline",
          source: "report",
        });
      }
      if (report.firstViewedAt) {
        feed.push({
          id: `report-view-${report.id}`,
          kind: "engagement",
          occurredAt: report.firstViewedAt.toISOString(),
          bucket: bucketFor(report.firstViewedAt.toISOString(), now),
          prospectId: p.id,
          businessName: p.businessName,
          contactName: p.contactName,
          title: "Report viewed",
          body: `Viewed ${report.viewCount} time${report.viewCount === 1 ? "" : "s"}.`,
          nextAction: "Call today",
          ctaLabel: "Call",
          ctaHref: p.contactPhone ? `tel:${p.contactPhone}` : "/apps/prospecting/pipeline",
          source: "report",
        });
      }
    }

    const audit = p.audits[0];
    if (audit) {
      feed.push({
        id: `audit-${audit.id}`,
        kind: "audit",
        occurredAt: audit.auditedAt.toISOString(),
        bucket: bucketFor(audit.auditedAt.toISOString(), now),
        prospectId: p.id,
        businessName: p.businessName,
        contactName: p.contactName,
        title: "Presence audit completed",
        body:
          audit.businessHealth != null
            ? `Business Health ${audit.businessHealth}/100`
            : "Digital presence signals captured.",
        nextAction: "Review Opportunity Score",
        ctaLabel: "Scores",
        ctaHref: "/apps/prospecting/scores",
        source: "audit",
      });
    }

    // Synthetic follow-up due when idle
    if (p.updatedAt <= idleCutoff && p.stage !== "won" && p.stage !== "lost") {
      const overdueIso = p.updatedAt.toISOString();
      feed.push({
        id: `followup-${p.id}`,
        kind: "follow_up",
        occurredAt: overdueIso,
        bucket: "overdue",
        prospectId: p.id,
        businessName: p.businessName,
        contactName: p.contactName,
        title: "Follow-up due",
        body: `Idle ${daysSince(p.updatedAt)} day${daysSince(p.updatedAt) === 1 ? "" : "s"} in ${p.stage.replace(/_/g, " ")}.`,
        nextAction: "Call today",
        ctaLabel: p.contactPhone ? "Call" : "Open",
        ctaHref: p.contactPhone ? `tel:${p.contactPhone}` : "/apps/prospecting/pipeline",
        source: "intelligence",
      });
    }
  }

  for (const a of platformActivities) {
    const prospect = prospectById.get(a.entityId);
    if (!prospect) continue;
    feed.push({
      id: `act-${a.id}`,
      kind: mapActivityKind(a.activityType, a.title),
      occurredAt: a.createdAt.toISOString(),
      bucket: bucketFor(a.createdAt.toISOString(), now),
      prospectId: prospect.id,
      businessName: prospect.businessName,
      contactName: prospect.contactName,
      title: a.title,
      body: a.body,
      nextAction: null,
      ctaLabel: "View",
      ctaHref: "/apps/prospecting/pipeline",
      source: "activity",
    });
  }

  feed.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));

  const followUpsDue = feed.filter((f) => f.kind === "follow_up").length;
  const overdue = feed.filter((f) => f.bucket === "overdue").length;
  const callsDue = feed.filter(
    (f) =>
      (f.kind === "call" || f.nextAction?.toLowerCase().includes("call")) &&
      (f.bucket === "today" || f.bucket === "overdue" || f.bucket === "upcoming"),
  ).length;
  const tasksDue = feed.filter(
    (f) => f.kind === "task" && (f.bucket === "today" || f.bucket === "overdue"),
  ).length;
  const recentCount = feed.filter(
    (f) => f.bucket === "today" || f.bucket === "recent",
  ).length;

  // Intelligence
  const quietProspects = prospects.filter(
    (p) =>
      p.updatedAt <= idleCutoff &&
      p.stage !== "won" &&
      p.stage !== "lost" &&
      p.stage !== "onboarding",
  ).length;

  let highValueMissingNextAction = 0;
  let topRecommendation: ProspectActivityIntelligence["topRecommendation"] = null;
  let topScore = -1;

  for (const p of prospects) {
    if (p.stage === "won" || p.stage === "lost") continue;
    const audit = p.audits[0];
    const score = computeProspectOpportunityScore({
      stage: p.stage as ProspectPipelineStage,
      updatedAt: p.updatedAt,
      websiteUrl: p.websiteUrl,
      contactPhone: p.contactPhone,
      contactEmail: p.contactEmail,
      industry: p.industry,
      metadata: (p.metadata as Record<string, unknown> | null) ?? null,
      audit: audit
        ? {
            businessHealth: audit.businessHealth,
            aiVisibility: audit.aiVisibility,
            seoScore: audit.seoScore,
            websiteHealth: audit.websiteHealth,
          }
        : null,
      report: p.reports[0]
        ? {
            viewCount: p.reports[0].viewCount,
            sentAt: p.reports[0].sentAt,
            firstViewedAt: p.reports[0].firstViewedAt,
          }
        : null,
    });

    const workspace = workspaceStageForProspectStage(p.stage as ProspectPipelineStage);
    const missingAction =
      workspace === "discovered" ||
      workspace === "qualified" ||
      workspace === "contacted";

    if (score.score >= 80 && missingAction) {
      highValueMissingNextAction += 1;
    }

    if (score.score > topScore) {
      topScore = score.score;
      topRecommendation = {
        prospectId: p.id,
        businessName: p.businessName,
        actionLabel: score.recommendedActionLabel,
        reason: score.reasons[0] ?? score.approachHint,
      };
    }
  }

  return {
    generatedAt: now.toISOString(),
    organisationId,
    summary: {
      callsDue,
      followUpsDue,
      tasksDue,
      overdue,
      recentCount,
    },
    intelligence: {
      followUpsNeedingAttention: followUpsDue,
      quietProspects,
      highValueMissingNextAction,
      topRecommendation,
    },
    feed: feed.slice(0, 80),
    prospectCount: prospects.length,
  };
}

/**
 * Stamp CRM linkage onto prospect-scoped Activity rows without orphaning history.
 * Call when converting a prospect into Contact / Company / Opportunity.
 */
export async function preserveProspectActivityOnCrmConvert(input: {
  organisationId: string;
  prospectId: string;
  contactId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  actorId?: string;
}): Promise<{ linkedActivityCount: number }> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const activities = await prisma.activity.findMany({
    where: {
      organisationId: input.organisationId,
      entityType: "GrowthProspect",
      entityId: input.prospectId,
    },
    take: 500,
  });

  let linked = 0;
  for (const activity of activities) {
    const meta =
      activity.metadata && typeof activity.metadata === "object"
        ? (activity.metadata as Record<string, unknown>)
        : {};
    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        metadata: {
          ...meta,
          growthProspectId: input.prospectId,
          crmContactId: input.contactId ?? meta.crmContactId ?? null,
          crmCompanyId: input.companyId ?? meta.crmCompanyId ?? null,
          crmOpportunityId: input.opportunityId ?? meta.crmOpportunityId ?? null,
          preservedOnConvertAt: new Date().toISOString(),
        } as unknown as InputJsonValue,
      },
    });
    linked += 1;
  }

  // Bridge note on Contact (if present) — points back to prospect identity; does not delete history.
  if (input.contactId) {
    const { createActivity } = await import("../activities");
    await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "Contact",
      entityId: input.contactId,
      activityType: "prospect_converted",
      title: "Prospect history linked",
      body: "Prior prospecting activity remains attached to the original GrowthProspect identity and is linked here on convert.",
      sourceApp: "prospecting",
      metadata: {
        growthProspectId: input.prospectId,
        companyId: input.companyId ?? null,
        opportunityId: input.opportunityId ?? null,
      },
    });
  }

  return { linkedActivityCount: linked };
}
