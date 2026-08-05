import type { AppManifest } from "../manifest";

export const seoApp: AppManifest = {
  id: "seo",
  name: "SEO Engine",
  description: "On-page, technical, and local SEO — native, no Rank Math",
  tier: "growth",
  version: "1.0.0",
  icon: "🔍",
  routes: [{ path: "/apps/seo/audit", label: "Page audit" }],
  navigation: [{ href: "/apps/seo/audit", label: "SEO audit", icon: "⎔" }],
  permissions: [{ id: "seo.view_audit", label: "View SEO audits" }],
  features: ["seo.audit.read", "seo.audit.run", "seo.score.read"],
  entities: ["Document", "Activity"],
  automationTriggers: [
    { id: "seo.score_dropped", label: "SEO score dropped" },
  ],
  automationActions: [{ id: "seo.run_audit", label: "Run page audit" }],
  aiTools: [
    {
      id: "seo.optimise_page",
      label: "Optimise page content",
      description: "AI suggestions for on-page SEO",
    },
  ],
  reports: [{ id: "seo.score_report", label: "SEO Score™ report" }],
};

export const aiVisibilityApp: AppManifest = {
  id: "ai-visibility",
  name: "AI Visibility",
  description: "Track brand presence across AI platforms",
  tier: "growth",
  version: "1.0.0",
  icon: "✦",
  routes: [{ path: "/apps/ai-visibility", label: "Dashboard" }],
  navigation: [
    { href: "/apps/ai-visibility", label: "AI Visibility", icon: "✦" },
  ],
  permissions: [{ id: "ai_vis.view", label: "View AI visibility" }],
  features: ["ai_vis.score.read", "ai_vis.scan.run", "ai_vis.citations.read"],
  entities: ["Company", "Activity"],
  automationTriggers: [
    { id: "ai_vis.citation_found", label: "New AI citation detected" },
  ],
  automationActions: [
    { id: "ai_vis.run_scan", label: "Run visibility scan" },
  ],
  aiTools: [
    {
      id: "ai_vis.recommendations",
      label: "Visibility recommendations",
    },
  ],
  reports: [{ id: "ai_vis.score_report", label: "AI Visibility Score™" }],
};
