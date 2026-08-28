import type { AppManifest } from "../manifest";

/**
 * DigitalGate Command Centre — internal-only App.
 * Cockpit for priorities and orchestrated Opportunities (Core Opportunity Engine™).
 * @see docs/COMMAND-CENTRE.md
 * @see docs/foundations/OPPORTUNITY-ENGINE.md
 */
export const commandCentreApp: AppManifest = {
  id: "command-centre",
  name: "Command Centre",
  description:
    "DigitalGate cockpit — Priorities, AI Advisor, Alerts, and recommended actions",
  tier: "internal",
  visibility: "internal",
  version: "0.9.0",
  icon: "◈",
  routes: [
    { path: "/command", label: "Priorities" },
    { path: "/command/opportunities", label: "Opportunities" },
    { path: "/command/opportunities/expansion", label: "Expansion" },
    { path: "/command/growth-engine", label: "Growth Engine™" },
    { path: "/command/advisor", label: "Recommended Actions" },
    { path: "/command/platform-health", label: "Platform Alerts" },
    { path: "/command/partners", label: "Partners" },
    { path: "/command/partners/acquisition", label: "Acquisition Partners" },
    { path: "/command/delivery", label: "Delivery Partners" },
    { path: "/command/referrals", label: "Referrals" },
    { path: "/command/commissions", label: "Commissions" },
    { path: "/command/clients", label: "Portfolio" },
    { path: "/command/clients/[orgId]", label: "Customer detail" },
    { path: "/apps/prospecting/discovery", label: "Business Discovery" },
    { path: "/command/growth-engine/pipeline", label: "Prospect Pipeline" },
    { path: "/command/growth-engine/audits", label: "AI Audits" },
    { path: "/command/growth-engine/reports", label: "Prospect Reports" },
    { path: "/command/growth-engine/follow-ups", label: "Smart Follow-Up" },
    { path: "/command/growth-engine/proposals", label: "Proposals" },
    { path: "/command/growth-engine/conversions", label: "Conversions" },
    { path: "/command/reports", label: "Reports" },
    { path: "/command/revenue", label: "Revenue" },
    { path: "/command/benchmarks", label: "Benchmarks" },
    { path: "/command/flags", label: "Feature Flags" },
    { path: "/command/docs", label: "Platform docs" },
    { path: "/command/docs/[slug]", label: "Platform doc" },
    { path: "/command/intelligence", label: "Platform Intelligence" },
  ],
  /**
   * Sidebar cockpit — Core owns Opportunities module; Command Centre orchestrates.
   * Prospecting children stay on Growth Engine pages (not competing top-level destinations).
   * Platform docs is staff architecture/SSOT — not the client “what next” loop.
   */
  navigation: [
    { href: "/command", label: "Priorities", icon: "◈" },
    { href: "/command/advisor", label: "AI Advisor", icon: "◎" },
    { href: "/command/platform-health", label: "Alerts", icon: "◉" },
  ],
  permissions: [
    { id: "command.view", label: "View Command Centre" },
    { id: "command.clients.read", label: "View client intelligence" },
    { id: "command.platform.read", label: "View platform metrics" },
    { id: "command.revenue.read", label: "View revenue data" },
    { id: "command.growth.read", label: "View Growth Engine" },
    { id: "command.growth.manage", label: "Manage prospects and reports" },
    { id: "command.flags.manage", label: "Manage feature flags" },
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
    "command.flags.manage",
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
      id: "command.platform_intelligence",
      label: "Platform Intelligence",
      description:
        "Staff RAG over curated platform docs with citations and confidence (Phase 1)",
    },
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
