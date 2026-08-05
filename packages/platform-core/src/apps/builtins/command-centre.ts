import type { AppManifest } from "../manifest";

/**
 * DigitalGate Command Centre — internal-only App.
 * The operating system DigitalGate uses to run DigitalGate.
 * @see docs/COMMAND-CENTRE.md
 */
export const commandCentreApp: AppManifest = {
  id: "command-centre",
  name: "Command Centre",
  description:
    "DigitalGate internal intelligence — platform ops, client success, revenue, benchmarking",
  tier: "internal",
  visibility: "internal",
  version: "0.1.0",
  icon: "⬡",
  routes: [
    { path: "/command", label: "Platform Overview" },
    { path: "/command/clients", label: "Client Intelligence" },
    { path: "/command/clients/[orgId]", label: "Client Detail" },
    { path: "/command/platform-health", label: "Platform Health" },
    { path: "/command/revenue", label: "Revenue Intelligence" },
    { path: "/command/opportunities", label: "Opportunity Engine" },
    { path: "/command/benchmarks", label: "Benchmarking" },
    { path: "/command/reports", label: "Executive Reporting" },
    { path: "/command/support", label: "Support Centre" },
    { path: "/command/flags", label: "Feature Flags" },
    { path: "/command/audit", label: "Audit & Compliance" },
  ],
  navigation: [
    { href: "/command", label: "Overview", icon: "◈" },
    { href: "/command/clients", label: "Clients", icon: "☷" },
    { href: "/command/platform-health", label: "Platform Health", icon: "◉" },
    { href: "/command/revenue", label: "Revenue", icon: "▣" },
    { href: "/command/opportunities", label: "Opportunities", icon: "◎" },
    { href: "/command/reports", label: "Reports", icon: "▤" },
  ],
  permissions: [
    { id: "command.view", label: "View Command Centre" },
    { id: "command.clients.read", label: "View client intelligence" },
    { id: "command.platform.read", label: "View platform metrics" },
    { id: "command.revenue.read", label: "View revenue data" },
    { id: "command.flags.manage", label: "Manage feature flags" },
    { id: "command.audit.read", label: "View audit logs" },
  ],
  features: [
    "command.overview.read",
    "command.clients.read",
    "command.clients.advisor",
    "command.platform.read",
    "command.revenue.read",
    "command.opportunities.read",
    "command.benchmarks.read",
    "command.reports.generate",
    "command.support.read",
    "command.flags.manage",
    "command.audit.read",
    "command.beta.manage",
  ],
  entities: [
    "Organisation",
    "Membership",
    "AppInstallation",
    "ScoreResult",
    "BusinessInsight",
    "AuditLog",
  ],
  automationTriggers: [
    { id: "client.success_score.dropped", label: "Client Success Score dropped" },
    { id: "client.usage.low", label: "Low platform usage detected" },
    { id: "platform.health.degraded", label: "Platform health degraded" },
  ],
  automationActions: [
    { id: "command.notify_account_manager", label: "Notify account manager" },
    { id: "command.generate_executive_report", label: "Generate executive report" },
  ],
  aiTools: [
    {
      id: "command.client_advisor",
      label: "AI Business Advisor",
      description:
        "Natural-language analysis of client performance, trends, and recommendations",
    },
    {
      id: "command.executive_report",
      label: "Generate Growth Report",
      description: "AI-written monthly executive report for a client organisation",
    },
    {
      id: "command.upsell_recommend",
      label: "Recommend upsell opportunities",
      description: "Identify apps and services to recommend based on client gaps",
    },
  ],
  reports: [
    { id: "command.platform_overview", label: "Platform overview" },
    { id: "command.agency_health_ranking", label: "Agency health ranking" },
    { id: "command.client_growth_report", label: "DigitalGate Growth Report" },
    { id: "command.mrr_summary", label: "MRR / ARR summary" },
  ],
};
