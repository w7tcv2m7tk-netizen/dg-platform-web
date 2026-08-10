import type { AppManifest } from "../manifest";

/**
 * Opportunities — Core customer-facing surface for DigitalGate Opportunity Engine™.
 * Command Centre orchestrates the same signals for staff; this App is the tenant module.
 * @see docs/foundations/OPPORTUNITY-ENGINE.md
 */
export const opportunitiesApp: AppManifest = {
  id: "opportunities",
  name: "Opportunities",
  description:
    "What matters next — ranked opportunities from CRM, scores, connectors, and ops signals",
  tier: "core",
  version: "0.1.0",
  icon: "✦",
  routes: [
    { path: "/apps/opportunities", label: "All Opportunities" },
  ],
  navigation: [{ href: "/apps/opportunities", label: "Opportunities", icon: "✦" }],
  permissions: [
    { id: "opportunities.view", label: "View opportunities" },
    { id: "opportunities.act", label: "Act on recommended actions" },
  ],
  features: [
    "opportunities.list.read",
    "opportunities.score.read",
    "opportunities.actions.read",
  ],
  entities: ["Activity", "Lead", "Contact", "Task"],
  automationTriggers: [
    { id: "opportunity.detected", label: "Opportunity detected" },
    { id: "opportunity.score_high", label: "High-score opportunity" },
  ],
  automationActions: [
    { id: "opportunities.create_task", label: "Create task from opportunity" },
    { id: "opportunities.notify", label: "Notify owner" },
  ],
  aiTools: [
    {
      id: "opportunities.explain",
      label: "Explain opportunity",
      description: "Why DigitalGate surfaced this and what to do next",
    },
  ],
  reports: [{ id: "opportunities.daily", label: "Daily opportunities summary" }],
};
