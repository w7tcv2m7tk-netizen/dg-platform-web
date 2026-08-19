import type { OrganisationBusinessProfile } from "../org/business-profile-types";
import type { OverviewConnectorProbes } from "./connector-probes";
import type { OverviewGrowthOpportunity } from "./types";
import type { ScoreResult } from "../scoring/types";

export interface BuildOpportunitiesInput {
  enabledAppIds: string[];
  scores?: ScoreResult[];
  businessProfile?: OrganisationBusinessProfile | null;
  connectorProbes?: OverviewConnectorProbes;
  setupPercent?: number;
}

/** Score-aware growth opportunities for Overview — targets demo "17 opportunities" narrative. */
export function buildGrowthOpportunities(input: BuildOpportunitiesInput): {
  items: OverviewGrowthOpportunity[];
  totalCount: number;
} {
  const { enabledAppIds, scores, businessProfile, connectorProbes, setupPercent = 0 } =
    input;

  const score = (id: string) => scores?.find((s) => s.scoreId === id)?.value ?? 100;
  const items: OverviewGrowthOpportunity[] = [];

  const aiVis = score("ai_visibility");
  if (aiVis < 85) {
    items.push({
      id: "ai-vis-score",
      label: "Improve AI Visibility Score",
      status: `${aiVis}/100`,
      impact: `Potential +${Math.min(17, 85 - aiVis)}%`,
      href: "/apps/ai-visibility",
    });
  }

  if (!enabledAppIds.includes("ai-visibility")) {
    items.push({
      id: "ai-vis-app",
      label: "Enable AI Visibility Pro",
      status: "Not enabled",
      impact: "Potential +17%",
      href: "/dashboard/apps",
    });
  }

  const seo = score("seo");
  if (seo < 80) {
    items.push({
      id: "seo-score",
      label: "Boost SEO score",
      status: `${seo}/100`,
      impact: "Potential +12%",
      href: "/apps/seo",
    });
  }

  if (!connectorProbes?.website?.ok) {
    items.push({
      id: "connect-website",
      label: "Connect website health probe",
      status: "Not connected",
      impact: "Unlock live scores",
      href: "/apps/websites/health",
    });
  }

  if (!businessProfile?.websiteUrl?.trim()) {
    items.push({
      id: "profile-website",
      label: "Add website to Business Profile",
      status: "Missing",
      impact: "+4 AI Visibility",
      href: "/dashboard/business",
    });
  }

  if (!businessProfile?.social?.googleBusiness?.trim()) {
    items.push({
      id: "profile-gbp",
      label: "Add Google Business Profile",
      status: "Missing",
      impact: "+6 AI Visibility",
      href: "/dashboard/business",
    });
  }

  if (setupPercent < 100) {
    items.push({
      id: "setup-complete",
      label: "Complete platform setup",
      status: `${setupPercent}% done`,
      impact: "Unlock live KPIs",
      href: "/dashboard",
    });
  }

  if (!enabledAppIds.includes("reviews")) {
    items.push({
      id: "reviews-auto",
      label: "Enable Reputation",
      status: "Not enabled",
      impact: "Monitor & request reviews",
      href: "/dashboard/apps",
    });
  }

  items.push({
    id: "web-opt",
    label: "Website Optimisation",
    status: connectorProbes?.website?.ok ? "Available" : "Connect first",
    impact: "Potential +11%",
    href: "/apps/websites/health",
  });

  if (!enabledAppIds.includes("marketing")) {
    items.push({
      id: "mkt-auto",
      label: "Marketing Automation",
      status: "Recommended",
      impact: "Increase reach",
      href: "/apps/marketing",
    });
  }

  if (!enabledAppIds.includes("seo")) {
    items.push({
      id: "seo-app",
      label: "Enable SEO Pro",
      status: "Not enabled",
      impact: "Potential +10%",
      href: "/dashboard/apps",
    });
  }

  const automation = score("automation");
  if (automation < 70) {
    items.push({
      id: "automation-score",
      label: "Automate follow-ups",
      status: `${automation}/100`,
      impact: "Save 5+ hrs/week",
      href: "/apps/automation",
    });
  }

  if (
    connectorProbes?.wordpress?.configured &&
    !connectorProbes.wordpress.ok &&
    enabledAppIds.includes("real-estate")
  ) {
    items.push({
      id: "wp-sync",
      label: "Sync WordPress vendor leads",
      status: "Not connected",
      impact: "Live pipeline data",
      href: "/dashboard/settings/connectors",
    });
  }

  return {
    items: items.slice(0, 12),
    totalCount: items.length,
  };
}
