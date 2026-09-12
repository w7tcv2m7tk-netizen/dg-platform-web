import type { AppManifest } from "../manifest";

export const seoApp: AppManifest = {
  id: "seo",
  name: "SEO",
  description: "Live HTML presence probes + Studio on-page checks — shared with AI Visibility",
  tier: "growth",
  version: "1.1.0",
  icon: "🔍",
  routes: [
    { path: "/apps/seo", label: "Overview" },
    { path: "/apps/seo/audit", label: "Page audit" },
  ],
  navigation: [{ href: "/apps/seo", label: "SEO", icon: "⎔" }],
  permissions: [{ id: "seo.view_audit", label: "View SEO audits" }],
  features: [
    "seo.audit.read",
    "seo.audit.run",
    "seo.score.read",
    "seo.metadata.fix",
  ],
  entities: ["Document", "Activity"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};

export const aiVisibilityApp: AppManifest = {
  id: "ai-visibility",
  name: "AI Visibility",
  description:
    "Website readiness for AI answer engines using verified schema, Open Graph and technical website signals",
  tier: "growth",
  version: "1.1.0",
  icon: "✦",
  routes: [{ path: "/apps/ai-visibility", label: "Dashboard" }],
  navigation: [
    { href: "/apps/ai-visibility", label: "AI Visibility", icon: "✦" },
  ],
  permissions: [{ id: "ai_vis.view", label: "View AI visibility" }],
  features: ["ai_vis.score.read", "ai_vis.scan.run"],
  entities: ["Company", "Activity"],
  automationTriggers: [],
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
