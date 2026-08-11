/**
 * Client expansion — one Opportunity Engine™ kind (missing-app catalogue gaps).
 * Dollar amounts are **static catalogue list prices** for missing apps — not Stripe
 * subscription revenue or Growth “MRR won”.
 * @see docs/foundations/OPPORTUNITY-ENGINE.md · docs/COMMAND-CENTRE.md
 */

import { getClientIntelligence } from "./client-intelligence";
import type { ClientOpportunity, ClientOpportunitySummary } from "./types";

const EXPANSION_CATALOGUE: Array<{
  appId: string;
  appName: string;
  label: string;
  estimatedAdditionalMrrCents: number;
  rationaleWhenMissing: string;
  industries?: string[];
}> = [
  {
    appId: "ai-visibility",
    appName: "AI Visibility Pro",
    label: "Enable AI Visibility Pro",
    estimatedAdditionalMrrCents: 29_700,
    rationaleWhenMissing:
      "Not installed — improves Success Score visibility inputs and client wow metrics.",
  },
  {
    appId: "seo",
    appName: "SEO Pro",
    label: "Enable SEO Pro",
    estimatedAdditionalMrrCents: 19_700,
    rationaleWhenMissing: "SEO App not enabled — cohort clients with SEO score higher retention.",
  },
  {
    appId: "marketing",
    appName: "Marketing",
    label: "Enable Marketing Automation",
    estimatedAdditionalMrrCents: 24_700,
    rationaleWhenMissing: "Marketing App not installed — upsell for lead-gen heavy tenants.",
  },
  {
    appId: "automation",
    appName: "Automation",
    label: "Enable Automation",
    estimatedAdditionalMrrCents: 14_700,
    rationaleWhenMissing: "Automation App missing — hours-saved narrative for monthly reports.",
  },
  {
    appId: "real-estate",
    appName: "Real Estate",
    label: "Enable Real Estate App",
    estimatedAdditionalMrrCents: 49_700,
    rationaleWhenMissing: "Industry fit for real-estate orgs without RE Gen 2.",
    industries: ["real_estate", "real-estate", "property"],
  },
  {
    appId: "accommodation",
    appName: "Accommodation",
    label: "Enable Accommodation App",
    estimatedAdditionalMrrCents: 39_700,
    rationaleWhenMissing: "Industry fit for hospitality/short-stay operators.",
    industries: ["accommodation", "hospitality", "tourism"],
  },
];

function industryMatch(orgIndustry: string | null, wanted?: string[]): boolean {
  if (!wanted?.length) return true;
  if (!orgIndustry) return false;
  const n = orgIndustry.toLowerCase().replace(/\s+/g, "_");
  return wanted.some((w) => n.includes(w.replace(/-/g, "_")));
}

export type OpportunitiesBundle = {
  generatedAt: string;
  /** Sum of catalogue list prices for missing apps — not Stripe MRR. */
  totalPotentialMrrCents: number;
  totalPotentialMrrLabel: string;
  /** Always catalogue for this engine (honest beta). */
  pricingSource: "catalogue";
  pricingNote: string;
  summaries: ClientOpportunitySummary[];
};

function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Build expansion opportunities across live client orgs. */
export async function getClientExpansionOpportunities(): Promise<OpportunitiesBundle> {
  const intelligence = await getClientIntelligence();
  const now = new Date();
  const summaries: ClientOpportunitySummary[] = [];

  for (const client of intelligence.clients) {
    const installed = new Set(client.installedApps);
    const opportunities: ClientOpportunity[] = [];

    for (const item of EXPANSION_CATALOGUE) {
      if (installed.has(item.appId)) continue;
      if (!industryMatch(client.industry, item.industries)) {
        if (item.industries?.length) continue;
      }

      let rationale = item.rationaleWhenMissing;
      if (client.scoreBreakdown.connectors < 60 && item.appId === "ai-visibility") {
        rationale += " Connectors are weak — visibility wins often unlock after sync.";
      }
      if (
        client.attentionReasons.some((c) => /WordPress/i.test(c)) &&
        (item.appId === "real-estate" || item.appId === "accommodation")
      ) {
        continue;
      }

      opportunities.push({
        organisationId: client.organisationId,
        appId: item.appId,
        appName: item.appName,
        label: item.label,
        rationale,
        estimatedAdditionalMrrCents: item.estimatedAdditionalMrrCents,
      });
    }

    if (
      client.attentionReasons.some((c) => /WordPress/i.test(c)) ||
      (client.installedApps.some((a) => ["real-estate", "accommodation"].includes(a)) &&
        client.scoreBreakdown.connectors < 50)
    ) {
      opportunities.unshift({
        organisationId: client.organisationId,
        appId: "connectors.wordpress",
        appName: "WordPress connector",
        label: "Fix WordPress connector",
        rationale:
          "Sync gap blocking live RE/Acc data — unblock before pitching new Apps.",
        estimatedAdditionalMrrCents: 0,
      });
    }

    if (opportunities.length === 0) continue;

    const totalPotentialMrrCents = opportunities.reduce(
      (s, o) => s + o.estimatedAdditionalMrrCents,
      0,
    );

    summaries.push({
      organisationId: client.organisationId,
      organisationName: client.organisationName,
      opportunities: opportunities.slice(0, 6),
      totalPotentialMrrCents,
    });
  }

  summaries.sort((a, b) => b.totalPotentialMrrCents - a.totalPotentialMrrCents);
  const totalPotentialMrrCents = summaries.reduce(
    (s, row) => s + row.totalPotentialMrrCents,
    0,
  );

  return {
    generatedAt: now.toISOString(),
    totalPotentialMrrCents,
    totalPotentialMrrLabel: formatAud(totalPotentialMrrCents),
    pricingSource: "catalogue",
    pricingNote:
      "Catalogue list prices for apps not installed — not Stripe revenue, not Growth MRR won.",
    summaries,
  };
}
