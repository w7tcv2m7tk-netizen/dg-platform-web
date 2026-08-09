import type { AppManifest } from "../manifest";

/**
 * DigitalGate Command Centre — internal-only App.
 * The operating system DigitalGate uses to run DigitalGate.
 * @see docs/COMMAND-CENTRE.md
 * @see docs/COMMAND-CENTRE-BETA.md
 * @see docs/GROWTH-ENGINE.md
 */
export const commandCentreApp: AppManifest = {
  id: "command-centre",
  name: "Command Centre",
  description:
    "DigitalGate internal OS — platform ops, client success, Growth Engine acquisition, revenue",
  tier: "internal",
  visibility: "internal",
  version: "0.4.0",
  icon: "⬡",
  routes: [
    { path: "/command", label: "Platform Overview" },
    { path: "/command/clients", label: "Client Intelligence" },
    { path: "/command/clients/[orgId]", label: "Client Detail" },
    { path: "/command/platform-health", label: "Platform Health" },
    { path: "/command/revenue", label: "Revenue Intelligence" },
    { path: "/command/opportunities", label: "Client Expansion" },
    { path: "/command/benchmarks", label: "Benchmarking" },
    { path: "/command/reports", label: "Executive Dashboard" },
    { path: "/command/flags", label: "Feature Flags" },
    // Growth Engine™ — acquisition pipeline (internal)
    // /command/support and /command/audit redirect away — not listed (no fake UI)
    { path: "/command/growth-engine", label: "Growth Engine" },
    { path: "/command/growth-engine/discovery", label: "Business Discovery" },
    { path: "/command/growth-engine/audits", label: "AI Audit Engine" },
    { path: "/command/growth-engine/reports", label: "Opportunity Reports" },
    { path: "/command/growth-engine/pipeline", label: "Prospect Pipeline" },
    { path: "/command/growth-engine/follow-ups", label: "Smart Follow-Up" },
    { path: "/command/growth-engine/proposals", label: "Proposal Generator" },
    { path: "/command/growth-engine/conversions", label: "Conversion Dashboard" },
  ],
  navigation: [
    { href: "/command", label: "Overview", icon: "◈" },
    { href: "/command/clients", label: "Clients", icon: "☷" },
    { href: "/command/growth-engine", label: "Growth Engine", icon: "◎" },
    { href: "/command/platform-health", label: "Platform Health", icon: "◉" },
    { href: "/command/revenue", label: "Revenue", icon: "▣" },
    { href: "/command/opportunities", label: "Expansion", icon: "▤" },
    { href: "/command/reports", label: "Executive", icon: "▥" },
  ],
  permissions: [
    { id: "command.view", label: "View Command Centre" },
    { id: "command.clients.read", label: "View client intelligence" },
    { id: "command.platform.read", label: "View platform metrics" },
    { id: "command.revenue.read", label: "View revenue data" },
    { id: "command.growth.read", label: "View Growth Engine" },
    { id: "command.growth.manage", label: "Manage prospects and reports" },
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
    "command.growth.discovery",
    "command.growth.audit",
    "command.growth.reports",
    "command.growth.pipeline",
    "command.growth.follow_up",
    "command.growth.proposals",
    "command.growth.conversions",
    "command.growth.transition",
  ],
  entities: [
    "Organisation",
    "Membership",
    "AppInstallation",
    "ScoreResult",
    "BusinessInsight",
    "AuditLog",
    "Prospect",
    "ProspectAudit",
    "ProspectReport",
    "ProspectEngagement",
    "GrowthProposal",
  ],
  automationTriggers: [
    { id: "client.success_score.dropped", label: "Client Success Score dropped" },
    { id: "client.usage.low", label: "Low platform usage detected" },
    { id: "platform.health.degraded", label: "Platform health degraded" },
    { id: "prospect.report_sent", label: "Prospect report sent" },
    { id: "prospect.report_viewed", label: "Prospect report viewed" },
    { id: "prospect.report_not_opened", label: "Report not opened (idle)" },
    { id: "prospect.meeting_booked", label: "Prospect meeting booked" },
    { id: "prospect.proposal_accepted", label: "Prospect proposal accepted" },
  ],
  automationActions: [
    { id: "command.notify_account_manager", label: "Notify account manager" },
    { id: "command.generate_executive_report", label: "Generate executive report" },
    { id: "command.growth.send_reminder", label: "Send prospect report reminder" },
    { id: "command.growth.create_follow_up_task", label: "Create follow-up task" },
    { id: "command.growth.transition_client", label: "Convert prospect to client org" },
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
    {
      id: "command.growth.sales_assistant",
      label: "Call today (ranked list)",
      description:
        "Sales Assistant v0 — ranked call list from idle days, report views, and health. Not an autonomous AI SDR.",
    },
    {
      id: "command.growth.run_audit",
      label: "Run AI Audit",
      description: "Full digital presence audit for a prospect business",
    },
    {
      id: "command.growth.generate_report",
      label: "Generate Opportunity Report",
      description: "Branded interactive audit report for a prospect",
    },
    {
      id: "command.growth.generate_proposal",
      label: "Generate Proposal",
      description: "AI proposal with services, pricing, ROI, and timeline",
    },
  ],
  reports: [
    { id: "command.platform_overview", label: "Platform overview" },
    { id: "command.agency_health_ranking", label: "Agency health ranking" },
    { id: "command.client_growth_report", label: "DigitalGate Growth Report" },
    { id: "command.mrr_summary", label: "MRR / ARR summary" },
    { id: "command.growth.conversion_summary", label: "Growth Engine conversion summary" },
    { id: "command.growth.opportunity_report", label: "Prospect opportunity report" },
  ],
};
