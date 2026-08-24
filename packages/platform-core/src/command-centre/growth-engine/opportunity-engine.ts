/**
 * Prospect Opportunity Score + Daily Briefing — Growth detector for Opportunity Engine™.
 * Prefer `listPlatformOpportunities` (Platform Core) for the Command Centre Opportunities cockpit.
 * This module remains the prospect-rank implementation consumed by that engine.
 * @see docs/foundations/OPPORTUNITY-ENGINE.md
 */

import type {
  DailyOpportunityBriefing,
  DailyOpportunityRow,
  OpportunityBand,
  OpportunityRecommendedAction,
  ProspectOpportunityScoreResult,
  ProspectPipelineStage,
  SalesCallRecommendation,
} from "./types";

const ACTIVE_STAGES: ProspectPipelineStage[] = [
  "prospect",
  "audit_created",
  "report_sent",
  "email_opened",
  "report_viewed",
  "follow_up_due",
  "meeting_booked",
  "proposal_sent",
];

const ACTION_LABELS: Record<OpportunityRecommendedAction, string> = {
  run_audit: "Run audit",
  send_audit: "Send audit",
  call_today: "Call today",
  call_and_email: "Call + email",
  follow_up: "Follow up",
  close_loop: "Close the loop",
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function daysSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function bandForScore(score: number): OpportunityBand {
  if (score >= 90) return "very_high";
  if (score >= 80) return "high";
  if (score >= 70) return "medium";
  return "low";
}

function bandLabel(band: OpportunityBand): string {
  if (band === "very_high") return "Very high";
  if (band === "high") return "High";
  if (band === "medium") return "Medium";
  return "Low";
}

export type OpportunityScoreInput = {
  stage: ProspectPipelineStage;
  updatedAt: Date;
  websiteUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  industry?: string | null;
  metadata?: Record<string, unknown> | null;
  audit?: {
    businessHealth: number | null;
    aiVisibility: number | null;
    seoScore: number | null;
    websiteHealth: number | null;
  } | null;
  report?: {
    viewCount: number;
    sentAt: Date | null;
    firstViewedAt: Date | null;
  } | null;
  engagementCount?: number;
};

function recommendAction(input: OpportunityScoreInput): OpportunityRecommendedAction {
  const hasAudit = Boolean(input.audit);
  const hasReport = Boolean(input.report?.sentAt || input.report);
  const stage = input.stage;

  if (!hasAudit || stage === "prospect") return "run_audit";
  if (stage === "audit_created" || (!hasReport && hasAudit)) return "send_audit";
  if (stage === "proposal_sent" || stage === "meeting_booked") return "close_loop";
  if (stage === "report_viewed") return "call_and_email";
  if (stage === "email_opened" || stage === "follow_up_due") return "call_today";
  if (stage === "report_sent") return "follow_up";
  return "call_today";
}

function approachFor(action: OpportunityRecommendedAction, businessName: string): string {
  switch (action) {
    case "run_audit":
      return `Run a presence audit for ${businessName} before outreach.`;
    case "send_audit":
      return `Send Digital Growth Audit first — lead with measured gaps, not a cold pitch.`;
    case "call_today":
      return `Call today while the report is warm; keep the ask short.`;
    case "call_and_email":
      return `They engaged the report — call and follow with a short email.`;
    case "follow_up":
      return `Report sent with limited engagement — a short follow-up is due.`;
    case "close_loop":
      return `Close the loop on the open proposal or meeting — confirm next step.`;
    default:
      return `Prioritise a clear next step for ${businessName}.`;
  }
}

/** Pure Prospect Opportunity Score from observable Growth Engine fields. */
export function computeProspectOpportunityScore(
  input: OpportunityScoreInput,
): ProspectOpportunityScoreResult {
  const reasons: string[] = [];
  const idle = daysSince(input.updatedAt);
  const health = input.audit?.businessHealth ?? null;
  const seo = input.audit?.seoScore ?? null;
  const ai = input.audit?.aiVisibility ?? null;
  const website = input.audit?.websiteHealth ?? null;
  const viewCount = input.report?.viewCount ?? 0;

  // Digital gap (0–35): weaker digital presence → higher opportunity
  let gapPts = 0;
  if (!input.audit) {
    gapPts = 18;
    reasons.push("No presence audit yet — unknown digital gaps");
  } else {
    const gaps: number[] = [];
    if (health != null) gaps.push(100 - health);
    if (seo != null) gaps.push(100 - seo);
    if (ai != null) gaps.push(100 - ai);
    if (website != null) gaps.push(100 - website);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 40;
    gapPts = Math.round((avgGap / 100) * 35);
    if (health != null && health < 60) {
      reasons.push(`Business Health ${health}/100 — room to improve`);
    }
    if (seo != null && seo < 55) {
      reasons.push(`SEO score ${seo}/100 — organic visibility likely weak`);
    }
    if (ai != null && ai < 50) {
      reasons.push(`AI Visibility ${ai}/100 — limited AI-search presence`);
    }
    if (website != null && website < 60) {
      reasons.push(`Website health ${website}/100 — conversion/tech gaps likely`);
    }
    if (reasons.length === 0 && health != null) {
      reasons.push(`Audited · Business Health ${health}/100`);
    }
  }

  // Intent / urgency (0–30)
  let intentPts = 0;
  const stage = input.stage;
  if (stage === "report_viewed") {
    intentPts += 28;
    reasons.push("Viewed opportunity report — high intent");
  } else if (stage === "follow_up_due") {
    intentPts += 24;
    reasons.push("Follow-up due");
  } else if (stage === "email_opened") {
    intentPts += 22;
    reasons.push("Opened outbound email");
  } else if (stage === "meeting_booked") {
    intentPts += 20;
    reasons.push("Meeting booked");
  } else if (stage === "proposal_sent") {
    intentPts += 18;
    reasons.push("Proposal outstanding");
  } else if (stage === "report_sent") {
    intentPts += 14;
    reasons.push("Report sent — awaiting engagement");
  } else if (stage === "audit_created") {
    intentPts += 10;
    reasons.push("Audit ready — send report next");
  } else {
    intentPts += 6;
  }
  intentPts += Math.min(idle, 10);
  if (idle >= 3) reasons.push(`Idle ${idle}d since last update`);
  intentPts += Math.min(viewCount * 3, 9);
  if (viewCount > 0) {
    reasons.push(`${viewCount} report view${viewCount === 1 ? "" : "s"}`);
  }
  intentPts = Math.min(intentPts, 30);

  // Reachability (0–15)
  let reachPts = 0;
  if (input.websiteUrl) reachPts += 5;
  else reasons.push("No website on file");
  if (input.contactPhone) reachPts += 5;
  if (input.contactEmail) reachPts += 5;
  if (!input.contactPhone && !input.contactEmail) {
    reasons.push("Missing phone and email — enrich before outreach");
  }

  // Industry fit (0–10)
  let fitPts = 4;
  const meta = input.metadata ?? {};
  if (meta.industryPackId || meta.discoverySource === "business-discovery") {
    fitPts = 10;
    reasons.push("Matches Discovery / industry pack targeting");
  } else if (input.industry?.trim()) {
    fitPts = 7;
  }

  // Reputation signal (0–10): strong reviews + weak digital = good opp
  let repPts = 3;
  const rating = typeof meta.rating === "number" ? meta.rating : null;
  if (rating != null && rating >= 4.5) {
    repPts = health != null && health < 70 ? 10 : 7;
    reasons.push(`Strong Google rating (${rating.toFixed(1)})`);
  } else if (rating != null) {
    repPts = 5;
  }

  const score = clamp(gapPts + intentPts + reachPts + fitPts + repPts);
  const recommendedAction = recommendAction(input);
  const band = bandForScore(score);

  return {
    score,
    band,
    bandLabel: bandLabel(band),
    reasons: reasons.slice(0, 6),
    recommendedAction,
    recommendedActionLabel: ACTION_LABELS[recommendedAction],
    approachHint: approachFor(recommendedAction, "this business"),
  };
}

function greetingLine(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Ranked Daily Briefing for Command Centre / Growth hub. */
export async function getDailyOpportunityBriefing(options?: {
  organisationId?: string;
  limit?: number;
  staffName?: string;
}): Promise<DailyOpportunityBriefing> {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 20, 40);
  const today = startOfToday();
  const name = options?.staffName?.trim() || "Ben";

  const rows = await prisma.growthProspect.findMany({
    where: {
      archivedAt: null,
      convertedOrganisationId: null,
      stage: { in: ACTIVE_STAGES },
      ...(options?.organisationId
        ? { organisationId: options.organisationId }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
    include: {
      reports: {
        orderBy: { generatedAt: "desc" },
        take: 1,
        select: { viewCount: true, sentAt: true, firstViewedAt: true },
      },
      audits: {
        orderBy: { auditedAt: "desc" },
        take: 1,
        select: {
          businessHealth: true,
          aiVisibility: true,
          seoScore: true,
          websiteHealth: true,
        },
      },
      engagements: {
        where: { occurredAt: { gte: today } },
        select: { type: true, metadata: true },
      },
    },
  });

  const scored = rows
    .map((row) => {
      const stage = row.stage as ProspectPipelineStage;
      const audit = row.audits[0] ?? null;
      const report = row.reports[0] ?? null;
      const meta = (row.metadata as Record<string, unknown> | null) ?? null;
      const result = computeProspectOpportunityScore({
        stage,
        updatedAt: row.updatedAt,
        websiteUrl: row.websiteUrl,
        contactPhone: row.contactPhone,
        contactEmail: row.contactEmail,
        industry: row.industry,
        metadata: meta,
        audit,
        report,
        engagementCount: row.engagements.length,
      });
      return { row, stage, audit, report, result };
    })
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, limit);

  const dailyRows: DailyOpportunityRow[] = scored.map((item, index) => ({
    rank: index + 1,
    prospectId: item.row.id,
    businessName: item.row.businessName,
    stage: item.stage,
    score: item.result.score,
    band: item.result.band,
    bandLabel: item.result.bandLabel,
    recommendedAction: item.result.recommendedAction,
    recommendedActionLabel: item.result.recommendedActionLabel,
    reasons: item.result.reasons,
    approachHint: approachFor(item.result.recommendedAction, item.row.businessName),
    businessHealthScore: item.audit?.businessHealth ?? null,
    reportViewCount: item.report?.viewCount ?? 0,
    hasAudit: Boolean(item.audit),
    hasReport: Boolean(item.report),
    websiteUrl: item.row.websiteUrl,
    contactPhone: item.row.contactPhone,
    contactEmail: item.row.contactEmail,
  }));

  const [contactedToday, conversations, meetingsBooked, proposalCents] =
    await Promise.all([
      prisma.growthProspectEngagement.count({
        where: {
          occurredAt: { gte: today },
          type: {
            in: [
              "report_sent",
              "proposal_sent",
              "meeting_booked",
              "prospect_created",
            ],
          },
          prospect: { archivedAt: null },
        },
      }),
      prisma.growthProspect.count({
        where: {
          archivedAt: null,
          convertedOrganisationId: null,
          stage: { in: ["email_opened", "report_viewed"] },
        },
      }),
      prisma.growthProspect.count({
        where: {
          archivedAt: null,
          convertedOrganisationId: null,
          stage: "meeting_booked",
        },
      }),
      // Real proposal totals only — from engagement metadata when proposal was created
      prisma.growthProspectEngagement.findMany({
        where: {
          type: "proposal_sent",
          prospect: {
            archivedAt: null,
            convertedOrganisationId: null,
            stage: "proposal_sent",
          },
        },
        select: { metadata: true },
        take: 100,
      }),
    ]);

  let proposalPipelineCents: number | null = null;
  let sum = 0;
  let found = false;
  for (const e of proposalCents) {
    const meta = e.metadata as { totalCents?: number } | null;
    if (typeof meta?.totalCents === "number" && meta.totalCents > 0) {
      sum += meta.totalCents;
      found = true;
    }
  }
  if (found) proposalPipelineCents = sum;

  const stillRequireAction = dailyRows.filter(
    (r) =>
      r.recommendedAction === "run_audit" ||
      r.recommendedAction === "send_audit" ||
      r.recommendedAction === "call_today" ||
      r.recommendedAction === "call_and_email" ||
      r.recommendedAction === "follow_up" ||
      r.recommendedAction === "close_loop",
  ).length;

  const recommendedCount = dailyRows.length;
  const top = dailyRows[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    greeting: `${greetingLine()}, ${name}.`,
    headline:
      recommendedCount > 0
        ? `${recommendedCount} prospect${recommendedCount === 1 ? "" : "s"} recommended today.`
        : "No active prospects to recommend yet — discover or add one.",
    subhead:
      "Based on target industries, pipeline activity, and DigitalGate analysis of businesses most likely to benefit right now.",
    recommendedCount,
    contactedToday,
    conversations,
    meetingsBooked,
    stillRequireAction,
    proposalPipelineCents,
    top,
    rows: dailyRows,
  };
}

/**
 * Sales Assistant compatibility — ranked call list from Opportunity Engine scores.
 * Prefer getDailyOpportunityBriefing for the Daily Briefing UX.
 */
export async function getSalesCallRecommendations(options?: {
  organisationId?: string;
  limit?: number;
  idleDays?: number;
}): Promise<SalesCallRecommendation[]> {
  const briefing = await getDailyOpportunityBriefing({
    organisationId: options?.organisationId,
    limit: options?.limit ?? 12,
  });
  const idleMin = options?.idleDays ?? 0;

  return briefing.rows
    .filter((row) => {
      if (idleMin <= 0) return true;
      // Keep call-oriented rows when idle filter requested
      return (
        row.recommendedAction === "call_today" ||
        row.recommendedAction === "call_and_email" ||
        row.recommendedAction === "follow_up" ||
        row.recommendedAction === "close_loop" ||
        row.stage === "report_viewed" ||
        row.stage === "follow_up_due"
      );
    })
    .map((row) => ({
      prospectId: row.prospectId,
      businessName: row.businessName,
      reason: `${row.recommendedActionLabel} · ${row.reasons[0] ?? row.approachHint}`,
      businessHealthScore: row.businessHealthScore ?? 0,
      reportViewCount: row.reportViewCount,
      stage: row.stage,
      priority: row.score,
    }));
}

export { bandLabel, ACTION_LABELS };
