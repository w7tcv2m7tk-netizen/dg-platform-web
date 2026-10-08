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
  "qualified",
  "report_sent",
  "email_opened",
  "report_viewed",
  "follow_up_due",
  "meeting_booked",
  "proposal_sent",
];

const ACTION_LABELS: Record<OpportunityRecommendedAction, string> = {
  research: "Research",
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
    findings?: unknown;
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
  // An audit is research evidence, not permission to contact. Keep newly audited
  // prospects in research until the lifecycle explicitly qualifies them.
  if (stage === "audit_created") return "research";
  if (!hasReport && hasAudit) return "research";
  if (stage === "proposal_sent" || stage === "meeting_booked") return "close_loop";
  if (stage === "report_viewed") return "call_and_email";
  if (stage === "email_opened" || stage === "follow_up_due") return "call_today";
  if (stage === "qualified") return "call_today";
  if (stage === "report_sent") return "follow_up";
  return "call_today";
}

function approachFor(action: OpportunityRecommendedAction, businessName: string): string {
  switch (action) {
    case "research":
      return `Review the audit and business intelligence for ${businessName}, identify the right decision-maker and assess fit before outreach.`;
    case "run_audit":
      return `Research and enrich ${businessName} before outreach; confirm the right contact and route.`;
    case "send_audit":
      return `Send Digital Growth Audit first — lead with measured gaps, not a cold pitch.`;
    case "call_today":
      return `Call today while the report is warm; keep the ask short.`;
    case "call_and_email":
      return `The public report URL was accessed; confirm receipt before discussing the findings.`;
    case "follow_up":
      return `Report sent — confirm receipt with a short follow-up.`;
    case "close_loop":
      return `Close the loop on the open proposal or meeting — confirm next step.`;
    default:
      return `Prioritise a clear next step for ${businessName}.`;
  }
}

