import type { AppManifest } from "../manifest";

/**
 * Prospecting & Opportunity Engine — Growth App ($99/mo).
 *
 * Growth App surface = Business (B2B) Discovery + pipeline/scoring.
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
    "Find the right businesses. Understand their situation. Score the opportunity. Activate into CRM. Know what to do next — one $99/mo Growth App.",
  tier: "growth",
  version: "0.1.0",
  icon: "◎",
  routes: [
    { path: "/apps/prospecting", label: "Overview" },
    { path: "/apps/prospecting/prospects", label: "Prospects" },
    { path: "/apps/prospecting/discovery", label: "Business Discovery" },
    { path: "/apps/prospecting/pipeline", label: "Pipeline" },
    { path: "/apps/prospecting/activity", label: "Activity" },
    { path: "/apps/prospecting/scores", label: "Opportunity scores" },
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
    "prospecting.ai.recommend",
  ],
  entities: ["Contact", "Company", "Lead", "Opportunity", "Activity", "Task"],
  automationTriggers: [
    { id: "prospect.imported", label: "Prospect imported", objectType: "Lead" },
    { id: "prospect.scored_high", label: "High opportunity score", objectType: "Lead" },
    { id: "prospect.qualified", label: "Prospect qualified", objectType: "Lead" },
    { id: "prospect.converted", label: "Prospect converted to CRM", objectType: "Contact" },
  ],
  automationActions: [
    { id: "prospecting.create_task", label: "Create follow-up task" },
    { id: "prospecting.notify_owner", label: "Notify owner" },
    { id: "prospecting.promote_crm", label: "Promote to CRM Contact / Opportunity" },
  ],
  aiTools: [
    {
      id: "prospecting.recommend_next",
      label: "Recommend next action",
      description: "Who to contact and what to do next from score + pipeline",
    },
    {
      id: "prospecting.explain_score",
      label: "Explain opportunity score",
      description: "Fit × Need × Reachability × Commercial × Weakness",
    },
  ],
  reports: [
    { id: "prospecting.pipeline_summary", label: "Pipeline summary" },
    { id: "prospecting.daily_briefing", label: "Daily opportunity briefing" },
  ],
};
