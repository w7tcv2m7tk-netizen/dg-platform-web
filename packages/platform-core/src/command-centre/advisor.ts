/**
 * AI Business Advisor — staff insights for a client organisation.
 * Uses LLM when configured; deterministic fallback otherwise.
 * @see docs/COMMAND-CENTRE.md
 */

import { llmChat, llmConfigured } from "../ai/llm";
import type { RecommendedAction } from "../intelligence/types";
import { getClientIntelligence } from "./client-intelligence";
import { tierLabel } from "./success-score";
import type { ClientAdvisorInsight } from "./types";

export type AdvisorContext = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  successScore: number;
  healthTier: string;
  breakdown: {
    connectors: number;
    crm: number;
    usage: number;
    billing: number;
  };
  highlights: string[];
  concerns: string[];
  memberCount: number;
  contactCount: number;
  leadCount: number;
  propertyCount: number;
  stayBookingCount: number;
  installedApps: string[];
  status: string;
  industry: string | null;
  rank: number;
  cohortAverage: number;
};

export async function buildAdvisorContext(
  organisationId: string,
): Promise<AdvisorContext | null> {
  const bundle = await getClientIntelligence();
  const client = bundle.clients.find((c) => c.organisationId === organisationId);
  if (!client) return null;

  return {
    organisationId: client.organisationId,
    organisationName: client.organisationName,
    organisationSlug: client.organisationSlug,
    successScore: client.successScore,
    healthTier: client.healthTier,
    breakdown: client.scoreBreakdown,
    highlights: client.highlights,
    concerns: client.attentionReasons,
    memberCount: client.memberCount,
    contactCount: client.contactCount,
    leadCount: client.leadCount,
    propertyCount: client.propertyCount,
    stayBookingCount: client.stayBookingCount,
    installedApps: client.installedApps,
    status: client.status,
    industry: client.industry,
    rank: client.rank,
    cohortAverage: bundle.averageSuccessScore,
  };
}

function templateInsight(ctx: AdvisorContext): ClientAdvisorInsight {
  const positives = [...ctx.highlights];
  if (ctx.successScore >= ctx.cohortAverage) {
    positives.push(
      `Success Score ${ctx.successScore} is at or above cohort average (${ctx.cohortAverage})`,
    );
  }
  if (positives.length === 0) {
    positives.push("Organisation is provisioned on the platform");
  }

  const concerns = [...ctx.concerns];
  if (ctx.successScore < ctx.cohortAverage) {
    concerns.push(
      `Success Score ${ctx.successScore} trails cohort average (${ctx.cohortAverage})`,
    );
  }

  const recommendations: RecommendedAction[] = [];
  let priority = 1;

  if (ctx.concerns.some((c) => /WordPress/i.test(c))) {
    recommendations.push({
      id: "fix-wp",
      label: "Connect WordPress",
      description: "Restore connector sync for RE/Acc data freshness.",
      href: "/dashboard/settings/connectors",
      priority: priority++,
    });
  }
  if (ctx.concerns.some((c) => /overdue lead/i.test(c))) {
    recommendations.push({
      id: "clear-sla",
      label: "Clear overdue lead responses",
      description: "Protect conversion and Agency Health ranking.",
      href: "/apps/re/vendor-leads",
      priority: priority++,
    });
  }
  if (ctx.breakdown.crm < 60) {
    recommendations.push({
      id: "crm-activity",
      label: "Drive CRM activity this week",
      description: "Log contacts, chase open opportunities, keep the timeline warm.",
      href: "/apps/crm/contacts",
      priority: priority++,
    });
  }
  if (ctx.breakdown.billing < 60) {
    recommendations.push({
      id: "billing",
      label: "Review billing footing",
      description: "Confirm Stripe customer and active subscription.",
      href: "/dashboard/settings/billing",
      priority: priority++,
    });
  }
  if (!ctx.installedApps.includes("ai-visibility")) {
    recommendations.push({
      id: "upsell-ai-vis",
      label: "Recommend AI Visibility Pro",
      description: "Evidence-based expansion — improves Success Score inputs.",
      href: "/command/opportunities",
      priority: priority++,
    });
  }
  if (recommendations.length === 0) {
    recommendations.push({
      id: "keep-momentum",
      label: "Share monthly Growth Report",
      description: "Lock in retention with quantified ROI.",
      href: "/command/reports",
      priority: 1,
    });
  }

  const tier =
    ctx.healthTier === "top_performer" ||
    ctx.healthTier === "healthy" ||
    ctx.healthTier === "needs_attention"
      ? tierLabel(ctx.healthTier)
      : ctx.healthTier;

  const summary = [
    `${ctx.organisationName} is ranked #${ctx.rank} with Success Score™ ${ctx.successScore}/100 (${tier}).`,
    `Breakdown — connectors ${ctx.breakdown.connectors}, CRM ${ctx.breakdown.crm}, usage ${ctx.breakdown.usage}, billing ${ctx.breakdown.billing}.`,
    concerns.length
      ? `Focus: ${concerns.slice(0, 2).join("; ")}.`
      : "No major concerns — maintain momentum and send the Growth Report.",
  ].join(" ");

  return {
    organisationId: ctx.organisationId,
    summary,
    positives: positives.slice(0, 5),
    concerns: concerns.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
    generatedAt: new Date(),
  };
}

