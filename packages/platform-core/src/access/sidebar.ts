/**
 * Side-panel visibility rules — locked with ROLES-PERMISSIONS-SIDEBAR.md
 * and SIDEBAR-NAVIGATION.md
 *
 * Customer pillars: CORE · INDUSTRY · GROWTH · PLATFORM
 * Staff also see DIGITALGATE (Platform Operator).
 */
export const CUSTOMER_SIDE_PANEL_SECTIONS = [
  {
    id: "core",
    label: "Core",
    items: [
      "Business",
      "CRM",
      "Communications",
      "Documents",
      "Commerce",
      "Design Studio",
      "Infrastructure",
      "Intelligence",
    ],
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
      "Prospecting & Opportunity Engine",
      "AI Visibility",
      "SEO",
      "Automation",
      "Analytics",
      "Social",
      "Reputation",
    ],
  },
  {
    id: "platformAdmin",
    label: "Platform",
    items: [
      "Apps (Installed · Catalogue · Beta)",
      "Marketplace (discover Industry · Growth · Integrations · Services · Partners — not Core)",
      "Network — customers: Overview · Referrals · Refer & Earn · Connections",
      "Network — DigitalGate staff: Overview · Organisations · Partners · Resellers · Referrals · Commissions · Ecosystem · Programme Settings",
      "Settings",
      "Support (trailing)",
    ],
  },
] as const;

/** Platform Docs = how DigitalGate works — staff DigitalGate section only, not customer Platform. */
export const PLATFORM_DOCS_NAV_POLICY =
  "Platform Docs live under DIGITALGATE (Platform Operator), not customer Platform. Business Knowledge lives under Business Brain." as const;

/** Business Brain is a supporting intelligence layer — reachable from Intelligence Overview, not a Core sidebar destination. */
export const BUSINESS_BRAIN_NAV_POLICY =
  "Business Brain powers AI context under CORE → Intelligence. Do not list Brain as its own sidebar app." as const;

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