/** Explainable Prospect Scoring Engine v2 from observable Growth Engine fields. */
export function computeProspectOpportunityScore(
  input: OpportunityScoreInput,
): ProspectOpportunityScoreResult {
  const positiveSignals: string[] = [];
  const penalties: string[] = [];
  const meta = input.metadata ?? {};
  const health = input.audit?.businessHealth ?? null;
  const seo = input.audit?.seoScore ?? null;
  const ai = input.audit?.aiVisibility ?? null;
  const website = input.audit?.websiteHealth ?? null;
  const rating = typeof meta.rating === "number" ? meta.rating : null;
  const auditPayload = input.audit?.findings && typeof input.audit.findings === "object"
    ? input.audit.findings as { digitalGateSolutionMatches?: Array<{ relevance?: string; capability?: string }> }
    : null;
  const solutionMatches = Array.isArray(auditPayload?.digitalGateSolutionMatches)
    ? auditPayload.digitalGateSolutionMatches
    : [];
  const highSolutionMatches = solutionMatches.filter((m) => m?.relevance === "high").length;

  // Fit (0–100): ICP evidence, commercial/reputation signals and target alignment.
  let fit = 35;
  if (meta.industryPackId || meta.discoverySource === "business-discovery") {
    fit += 25; positiveSignals.push("Matches Discovery / industry targeting");
  } else if (input.industry?.trim()) {
    fit += 15; positiveSignals.push("Industry identified");
  }
  if (rating != null && rating >= 4.5) {
    fit += 15; positiveSignals.push(`Strong Google rating (${rating.toFixed(1)})`);
  } else if (rating != null) fit += 8;
  if (input.websiteUrl) fit += 10;
  if (input.contactPhone || input.contactEmail) fit += 10;
  if (meta.location || meta.address) fit += 5;
  const fitScore = clamp(fit);

  // Opportunity (0–100): weaker verified digital performance = more DG upside.
  const verified = [health, seo, ai, website].filter((v): v is number => typeof v === "number");
  const digitalGapScore = verified.length
    ? clamp(verified.reduce((sum, v) => sum + (100 - v), 0) / verified.length)
    : 45;
  // Need alone is not enough: prioritise gaps DigitalGate can demonstrably solve.
  // Research v2 persists solution matches from the same evidence used by the report.
  const solutionFitScore = solutionMatches.length
    ? clamp(45 + solutionMatches.length * 6 + highSolutionMatches * 7)
    : 45;
  const opportunityScore = clamp(digitalGapScore * 0.68 + solutionFitScore * 0.32);
  if (!input.audit) penalties.push("No verified presence audit yet");
  if (solutionMatches.length) {
    positiveSignals.push(`${solutionMatches.length} DigitalGate solution match${solutionMatches.length === 1 ? "" : "es"} identified`);
    if (highSolutionMatches >= 2) positiveSignals.push(`${highSolutionMatches} high-relevance DigitalGate opportunities`);
  }
  if (health != null && health < 60) positiveSignals.push(`Business Health ${health}/100 — improvement opportunity`);
  if (seo != null && seo < 55) positiveSignals.push(`SEO ${seo}/100 — organic visibility opportunity`);
  if (ai != null && ai < 50) positiveSignals.push(`AI Visibility ${ai}/100 — AI-search opportunity`);
  if (website != null && website < 60) positiveSignals.push(`Website Health ${website}/100 — website/conversion opportunity`);

  // Research confidence (0–100): evidence completeness, not prospect quality.
  let confidence = 0;
  if (input.websiteUrl) confidence += 15;
  if (input.audit) confidence += 35;
  if (input.industry?.trim()) confidence += 10;
  if (input.contactPhone) confidence += 10;
  if (input.contactEmail) confidence += 15;
  if (rating != null) confidence += 5;
  if (meta.industryPackId || meta.discoverySource === "business-discovery") confidence += 10;
  const researchConfidence = clamp(confidence);
  if (!input.contactPhone && !input.contactEmail) penalties.push("No usable contact route");
  if (researchConfidence < 55) penalties.push("Research confidence is still low");

  const isQualified = input.stage === "qualified";
  const contactable = Boolean(input.contactPhone || input.contactEmail);
  const dailyTop3Eligible = isQualified && contactable && researchConfidence >= 55;
  // Contact Priority rewards fit, opportunity and evidence. Qualification is a gate,
  // not a score boost, so weak prospects cannot rank highly merely by advancing stage.
  const contactPriority = dailyTop3Eligible
    ? clamp(fitScore * 0.38 + opportunityScore * 0.37 + researchConfidence * 0.25)
    : null;
  const researchPriority = clamp(fitScore * 0.35 + opportunityScore * 0.4 + researchConfidence * 0.25);
  const score = contactPriority ?? researchPriority;

  if (input.stage === "qualified") positiveSignals.push("Qualified for outreach");
  const viewCount = input.report?.viewCount ?? 0;
  if (viewCount > 0) positiveSignals.push(`${viewCount} public report URL access${viewCount === 1 ? "" : "es"} — reader identity unknown`);
  if (input.stage === "report_viewed") positiveSignals.push("Public report URL accessed");
  if (input.stage === "meeting_booked") positiveSignals.push("Meeting booked");

  const recommendedAction = recommendAction(input);
  const band = bandForScore(score);
  return {
    score,
    scoreVersion: "v2",
    fitScore,
    opportunityScore,
    researchConfidence,
    contactPriority,
    positiveSignals: positiveSignals.slice(0, 8),
    penalties: penalties.slice(0, 5),
    dailyTop3Eligible,
    band,
    bandLabel: bandLabel(band),
    reasons: [...positiveSignals, ...penalties].slice(0, 6),
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
          findings: true,
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
      const rawAudit = row.audits[0] ?? null;
      const auditFindings = rawAudit?.findings as { probes?: { contentAccessible?: boolean } } | null;
      // Do not turn blocked/inaccessible HTML into negative SEO/website evidence.
      const audit = auditFindings?.probes?.contentAccessible === false ? null : rawAudit;
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
    .sort((a, b) => {
      // Canonical readiness rule: qualified + contactable + sufficient evidence
      // always outranks research work. All prospecting surfaces consume this briefing.
      if (a.result.dailyTop3Eligible !== b.result.dailyTop3Eligible) {
        return a.result.dailyTop3Eligible ? -1 : 1;
      }
      return b.result.score - a.result.score;
    })
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
    auditScores: item.audit
      ? {
          businessHealth: item.audit.businessHealth,
          aiVisibility: item.audit.aiVisibility,
          seo: item.audit.seoScore,
          websiteHealth: item.audit.websiteHealth,
        }
      : null,
    auditFindings: (() => {
      const findings = item.audit?.findings as { findings?: Array<{ title?: string; observed?: string; detail?: string; recommendedAction?: string }> } | null;
      return (findings?.findings ?? []).slice(0, 8).map((finding) => ({
        title: finding.title ?? "",
        observed: finding.observed ?? "",
        detail: finding.detail ?? "",
        recommendedAction: finding.recommendedAction ?? "",
      }));
    })(),
    reportViewCount: item.report?.viewCount ?? 0,
    reportSent: Boolean(item.report?.sentAt),
    reportFirstViewedAt: item.report?.firstViewedAt?.toISOString() ?? null,
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
            ],
          },
          prospect: { archivedAt: null, ...(options?.organisationId ? { organisationId: options.organisationId } : {}) },
        },
      }),
      prisma.growthProspect.count({
        where: {
          archivedAt: null,
          convertedOrganisationId: null,
          stage: { in: ["email_opened", "report_viewed"] },
          ...(options?.organisationId ? { organisationId: options.organisationId } : {}),
        },
      }),
      prisma.growthProspect.count({
        where: {
          archivedAt: null,
          convertedOrganisationId: null,
          stage: "meeting_booked",
          ...(options?.organisationId ? { organisationId: options.organisationId } : {}),
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
            ...(options?.organisationId ? { organisationId: options.organisationId } : {}),
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
      r.recommendedAction === "research" ||
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