function parseAdvisorJson(text: string, organisationId: string): ClientAdvisorInsight | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const json = JSON.parse(text.slice(start, end + 1)) as {
      summary?: string;
      positives?: string[];
      concerns?: string[];
      recommendations?: Array<{
        id?: string;
        label?: string;
        description?: string;
        href?: string;
        priority?: number;
      }>;
    };
    if (!json.summary) return null;
    return {
      organisationId,
      summary: json.summary,
      positives: Array.isArray(json.positives) ? json.positives.slice(0, 6) : [],
      concerns: Array.isArray(json.concerns) ? json.concerns.slice(0, 6) : [],
      recommendations: (json.recommendations ?? [])
        .filter((r) => r?.label)
        .slice(0, 5)
        .map((r, i) => ({
          id: r.id || `rec-${i + 1}`,
          label: r.label!,
          description: r.description,
          href: r.href,
          priority: r.priority ?? i + 1,
        })),
      generatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

/** Generate org-level advisor insight for DigitalGate staff. */
export async function generateClientAdvisorInsight(input: {
  organisationId: string;
  question?: string;
}): Promise<
  | (ClientAdvisorInsight & {
      source: "llm" | "template";
      organisationName: string;
      successScore: number;
      healthTier: string;
      provider?: string;
      model?: string;
    })
  | null
> {
  const ctx = await buildAdvisorContext(input.organisationId);
  if (!ctx) return null;

  const fallback = templateInsight(ctx);
  const question =
    input.question?.trim() ||
    `How is ${ctx.organisationName} performing?`;

  if (!llmConfigured()) {
    return {
      ...fallback,
      source: "template",
      organisationName: ctx.organisationName,
      successScore: ctx.successScore,
      healthTier: ctx.healthTier,
    };
  }

  try {
    const system = [
      "You are the DigitalGate Command Centre AI Business Advisor.",
      "Staff-only. Analyse client performance from the provided platform metrics.",
      "Never invent metrics. Australian English. Be concrete and actionable.",
      "Respond with JSON only:",
      '{"summary":"...","positives":["..."],"concerns":["..."],"recommendations":[{"id":"...","label":"...","description":"...","href":"/path","priority":1}]}',
    ].join("\n");

    const user = [
      `Question: ${question}`,
      "",
      "Client metrics:",
      JSON.stringify(
        {
          name: ctx.organisationName,
          slug: ctx.organisationSlug,
          status: ctx.status,
          industry: ctx.industry,
          successScore: ctx.successScore,
          healthTier: ctx.healthTier,
          rank: ctx.rank,
          cohortAverage: ctx.cohortAverage,
          breakdown: ctx.breakdown,
          highlights: ctx.highlights,
          concerns: ctx.concerns,
          members: ctx.memberCount,
          contacts: ctx.contactCount,
          leads: ctx.leadCount,
          properties: ctx.propertyCount,
          stayBookings: ctx.stayBookingCount,
          apps: ctx.installedApps,
        },
        null,
        2,
      ),
    ].join("\n");

    const result = await llmChat({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      maxTokens: 1400,
      tier: "reasoning",
    });

    const parsed = parseAdvisorJson(result.text, ctx.organisationId);
    if (!parsed) {
      return {
        ...fallback,
        source: "template",
        organisationName: ctx.organisationName,
        successScore: ctx.successScore,
        healthTier: ctx.healthTier,
        provider: result.provider,
        model: result.model,
      };
    }

    return {
      ...parsed,
      source: "llm",
      organisationName: ctx.organisationName,
      successScore: ctx.successScore,
      healthTier: ctx.healthTier,
      provider: result.provider,
      model: result.model,
    };
  } catch (err) {
    console.warn(
      "[command.advisor] LLM failed — template fallback",
      err instanceof Error ? err.message : err,
    );
    return {
      ...fallback,
      source: "template",
      organisationName: ctx.organisationName,
      successScore: ctx.successScore,
      healthTier: ctx.healthTier,
    };
  }
}
