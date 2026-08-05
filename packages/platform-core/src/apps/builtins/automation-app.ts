import type { AppManifest } from "../manifest";

/** Automation App — builder UI over the platform automation engine (platform-core). */
export const automationApp: AppManifest = {
  id: "automation",
  name: "Automation",
  description:
    "Visual trigger → action rules across every App — payments, leads, campaigns, and more",
  tier: "growth",
  version: "0.1.0",
  icon: "⚡",
  routes: [
    { path: "/apps/automation", label: "Builder" },
    { path: "/apps/automation/rules", label: "Rules" },
    { path: "/apps/automation/logs", label: "Run log" },
  ],
  navigation: [{ href: "/apps/automation", label: "Automation", icon: "⚡" }],
  permissions: [
    { id: "automation.view", label: "View automations" },
    { id: "automation.manage", label: "Create and edit rules" },
  ],
  features: ["automation.rules.read", "automation.rules.write", "automation.logs.read"],
  entities: ["Activity", "Contact", "Lead"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [
    {
      id: "automation.suggest_rule",
      label: "Suggest automation",
      description: "Recommend trigger → action rules from business patterns",
    },
  ],
  reports: [{ id: "automation.runs", label: "Automation run summary" }],
};
