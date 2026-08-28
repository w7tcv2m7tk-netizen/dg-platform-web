/**
 * AI Business Advisor — staff insights for a client organisation.
 * Uses LLM when configured; deterministic fallback otherwise.
 * @see docs/COMMAND-CENTRE.md
 */

import { llmChat, llmConfigured } from "../ai/llm";
import type { RecommendedAction } from "../intelligence/types";
import { assessBillingFooting } from "./advisor-billing";
import { getClientIntelligence } from "./client-intelligence";
import { healthTierDisplay } from "./success-score";
import type {
  AdvisorConfidenceLevel,
  AdvisorEvidenceItem,
  AdvisorPriorityItem,
  ClientAdvisorInsight,
} from "./types";

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
  leadsThisMonth: number;
  activitiesThisMonth: number;
  openOpportunities: number;
  hasBillingCustomer: boolean;
  expectsPlatformBilling: boolean;
  activeSubscriptionCount: number;
  subscriptionMrrCents: number;
  invoicePaidMtdCents: number;
  daysSinceUpdate: number;
  scoreProvisional: boolean;
  dataCoverage: "sparse" | "partial" | "rich";
  billingFooting: ReturnType<typeof assessBillingFooting>;
};

export async function buildAdvisorContext(
  organisationId: string,
): Promise<AdvisorContext | null> {
  const bundle = await getClientIntelligence();
  const client = bundle.clients.find((c) => c.organisationId === organisationId);
  if (!client) return null;

  const billingFooting = assessBillingFooting({
    status: client.status,
    expectsPlatformBilling: client.expectsPlatformBilling,
    hasBillingCustomer: client.hasBillingCustomer,
    activeSubscriptionCount: client.activeSubscriptionCount,
    invoicePaidMtdCents: client.invoicePaidMtdCents,
    subscriptionMrrCents: client.subscriptionMrrCents,
  });

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
    leadsThisMonth: client.leadsThisMonth,
    activitiesThisMonth: client.activitiesThisMonth,
    openOpportunities: client.openOpportunities,
    hasBillingCustomer: client.hasBillingCustomer,
    expectsPlatformBilling: client.expectsPlatformBilling,
    activeSubscriptionCount: client.activeSubscriptionCount,
    subscriptionMrrCents: client.subscriptionMrrCents,
    invoicePaidMtdCents: client.invoicePaidMtdCents,
    daysSinceUpdate: client.daysSinceUpdate,
    scoreProvisional: client.scoreProvisional,
    dataCoverage: client.dataCoverage,
    billingFooting,
  };
}

function assessConfidence(ctx: AdvisorContext): {
  level: AdvisorConfidenceLevel;
  rationale: string;
} {
  if (ctx.dataCoverage === "rich") {
    return {
      level: "high",
      rationale: "Based on live platform signals available today.",
    };
  }
  if (ctx.dataCoverage === "partial") {
    return {
      level: "limited",
      rationale:
        "Partial data — recommendations may change as more connectors and activity are established.",
    };
  }
  return {
    level: "sparse",
    rationale:
      "Limited live data — early signals only. DigitalGate will not invent gaps from empty records.",
  };
}

function buildEvidence(ctx: AdvisorContext): AdvisorEvidenceItem[] {
  const daysQuiet =
    ctx.daysSinceUpdate >= 1
      ? `${Math.round(ctx.daysSinceUpdate)} day${ctx.daysSinceUpdate >= 1.9 ? "s" : ""} since org update`
      : "Updated recently";

  return [
    {
      id: "crm",
      label: "CRM activity",
      score: ctx.breakdown.crm,
      detail: `${ctx.contactCount} contacts · ${ctx.openOpportunities} open opportunities · ${ctx.activitiesThisMonth} activities this month · ${ctx.leadsThisMonth} leads this month`,
    },
    {
      id: "usage",
      label: "Platform usage",
      score: ctx.breakdown.usage,
      detail: `${ctx.memberCount} members · ${ctx.installedApps.length} apps installed · ${daysQuiet}`,
    },
    {
      id: "billing",
      label: "Billing footing",
      score: ctx.breakdown.billing,
      detail: ctx.billingFooting.detail,
    },
    {
      id: "connectors",
      label: "Connectors",
      score: ctx.breakdown.connectors,
      detail: `${ctx.installedApps.slice(0, 6).join(", ") || "No apps installed yet"}`,
    },
  ];
}

