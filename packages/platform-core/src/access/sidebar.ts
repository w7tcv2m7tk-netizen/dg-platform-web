/**
 * Side-panel visibility rules — locked with ROLES-PERMISSIONS-SIDEBAR.md
 */
export const CUSTOMER_SIDE_PANEL_SECTIONS = [
  {
    id: "business",
    label: "Business",
    items: ["Overview", "Business Profile", "Digital Twin", "Goals", "Team"],
  },
  {
    id: "operate",
    label: "Operate",
    items: ["CRM", "Commerce", "Design Studio", "Infrastructure"],
  },
  {
    id: "industry",
    label: "Industry",
    items: ["Activated Industry Apps → Templates"],
  },
  {
    id: "grow",
    label: "Grow",
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
      "Priorities",
      "Recommended Actions",
      "Alerts",
      "Sales Week",
      "AI Advisor",
      "Business Health",
      "Insights",
      "Benchmarks",
      "Reports",
    ],
  },
  {
    id: "ecosystem",
    label: "Ecosystem",
    items: ["Apps", "Marketplace", "Network", "Refer & Earn"],
  },
  {
    id: "settings",
    label: "Settings",
    items: ["Overview", "Billing", "Connectors", "API", "Audit Log", "Users"],
  },
] as const;

/** Business Brain is infrastructure — not a hero Business nav item. */
export const BUSINESS_BRAIN_NAV_POLICY =
  "Business Brain powers AI context. Prefer Knowledge Base / Business Knowledge for customer-facing nav; do not treat Brain as a primary Business destination." as const;

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
