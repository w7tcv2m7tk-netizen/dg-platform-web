import type { AppManifest } from "../manifest";

/**
 * Prospecting & Opportunity Engine — Growth App ($99/mo).
 *
 * Growth App surface = Business (B2B) Discovery + evidence, pipeline and reporting.
 * Consumer / property modes (Vendor, Buyer, …) use Industry App front ends
 * on the same underlying engine — see PROSPECTING-ENGINE.md.
 *
 * Do not bill Prospecting / Discovery / Opportunity Engine as separate SKUs.
 *
 * @see docs/foundations/PROSPECTING-ENGINE.md
 * @see docs/foundations/BUSINESS-DISCOVERY.md
 * @see docs/foundations/OPPORTUNITY-ENGINE.md
 */
export const prospectingApp: AppManifest = {
  id: "prospecting",
  name: "Prospecting & Opportunity Engine",
  description:
    "Discover businesses, collect real opportunity evidence, rank prospects, manage pipeline, activate into CRM, and share prospect reports — one $99/mo Growth App.",
  tier: "growth",
  version: "0.1.0",
  icon: "◎",
  routes: [
    { path: "/apps/prospecting", label: "Overview" },
    { path: "/apps/prospecting/discovery", label: "Business Discovery" },
    { path: "/apps/prospecting/scores", label: "Opportunities" },
    { path: "/apps/prospecting/prospects", label: "Prospects" },
    { path: "/apps/prospecting/pipeline", label: "Pipeline" },
    { path: "/apps/prospecting/reports", label: "Reports" },
    { path: "/apps/prospecting/activity", label: "Follow-up" },
  ],
  navigation: [
    {
      href: "/apps/prospecting",
      label: "Prospecting",
      icon: "◎",
    },
  ],
  permissions: [
    { id: "prospecting.view", label: "View prospects and pipeline" },
    { id: "prospecting.discover", label: "Run discovery and import prospects" },
    { id: "prospecting.score", label: "View opportunity scores" },
    { id: "prospecting.pipeline", label: "Manage prospecting pipeline" },
    { id: "prospecting.convert", label: "Convert prospects to CRM" },
  ],
  features: [
    "prospecting.prospects.read",
    "prospecting.prospects.write",
    "prospecting.discovery.run",
    "prospecting.pipeline.read",
    "prospecting.pipeline.write",
    "prospecting.scores.read",
    "prospecting.activity.read",
    "prospecting.presence.read",
    "prospecting.convert",
  ],
  entities: ["Contact", "Company", "Lead", "Opportunity", "Activity", "Task"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [{ id: "prospecting.opportunity_reports", label: "Prospect opportunity reports" }],
};
