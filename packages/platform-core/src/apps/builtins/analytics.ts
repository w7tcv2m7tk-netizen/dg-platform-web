import type { AppManifest } from "../manifest";

export const analyticsApp: AppManifest = {
  id: "analytics",
  name: "Analytics",
  description:
    "Cross-channel KPIs, trend reports, and connector-fed metrics — Analytics Pro on Gen 2",
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
  automationTriggers: [
    { id: "analytics.metric.threshold", label: "KPI crossed threshold" },
    { id: "analytics.report.ready", label: "Scheduled report ready" },
  ],
  automationActions: [
    { id: "analytics.send_report", label: "Email report snapshot" },
  ],
  aiTools: [
    {
      id: "analytics.insights",
      label: "Explain metric change",
      description: "AI narrative for week-over-week KPI movement",
    },
  ],
  reports: [
    { id: "analytics.kpi_snapshot", label: "KPI snapshot" },
    { id: "analytics.channel_mix", label: "Channel performance" },
  ],
};
