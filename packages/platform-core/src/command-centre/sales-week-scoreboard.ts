/**
 * Live Sales Week scoreboard — conversations, consultations, proposals, founding seats.
 * Honest counts from CRM Activity + Opportunity + Founding cohort (no invented metrics).
 */

import { getFoundingCohortSummary } from "../founding/invitations";
import {
  WEEKDAY_CUSTOMER_TARGET,
  WEEKDAY_PARTNER_TARGET,
  SALES_WEEK_TZ,
} from "./sales-week";
import { zonedDayKey } from "../time/display";

export type SalesWeekScoreboard = {
  dayKey: string;
  timeZone: string;
  customerConversations: number;
  customerTarget: number;
  partnerConversations: number;
  partnerTarget: number;
  consultations: number;
  proposals: number;
  /** Specific next-step commitments logged today (not vague “follow up later”). */
  nextStepCommitments: number;
  foundingAccepted: number;
  foundingLimit: number;
  conversationObjective: number;
  /** True when counts are zeros because no DB. */
  live: boolean;
};

function startOfZonedDayUtc(dayKey: string): Date {
  // Approximate: treat Brisbane day start as UTC+10 (AEST). Enough for scoreboard buckets.
  return new Date(`${dayKey}T00:00:00+10:00`);
}

function isPartnerish(meta: Record<string, unknown> | null, title: string, body: string | null) {
  const blob = `${title} ${body ?? ""} ${JSON.stringify(meta ?? {})}`.toLowerCase();
  return (
    blob.includes("partner") ||
    blob.includes("reseller") ||
    blob.includes("referr") ||
    meta?.audience === "partner" ||
    meta?.conversationKind === "partner"
  );
}

function isConversationActivity(activityType: string, title: string) {
  const t = activityType.toLowerCase();
  const titleL = title.toLowerCase();
  if (
    t.includes("call") ||
    t.includes("email") ||
    t.includes("sms") ||
    t.includes("conversation") ||
    t.includes("outreach") ||
    t.includes("message")
  ) {
    return true;
  }
  return (
    titleL.includes("conversation") ||
    titleL.includes("called") ||
    titleL.includes("spoke") ||
    titleL.includes("messaged") ||
    titleL.includes("outreach")
  );
}

function hasConcreteNextStep(meta: Record<string, unknown> | null): boolean {
  if (!meta) return false;
  const next =
    (typeof meta.next_action === "string" && meta.next_action) ||
    (typeof meta.nextAction === "string" && meta.nextAction) ||
    (typeof meta.founding_next_action === "string" && meta.founding_next_action) ||
    "";
  const lower = next.toLowerCase().trim();
  if (!lower) return false;
  if (lower.includes("follow up later") || lower === "follow up" || lower === "tbd") {
    return false;
  }
  // Concrete commitments: booked, promised, decision by, application, demo, consultation
  return (
    lower.includes("book") ||
    lower.includes("consultation") ||
    lower.includes("demo") ||
    lower.includes("application") ||
    lower.includes("propos") ||
    lower.includes("decision") ||
    lower.includes("monday") ||
    lower.includes("tuesday") ||
    lower.includes("wednesday") ||
    lower.includes("thursday") ||
    lower.includes("friday") ||
    lower.includes("agree") ||
    /\d/.test(lower)
  );
}

export async function getSalesWeekScoreboard(
  organisationId: string,
  now: Date = new Date(),
): Promise<SalesWeekScoreboard> {
  const dayKey = zonedDayKey(now, SALES_WEEK_TZ);
  const base: SalesWeekScoreboard = {
    dayKey,
    timeZone: SALES_WEEK_TZ,
    customerConversations: 0,
    customerTarget: WEEKDAY_CUSTOMER_TARGET,
    partnerConversations: 0,
    partnerTarget: WEEKDAY_PARTNER_TARGET,
    consultations: 0,
    proposals: 0,
    nextStepCommitments: 0,
    foundingAccepted: 0,
    foundingLimit: 10,
    conversationObjective: WEEKDAY_CUSTOMER_TARGET + WEEKDAY_PARTNER_TARGET,
    live: false,
  };

  if (!process.env.DATABASE_URL || !organisationId.trim()) return base;

  const { prisma } = await import("@dg/database");
  const dayStart = startOfZonedDayUtc(dayKey);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [activities, opportunities, consultations, cohort] = await Promise.all([
    prisma.activity.findMany({
      where: {
        organisationId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
      select: {
        activityType: true,
        title: true,
        body: true,
        metadata: true,
        sourceApp: true,
      },
      take: 500,
    }),
    prisma.opportunity.findMany({
      where: {
        organisationId,
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
      select: { stage: true, pipelineId: true, metadata: true, title: true },
      take: 200,
    }),
    prisma.opportunity.findMany({
      where: {
        organisationId,
        OR: [
          { title: { contains: "Consultation", mode: "insensitive" } },
          { stage: { contains: "consult", mode: "insensitive" } },
        ],
        updatedAt: { gte: dayStart, lt: dayEnd },
      },
      select: { id: true },
      take: 50,
    }),
    getFoundingCohortSummary(organisationId),
  ]);

  let customer = 0;
  let partner = 0;
  for (const row of activities) {
    if (!isConversationActivity(row.activityType, row.title)) continue;
    const meta = (row.metadata as Record<string, unknown> | null) ?? null;
    if (isPartnerish(meta, row.title, row.body)) partner += 1;
    else customer += 1;
  }

  let proposals = 0;
  let nextSteps = 0;
  for (const opp of opportunities) {
    const stage = (opp.stage || "").toLowerCase();
    const meta = (opp.metadata as Record<string, unknown> | null) ?? null;
    if (
      stage.includes("proposal") ||
      stage.includes("agreement_sent") ||
      meta?.proposal_sent_at ||
      meta?.agreement_email_sent_at
    ) {
      proposals += 1;
    }
    if (hasConcreteNextStep(meta)) nextSteps += 1;
  }

  // Also count activities that explicitly log a next-step commitment today
  for (const row of activities) {
    const meta = (row.metadata as Record<string, unknown> | null) ?? null;
    if (hasConcreteNextStep(meta) || row.activityType.toLowerCase().includes("commitment")) {
      nextSteps += 1;
    }
  }

  return {
    ...base,
    live: true,
    customerConversations: customer,
    partnerConversations: partner,
    consultations: consultations.length,
    proposals,
    nextStepCommitments: nextSteps,
    foundingAccepted: cohort.accepted,
    foundingLimit: cohort.limit,
  };
}
