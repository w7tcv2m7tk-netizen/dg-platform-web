import type { AppManifest } from "../manifest";

export const advertisingApp: AppManifest = {
  id: "advertising",
  name: "Advertising",
  description: "Paid media performance, campaigns, attribution and optimisation across advertising channels",
  tier: "growth",
  version: "0.1.0",
  icon: "◎",
  routes: [{ path: "/apps/advertising", label: "Overview" }],
  navigation: [{ href: "/apps/advertising", label: "Advertising", icon: "◎" }],
  permissions: [
    { id: "advertising.view", label: "View advertising" },
    { id: "advertising.manage", label: "Manage advertising" },
  ],
  features: ["advertising.accounts.read","advertising.campaigns.read","advertising.performance.read","advertising.attribution.read"],
  entities: ["Campaign", "Lead", "Activity"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [{ id: "advertising.performance", label: "Advertising performance" }],
};
