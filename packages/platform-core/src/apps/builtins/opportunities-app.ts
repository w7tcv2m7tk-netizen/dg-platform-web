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
    "What matters next — ranked opportunities from CRM, Prospecting and other enabled business signals, with clear next-action links",
  tier: "core",
  version: "0.1.0",
  icon: "✦",
  routes: [
    { path: "/apps/opportunities", label: "All Opportunities" },
  ],
  navigation: [{ href: "/apps/opportunities", label: "Opportunities", icon: "✦" }],
  permissions: [
    { id: "opportunities.view", label: "View opportunities" },
  ],
  features: [
    "opportunities.list.read",
    "opportunities.score.read",
    "opportunities.actions.read",
  ],
  entities: ["Activity", "Lead", "Contact", "Task"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
