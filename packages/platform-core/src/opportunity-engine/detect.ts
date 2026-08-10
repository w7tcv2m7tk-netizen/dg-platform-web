/**
 * Opportunity detectors — wrap existing Core / CC signals (no invented revenue).
 */

import { getClientIntelligence } from "../command-centre/client-intelligence";
import { getDailyOpportunityBriefing } from "../command-centre/growth-engine/opportunity-engine";
import { getClientExpansionOpportunities } from "../command-centre/opportunities";
import {
  clampOpportunityScore,
  severityForScore,
  type PlatformOpportunity,
} from "./types";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Overdue lead responses across tenants (staff). */
export async function detectOverdueLeadOpportunities(): Promise<PlatformOpportunity[]> {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const now = new Date();

  const leads = await prisma.lead.findMany({
    where: {
      responseDueAt: { lt: now },
      firstResponseAt: null,
    },
    orderBy: { responseDueAt: "asc" },
    take: 25,
    select: {
      id: true,
      title: true,
      source: true,
      responseDueAt: true,
      organisationId: true,
      organisation: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return leads.map((lead) => {
    const due = lead.responseDueAt ? Date.parse(lead.responseDueAt.toISOString()) : now.getTime();
    const idleDays = Math.max(1, Math.floor((now.getTime() - due) / 86_400_000));
    const score = clampOpportunityScore(70 + Math.min(25, idleDays * 3));
    const who =
      [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(" ") ||
      lead.title ||
      "Lead";

    return {
      id: `followup-lead-${lead.id}`,
      kind: "follow_up" as const,
      severity: severityForScore(score),
      score,
      title: `Follow up with ${who}`,
      summary: `Lead inactive / overdue response · ${idleDays} day${idleDays === 1 ? "" : "s"}.`,
      reasons: [
        "responseDueAt passed with no firstResponseAt",
        lead.source ? `Source: ${lead.source}` : "Lead overdue",
      ],
      recommendedAction: "Send follow-up (call or email) and log the activity",
      href: `/apps/crm/contacts`,
      organisationId: lead.organisationId,
      organisationName: lead.organisation.name,
      impactLabel: "Protect conversion · clear overdue SLA",
      source: "opportunity-engine.leads",
      executeHints: ["call", "email", "task"],
    };
  });
}

/** Open tasks past due (staff). */
export async function detectOverdueTaskOpportunities(): Promise<PlatformOpportunity[]> {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const tasks = await prisma.task.findMany({
    where: { status: "open", dueAt: { lte: end } },
    orderBy: { dueAt: "asc" },
    take: 20,
    select: {
      id: true,
      title: true,
      dueAt: true,
      organisationId: true,
      organisation: { select: { name: true } },
    },
  });

  return tasks.map((task) => {
    const score = 78;
    return {
      id: `task-${task.id}`,
      kind: "attention" as const,
      severity: severityForScore(score),
      score,
      title: task.title || "Open task due",
      summary: "Task is open and due today or overdue.",
      reasons: ["Open task with dueAt ≤ end of today"],
      recommendedAction: "Complete or reschedule the task",
      href: `/command/clients/${task.organisationId}`,
      organisationId: task.organisationId,
      organisationName: task.organisation.name,
      source: "opportunity-engine.tasks",
      executeHints: ["task"],
    };
  });
}

/** Client attention reasons + Success Score gaps (observed only). */
export async function detectClientAttentionOpportunities(): Promise<PlatformOpportunity[]> {
  const intelligence = await getClientIntelligence().catch(() => null);
  if (!intelligence) return [];

  const items: PlatformOpportunity[] = [];
  for (const client of intelligence.clients) {
    const reasons = client.attentionReasons ?? [];
    const provisional = client.scoreProvisional === true;

    // Provisional / sparse scores: only surface real attentionReasons — never invent
    // "Low Success Score" ops from early empty-tenant baselines.
    if (provisional && reasons.length === 0) continue;
    if (!client.needsAttention && client.successScore >= 70) continue;

    for (const reason of reasons.slice(0, 3)) {
      const score = clampOpportunityScore(100 - client.successScore + 55);
      items.push({
        id: `attention-${client.organisationId}-${reason.slice(0, 24)}`,
        kind: "attention",
        severity: severityForScore(score),
        score,
        title: `${client.organisationName}: needs attention`,
        summary: reason,
        reasons: [reason, `Success Score ${client.successScore}/100`],
        recommendedAction: "Open client intelligence and clear the blocker",
        href: `/command/clients/${client.organisationId}`,
        organisationId: client.organisationId,
        organisationName: client.organisationName,
        impactLabel: "Stabilise tenant health",
        source: "opportunity-engine.client-intelligence",
        executeHints: ["task", "pipeline"],
      });
    }

    if (!provisional && client.successScore < 55 && reasons.length === 0) {
      const score = clampOpportunityScore(100 - client.successScore);
      const breakdown = client.scoreBreakdown;
      const scoreLines = breakdown
        ? Object.entries(breakdown).map(([k, v]) => `${k}: ${v}`)
        : [`Success Score ${client.successScore}`];
      items.push({
        id: `success-${client.organisationId}`,
        kind: "ops",
        severity: severityForScore(score),
        score,
        title: `Low Success Score · ${client.organisationName}`,
        summary: `Success Score ${client.successScore}/100`,
        reasons: scoreLines,
        recommendedAction: "Review connectors, apps, and twin scores",
        href: `/command/advisor?org=${client.organisationId}`,
        organisationId: client.organisationId,
        organisationName: client.organisationName,
        source: "opportunity-engine.success-score",
        executeHints: ["report", "task"],
      });
    }
  }

  return items;
}

/** Catalogue expansion (honest list prices). */
export async function detectExpansionOpportunities(): Promise<PlatformOpportunity[]> {
  const bundle = await getClientExpansionOpportunities().catch(() => null);
  if (!bundle) return [];

  const items: PlatformOpportunity[] = [];
  for (const summary of bundle.summaries.slice(0, 12)) {
    for (const opp of summary.opportunities.slice(0, 3)) {
      const score = clampOpportunityScore(
        60 + Math.min(30, Math.round(opp.estimatedAdditionalMrrCents / 2000)),
      );
      items.push({
        id: `expansion-${summary.organisationId}-${opp.appId}`,
        kind: "expansion",
        severity: severityForScore(score),
        score,
        title: opp.label,
        summary: `${summary.organisationName} · ${opp.rationale}`,
        reasons: [opp.rationale, "Missing app / capability on live tenant"],
        recommendedAction: `Advise on ${opp.appName}`,
        href: `/command/advisor?org=${summary.organisationId}`,
        organisationId: summary.organisationId,
        organisationName: summary.organisationName,
        impactLabel:
          opp.estimatedAdditionalMrrCents > 0
            ? `${formatAud(opp.estimatedAdditionalMrrCents)}/mo catalogue list price (not Stripe)`
            : "Ops unblock — no catalogue $",
        source: "opportunity-engine.expansion",
        executeHints: ["pipeline", "email"],
      });
    }
  }
  return items;
}

/** Growth prospect Daily Briefing rows → platform opportunities. */
export async function detectProspectOpportunities(
  limit = 15,
): Promise<PlatformOpportunity[]> {
  const briefing = await getDailyOpportunityBriefing({ limit }).catch(() => null);
  if (!briefing) return [];

  return briefing.rows.map((row) => {
    const score = clampOpportunityScore(row.score);
    return {
      id: `prospect-${row.prospectId}`,
      kind: "prospect" as const,
      severity: severityForScore(score),
      score,
      title: row.businessName,
      summary: row.recommendedActionLabel || row.stage,
      reasons: row.reasons?.length ? row.reasons : [`Stage: ${row.stage}`],
      recommendedAction: row.recommendedActionLabel || "Work prospect",
      href: `/command/growth-engine/pipeline?prospect=${row.prospectId}`,
      prospectId: row.prospectId,
      organisationName: row.businessName,
      impactLabel: row.bandLabel,
      source: "opportunity-engine.prospects",
      executeHints: ["call", "email", "report", "pipeline"],
    };
  });
}