function buildPriorities(ctx: AdvisorContext): AdvisorPriorityItem[] {
  const items: AdvisorPriorityItem[] = [];

  if (ctx.breakdown.crm < 70) {
    const lowActivity =
      ctx.contactCount > 0 &&
      ctx.activitiesThisMonth < 3 &&
      ctx.leadsThisMonth === 0;
    items.push({
      id: "crm",
      label: "CRM engagement",
      score: ctx.breakdown.crm,
      summary: lowActivity
        ? "Low recent activity relative to contacts on file."
        : "CRM activity is below the level expected for this organisation stage.",
      href:
        ctx.openOpportunities > 0
          ? "/apps/crm/opportunities"
          : "/apps/crm/contacts",
    });
  }

  if (ctx.billingFooting.needsIntervention) {
    items.push({
      id: "billing",
      label: "Billing readiness",
      score: ctx.breakdown.billing,
      summary: ctx.billingFooting.detail,
      href: `/command/clients/${ctx.organisationId}`,
    });
  } else if (ctx.billingFooting.state === "healthy_trial") {
    items.push({
      id: "billing",
      label: "Billing readiness",
      score: ctx.breakdown.billing,
      summary: ctx.billingFooting.detail,
      href: `/command/clients/${ctx.organisationId}`,
    });
  }

  if (ctx.breakdown.usage < 70) {
    items.push({
      id: "usage",
      label: "Platform engagement",
      score: ctx.breakdown.usage,
      summary: "Usage is reasonable but has room to improve — more apps and activity strengthen the Twin.",
      href: "/dashboard/apps",
    });
  }

  if (ctx.breakdown.connectors < 60 && ctx.dataCoverage !== "sparse") {
    items.push({
      id: "connectors",
      label: "Connectors",
      score: ctx.breakdown.connectors,
      summary: "Connector or integration health could be strengthened.",
      href: `/command/clients/${ctx.organisationId}`,
    });
  }

  return items.slice(0, 4);
}

function buildExecutiveSummary(ctx: AdvisorContext): string {
  const tier = healthTierDisplay(ctx.healthTier);

  const parts: string[] = [];

  if (ctx.scoreProvisional || ctx.dataCoverage === "sparse") {
    parts.push(
      `${ctx.organisationName} has limited live platform data so far — treat the Success Score as provisional.`,
    );
  } else {
    parts.push(
      `${ctx.organisationName} is ranked #${ctx.rank} with Success Score™ ${ctx.successScore}/100 (${tier}).`,
    );
  }

  const dimensions = [
    { key: "crm", score: ctx.breakdown.crm, label: "CRM engagement" },
    { key: "usage", score: ctx.breakdown.usage, label: "platform engagement" },
    { key: "billing", score: ctx.breakdown.billing, label: "billing readiness" },
    { key: "connectors", score: ctx.breakdown.connectors, label: "connectors" },
  ].sort((a, b) => a.score - b.score);

  const weakest = dimensions[0];
  if (!ctx.scoreProvisional && weakest.score < 60) {
    parts.push(
      `${weakest.label.charAt(0).toUpperCase()}${weakest.label.slice(1)} is the primary operational weakness (${weakest.score}/100).`,
    );
  }

  if (ctx.billingFooting.state === "healthy_trial") {
    parts.push(
      "The organisation is on trial — no billing intervention is required today.",
    );
  } else if (ctx.billingFooting.needsIntervention) {
    parts.push(`${ctx.billingFooting.label}: ${ctx.billingFooting.detail}`);
  }

  if (
    !ctx.scoreProvisional &&
    ctx.successScore < ctx.cohortAverage &&
    ctx.cohortAverage > 0
  ) {
    parts.push(
      `Success Score trails the cohort average (${ctx.cohortAverage}) by ${ctx.cohortAverage - ctx.successScore} points.`,
    );
  } else if (!ctx.scoreProvisional && ctx.concerns.length === 0) {
    parts.push("No major operational concerns — maintain momentum.");
  }

  return parts.join(" ");
}

