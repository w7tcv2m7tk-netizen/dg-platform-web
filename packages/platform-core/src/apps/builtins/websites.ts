import type { AppManifest } from "../manifest";

export const websitesApp: AppManifest = {
  id: "websites",
  name: "Design Studio",
  description:
    "Websites, funnels, logos, content, and Health Centre",
  tier: "core",
  version: "0.1.0",
  icon: "🌐",
  routes: [
    {
      path: "/apps/websites",
      label: "Websites",
      matchAlso: ["/apps/websites/studio"],
    },
    { path: "/apps/websites/funnels", label: "Funnels" },
    { path: "/apps/websites/logo", label: "Brand" },
    { path: "/apps/websites/content", label: "Content" },
    { path: "/apps/websites/health", label: "Health" },
  ],
  navigation: [
    { href: "/apps/websites", label: "Design Studio", icon: "◫" },
  ],
  permissions: [
    { id: "websites.view", label: "View websites" },
    { id: "websites.manage", label: "Manage websites" },
    { id: "websites.publish", label: "Publish websites" },
    { id: "websites.content.create", label: "Create content" },
    { id: "websites.funnels.create", label: "Create funnels" },
  ],
  features: [
    "websites.health.read",
    "websites.studio.use",
    "websites.builder.use",
    "websites.content.draft",
    "websites.content.publish",
    "websites.funnels.create",
    "websites.developer.use",
    "websites.forms.manage",
    "websites.analytics.read",
  ],
  entities: ["Website", "WebsitePage", "Contact", "Lead", "Activity", "Campaign"],
  automationTriggers: [
    { id: "site.published", label: "Site published", objectType: "Document" },
    { id: "site.health_degraded", label: "Site health score dropped" },
    { id: "form.submitted", label: "Website form submitted", objectType: "Contact" },
    { id: "funnel.created", label: "Funnel created" },
  ],
  automationActions: [
    { id: "websites.run_health_scan", label: "Run site health scan" },
    { id: "websites.publish_page", label: "Publish page" },
    { id: "websites.create_funnel", label: "Create funnel from template" },
  ],
  aiTools: [
    {
      id: "websites.generate_site",
      label: "Generate website",
      description: "Design Studio — architecture, pages, copy, SEO",
    },
    {
      id: "websites.generate_content",
      label: "Generate content",
      description: "Blog, suburb page, service page, social post",
    },
    {
      id: "websites.generate_funnel",
      label: "Generate funnel",
      description: "Landing page + CRM pipeline + follow-up sequence",
    },
    {
      id: "websites.edit_with_ai",
      label: "Edit site with AI",
      description: "Natural language code/content changes with review",
    },
    {
      id: "websites.health_recommendations",
      label: "Site recommendations",
      description: "Proactive fixes and content suggestions",
    },
  ],
  reports: [
    { id: "websites.health_report", label: "Website Health Score™ report" },
    { id: "websites.performance_report", label: "Performance & Core Web Vitals" },
  ],
};
