/**
 * Side-panel visibility rules — locked with ROLES-PERMISSIONS-SIDEBAR.md
 * and SIDEBAR-NAVIGATION.md
 */
export const CUSTOMER_SIDE_PANEL_SECTIONS = [
  {
    id: "core",
    label: "Core",
    items: ["Business", "CRM", "Commerce", "Design Studio"],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    items: ["Domains", "DNS", "SSL", "Hosting", "Email", "Backups", "Cloudflare"],
  },
  {
    id: "industry",
    label: "Industry",
    items: ["Activated Industry Apps → Templates only"],
  },
  {
    id: "grow",
    label: "Growth",
    items: [
      "Prospecting",
      "AI Visibility",
      "SEO",
      "Automation",
      "Analytics",
      "Social",
      "Reputation",
      "AI Communications",
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      "Command Centre",
      "Digital Twin",
      "AI Advisor",
      "Business Health",
      "Insights",
      "Benchmarks",
      "Business Brain",
    ],
  },
  {
    id: "partners",
    label: "Partners",
    items: ["Resellers", "Referrals", "Commissions", "Delivery / Implementation"],
  },
  {
    id: "platformAdmin",
    label: "Platform Admin",
    items: [
      "Apps",
      "Marketplace",
      "Network",
      "Settings",
      "Roadmap",
      "Support",
      "Platform Docs",
    ],
  },
] as const;

/** Business Brain is intelligence infrastructure — listed under Intelligence, not Core. */
export const BUSINESS_BRAIN_NAV_POLICY =
  "Business Brain powers AI context and sits under Intelligence. Do not treat Brain as a primary Core destination." as const;

export const FEATURE_LIFECYCLE_STATUSES = [
  "planned",
  "architecture_reserved",
  "coming_soon",
  "developing",
  "early_access",
  "founding",
  "available",
  "deprecated",
] as const;

export type FeatureLifecycleStatus = (typeof FEATURE_LIFECYCLE_STATUSES)[number];
