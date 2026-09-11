import type { AppManifest } from "../manifest";

/** Automation App — visibility and history for the platform's supported automated workflows. */
export const automationApp: AppManifest = {
  id: "automation",
  name: "Automation",
  description:
    "Supported automated workflows across DigitalGate, with rule visibility and run history",
  tier: "growth",
  version: "0.1.0",
  icon: "⚡",
  routes: [
    { path: "/apps/automation", label: "Overview" },
    { path: "/apps/automation/rules", label: "Rules" },
    { path: "/apps/automation/logs", label: "Run log" },
  ],
  navigation: [{ href: "/apps/automation", label: "Automation", icon: "⚡" }],
  permissions: [{ id: "automation.view", label: "View automations" }],
  features: ["automation.rules.read", "automation.logs.read"],
  entities: ["Activity", "Contact", "Lead"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
