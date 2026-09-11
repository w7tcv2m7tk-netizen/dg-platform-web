import type { AppManifest } from "../manifest";

export const analyticsApp: AppManifest = {
  id: "analytics",
  name: "Analytics",
  description:
    "Explore the numbers behind your business — KPIs, dashboards, reports and connected data sources.",
  tier: "growth",
  version: "0.1.0",
  icon: "▥",
  routes: [
    { path: "/apps/analytics", label: "Overview" },
    { path: "/apps/analytics/dashboard", label: "Dashboard" },
    { path: "/apps/analytics/reports", label: "Reports" },
    { path: "/apps/analytics/connectors", label: "Data sources" },
  ],
  navigation: [{ href: "/apps/analytics", label: "Analytics", icon: "▥" }],
  permissions: [
    { id: "analytics.view", label: "View analytics" },
    { id: "analytics.export", label: "Export reports" },
  ],
  features: [
    "analytics.dashboard.read",
    "analytics.reports.read",
    "analytics.connectors.read",
    "analytics.snapshots.read",
  ],
  entities: ["Activity", "Campaign", "Document"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [{ id: "analytics.business_performance", label: "Business Performance Report" }],
};