function buildRecommendations(ctx: AdvisorContext): RecommendedAction[] {
  const recommendations: RecommendedAction[] = [];
  let priority = 1;

  if (ctx.concerns.some((c) => /overdue lead/i.test(c))) {
    recommendations.push({
      id: "clear-sla",
      label: "Clear overdue lead responses",
      description: "Protect conversion and organisation health ranking.",
      href: "/apps/re/vendor-leads",
      priority: priority++,
    });
  }

  if (ctx.breakdown.crm < 60) {
    recommendations.push({
      id: "crm-activity",
      label: "Increase CRM activity",
      description:
        ctx.openOpportunities > 0
          ? `Review ${ctx.openOpportunities} open opportunit${ctx.openOpportunities === 1 ? "y" : "ies"} and inactive contacts.`
          : "Log contacts, chase open opportunities, keep the timeline warm.",
      href:
        ctx.openOpportunities > 0
          ? "/apps/crm/opportunities"
          : "/apps/crm/contacts",
      priority: priority++,
    });
  }

  if (ctx.billingFooting.needsIntervention) {
    if (ctx.billingFooting.state === "no_customer") {
      recommendations.push({
        id: "billing-customer",
        label: "Create Stripe customer record",
        description: ctx.billingFooting.detail,
        href: `/command/clients/${ctx.organisationId}`,
        priority: priority++,
      });
    } else if (ctx.billingFooting.state === "subscription_inactive") {
      recommendations.push({
        id: "billing-subscription",
        label: "Review subscription status",
        description: ctx.billingFooting.detail,
        href: `/command/clients/${ctx.organisationId}`,
        priority: priority++,
      });
    } else {
      recommendations.push({
        id: "billing",
        label: "Review billing footing",
        description: ctx.billingFooting.detail,
        href: `/command/clients/${ctx.organisationId}`,
        priority: priority++,
      });
    }
  } else if (ctx.billingFooting.state === "healthy_trial") {
    recommendations.push({
      id: "trial-conversion",
      label: "Prepare trial conversion",
      description:
        "Review onboarding progress and platform adoption before trial ends.",
      href: `/command/clients/${ctx.organisationId}`,
      priority: priority++,
    });
  }

  if (
    !ctx.installedApps.includes("ai-visibility") &&
    ctx.dataCoverage !== "sparse"
  ) {
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

  return recommendations.slice(0, 5);
}

function enrichInsight(
  ctx: AdvisorContext,
  insight: ClientAdvisorInsight,
): ClientAdvisorInsight {
  const confidence = assessConfidence(ctx);
  return {
    ...insight,
    assessmentTitle: "AI Advisor Assessment",
    summary: insight.summary || buildExecutiveSummary(ctx),
    priorities: buildPriorities(ctx),
    evidence: buildEvidence(ctx),
    confidence: confidence.level,
    confidenceRationale: confidence.rationale,
    breakdown: ctx.breakdown,
    dataCoverage: ctx.dataCoverage,
    scoreProvisional: ctx.scoreProvisional,
    cohortDelta: ctx.successScore - ctx.cohortAverage,
    billingFooting: ctx.billingFooting,
  };
}

function templateInsight(ctx: AdvisorContext): ClientAdvisorInsight {
  const positives = [...ctx.highlights];
  if (
    !ctx.scoreProvisional &&
    ctx.successScore >= ctx.cohortAverage &&
    ctx.cohortAverage > 0
  ) {
    positives.push(
      `Success Score ${ctx.successScore} is at or above cohort average (${ctx.cohortAverage})`,
    );
  }
  if (positives.length === 0) {
    positives.push("Organisation is provisioned on the platform");
  }

  const concerns = [...ctx.concerns];
  if (
    !ctx.scoreProvisional &&
    ctx.successScore < ctx.cohortAverage &&
    ctx.cohortAverage > 0
  ) {
    concerns.push(
      `Success Score ${ctx.successScore} trails cohort average (${ctx.cohortAverage})`,
    );
  }

  return enrichInsight(ctx, {
    organisationId: ctx.organisationId,
    summary: buildExecutiveSummary(ctx),
    positives: positives.slice(0, 5),
    concerns: concerns.slice(0, 5),
    recommendations: buildRecommendations(ctx),
    generatedAt: new Date(),
  });
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
      "Do NOT recommend billing intervention for healthy trial organisations.",
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
          billingFooting: ctx.billingFooting,
          highlights: ctx.highlights,
          concerns: ctx.concerns,
          dataCoverage: ctx.dataCoverage,
          scoreProvisional: ctx.scoreProvisional,
          members: ctx.memberCount,
          contacts: ctx.contactCount,
          leads: ctx.leadCount,
          leadsThisMonth: ctx.leadsThisMonth,
          activitiesThisMonth: ctx.activitiesThisMonth,
          openOpportunities: ctx.openOpportunities,
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
      ...enrichInsight(ctx, parsed),
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
