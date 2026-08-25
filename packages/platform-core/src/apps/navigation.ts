import type { AppNavItem, AppRoute, AppTier, RegisteredApp } from "./manifest";
import { commandCentreApp } from "./builtins/command-centre";
import { SETTINGS_NAV_ROUTES } from "./platform-tools";
import {
  APP_TIER_LABELS,
  APP_TIER_ORDER,
  isAppEnabled,
  isFoundingCustomerMode,
} from "./org-apps";
import { platformApps } from "./registry";
import { getSidebarIcon } from "./sidebar-icons";
import {
  INDUSTRY_PLATFORMS,
  resolveIndustryFromAppId,
  resolveIndustrySpecialisation,
  type IndustryPlatform,
  type IndustrySpecialisation,
} from "../industry/platform";

export interface PlatformShellNavItem extends AppNavItem {
  kind: "shell";
  /** When set, Settings (and similar) render as a collapsible group. */
  routes?: AppRoute[];
}

export interface AppNavTreeItem {
  kind: "app";
  id: string;
  name: string;
  icon: string;
  tier: AppTier;
  enabled: boolean;
  routes: AppRoute[];
  primaryHref: string;
}

export interface AppNavTierGroup {
  tier: AppTier;
  label: string;
  apps: AppNavTreeItem[];
}

export interface PlatformToolsNavGroup {
  label: string;
  tools: PlatformToolNavItem[];
}

export interface PlatformToolNavItem {
  kind: "tool";
  id: string;
  name: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
}

/** Advisor IA section ids — Core · Infrastructure · Industry · Growth · Intelligence · DigitalGate · Platform */
export type NavIaSectionId =
  | "core"
  | "infrastructure"
  | "industry"
  | "grow"
  | "intelligence"
  | "digitalgate"
  | "partners"
  | "partner"
  | "platformAdmin"
  /** @deprecated Prefer core */
  | "business"
  /** @deprecated Prefer core */
  | "operate"
  /** @deprecated Prefer platformAdmin */
  | "ecosystem";

export interface NavIaShellLink extends PlatformShellNavItem {
  section: NavIaSectionId;
}

export interface NavIaSection {
  id: NavIaSectionId;
  label: string;
  /** Optional muted line under the section label (e.g. Platform Operator). */
  sublabel?: string;
  /** Flat shell links in this section */
  links: PlatformShellNavItem[];
  /** Collapsible installed apps in this section */
  apps: AppNavTreeItem[];
  /** Optional links rendered after apps (e.g. Platform Admin: Settings then Roadmap/Support/Docs) */
  trailingLinks?: PlatformShellNavItem[];
}

/**
 * Core — universal operating layer (profile + CRM / Commerce / Design Studio).
 * Infrastructure is its own top-level section.
 */
const CORE_APP_ORDER = ["crm", "communications", "documents", "commerce", "websites"] as const;

/**
 * Industry — Industry Apps (activate Templates). Module ids map into Industry Platforms.
 * @see packages/platform-core/src/industry/platform.ts
 */
const INDUSTRY_APP_ORDER = [
  "real-estate",
  "property-management",
  "commercial",
  "accommodation",
  "services",
  "finance",
  "automotive",
  "creator",
] as const;

/**
 * Growth — optional paid Apps (except Reputation = Free).
 * Order matches public pricing: Prospecting $99 · AI Visibility $99 · SEO $99 ·
 * Automation $49 · Analytics $49 · Social $79 · AI Communications $99 · Reputation Free.
 * Prospecting & Opportunity Engine is one $99 SKU (not separate Prospecting/Discovery/OE charges).
 * CRM Opportunities remains the canonical deal object; Core Opportunities App is
 * operating-intelligence rankings (not a second pipeline).
 */
const GROW_APP_ORDER = [
  "prospecting",
  "ai-visibility",
  "seo",
  "automation",
  "analytics",
  "social",
  "ai-communications",
  "reviews",
] as const;

/** Hidden from sidebar IA — marketing undecided; opportunities live in CRM; AI Communications nests under Core Communications → AI */
const SIDEBAR_HIDDEN_APP_IDS = new Set([
  "marketing",
  "opportunities",
  "ai-communications",
]);

const CORE_APP_IDS = new Set<string>(CORE_APP_ORDER);
const INDUSTRY_APP_IDS = new Set<string>(INDUSTRY_APP_ORDER);
const GROW_APP_IDS = new Set<string>(GROW_APP_ORDER);
const INFRASTRUCTURE_APP_IDS = new Set<string>(["infrastructure"]);

/** Sidebar display overlays — canonical homes without inventing new routes. */
const SIDEBAR_APP_DISPLAY: Record<string, { name?: string; routes?: AppRoute[] }> = {
  websites: {
    name: "Design Studio",
    routes: [
      { path: "/apps/websites", label: "Websites", matchAlso: ["/apps/websites/studio"] },
      { path: "/apps/websites/funnels", label: "Funnels" },
      { path: "/apps/websites/content", label: "Content" },
      { path: "/apps/websites/logo", label: "Brand" },
      { path: "/apps/websites/health", label: "Health" },
    ],
  },
  commerce: {
    routes: [
      { path: "/apps/commerce", label: "Overview" },
      { path: "/apps/commerce/products", label: "Products" },
      { path: "/apps/commerce/quotes", label: "Quotes" },
      { path: "/apps/commerce/invoices", label: "Invoices" },
      { path: "/apps/commerce/payments", label: "Payments" },
      { path: "/apps/commerce/subscriptions", label: "Subscriptions" },
      { path: "/apps/commerce/reports", label: "Reports" },
    ],
  },
  crm: {
    routes: [
      { path: "/apps/crm/contacts", label: "Contacts" },
      { path: "/apps/crm/companies", label: "Companies" },
      { path: "/apps/crm/opportunities", label: "Opportunities" },
      { path: "/apps/crm/consultations", label: "Consultations" },
      { path: "/apps/crm/tasks", label: "Tasks" },
      { path: "/apps/crm/timeline", label: "Timeline" },
    ],
  },
  documents: {
    name: "Documents",
    routes: [
      { path: "/apps/documents/library", label: "Library" },
      { path: "/apps/documents/signing", label: "Signing" },
      { path: "/apps/documents/templates", label: "Templates" },
    ],
  },
  communications: {
    name: "Communications",
    routes: [
      // Channels first · AI Conversations hub · no separate Growth AI Communications silo.
      { path: "/apps/communications/inbox", label: "Inbox" },
      {
        path: "/apps/communications/email",
        label: "Email",
        matchAlso: [
          "/apps/communications/compose",
          "/apps/communications/sent",
          "/apps/communications/scheduled",
          "/apps/communications/mailboxes",
        ],
      },
      { path: "/apps/communications/sms", label: "SMS" },
      { path: "/apps/communications/calls", label: "Calls" },
      {
        path: "/apps/ai-communications/inbox",
        label: "AI Conversations",
        matchAlso: [
          "/apps/communications/ai",
          "/apps/ai-communications/voice",
          "/apps/ai-communications/call-centre",
          "/apps/ai-communications/agents",
          "/apps/ai-communications/knowledge",
          "/apps/ai-communications/settings",
        ],
      },
      { path: "/apps/communications/outreach", label: "Outreach" },
      { path: "/apps/communications/templates", label: "Templates" },
      { path: "/apps/communications/signatures", label: "Signatures" },
    ],
  },
  "real-estate": {
    name: "Real Estate",
    routes: [
      { path: "/apps/re", label: "Overview" },
      { path: "/apps/re/vendor-prospecting", label: "Vendor Prospecting" },
      { path: "/apps/re/vendor-leads", label: "Vendors" },
      { path: "/apps/re/buyer-leads", label: "Buyers" },
      { path: "/apps/re/properties", label: "Properties" },
      { path: "/apps/re/listings", label: "Listings" },
      { path: "/apps/re/bookings", label: "Appraisals" },
      { path: "/apps/re/settlements", label: "Settlements" },
    ],
  },
  seo: {
    name: "SEO",
    routes: [
      { path: "/apps/seo", label: "Overview" },
      { path: "/apps/seo/audit", label: "Page Audit" },
    ],
  },
  social: {
    name: "Social",
    routes: [
      { path: "/apps/social", label: "Overview" },
      { path: "/apps/social/compose", label: "Compose" },
      { path: "/apps/social/calendar", label: "Content Calendar" },
      { path: "/apps/social/accounts", label: "Connected Accounts" },
    ],
  },
  automation: {
    name: "Automation",
    routes: [
      { path: "/apps/automation", label: "Builder" },
      { path: "/apps/automation/rules", label: "Rules" },
      { path: "/apps/automation/logs", label: "Run Log" },
    ],
  },
  analytics: {
    name: "Analytics",
    routes: [
      { path: "/apps/analytics", label: "Overview" },
      { path: "/apps/analytics/dashboard", label: "Dashboard" },
      { path: "/apps/analytics/reports", label: "Reports" },
      { path: "/apps/analytics/connectors", label: "Data Sources" },
    ],
  },
  reviews: {
    name: "Reputation",
    routes: [
      { path: "/apps/reviews", label: "Overview" },
      { path: "/apps/reviews/inbox", label: "Review Inbox" },
      { path: "/apps/reviews/sources", label: "Sources" },
      { path: "/apps/reviews/requests", label: "Review Requests" },
      { path: "/apps/reviews/reputation", label: "Reputation Score™" },
    ],
  },
  "ai-communications": {
    name: "AI Communications",
    routes: [
      { path: "/apps/ai-communications/inbox", label: "Inbox" },
      { path: "/apps/ai-communications/voice", label: "Voice Agents" },
      { path: "/apps/ai-communications/call-centre", label: "Call Centre" },
      { path: "/apps/ai-communications/agents", label: "Agent Builder" },
      { path: "/apps/ai-communications/knowledge", label: "Knowledge Base" },
      { path: "/apps/ai-communications/settings", label: "Settings" },
    ],
  },
  "ai-visibility": { name: "AI Visibility" },
  infrastructure: {
    name: "Infrastructure",
    routes: [
      { path: "/apps/infrastructure/domains", label: "Domains" },
      { path: "/apps/infrastructure/dns", label: "DNS" },
      { path: "/apps/infrastructure/ssl", label: "SSL" },
      { path: "/apps/infrastructure/hosting", label: "Hosting" },
      { path: "/apps/infrastructure/email", label: "Email" },
      { path: "/apps/infrastructure/backup", label: "Backups" },
      { path: "/apps/infrastructure/cloudflare", label: "Cloudflare" },
    ],
  },
};

function businessNavItem(foundingCustomerMode: boolean): AppNavTreeItem {
  return {
    kind: "app",
    id: "business",
    name: "Business",
    icon: getSidebarIcon("business-profile"),
    tier: "core",
    enabled: true,
    routes: [
      { path: "/dashboard", label: "Overview" },
      { path: "/dashboard/business", label: "Business Profile" },
      { path: "/dashboard/goals", label: "Goals" },
      { path: "/dashboard/settings/team", label: "Team" },
    ],
    primaryHref: "/dashboard",
  };
}

/** CORE · Business — who you are (Twin lives under Intelligence). */
const BUSINESS_NAV_ITEM = businessNavItem(false);

/** @deprecated Prefer BUSINESS_NAV_ITEM under Core apps */
const CORE_LINKS: PlatformShellNavItem[] = BUSINESS_NAV_ITEM.routes.map((route) => ({
  kind: "shell" as const,
  href: route.path,
  label: route.label,
  icon: getSidebarIcon(
    route.path.includes("business")
      ? "business-profile"
      : route.path.includes("goals")
        ? "goals"
        : route.path.includes("team")
          ? "team"
          : "overview",
  ),
}));

/**
 * INTELLIGENCE — decision surfaces (not a shop of apps).
 * Command Centre (staff) is injected as a collapsible app at the top of this section.
 */
const INTELLIGENCE_LINKS: PlatformShellNavItem[] = [
  {
    kind: "shell",
    href: "/dashboard/advisor",
    label: "AI Advisor",
    icon: getSidebarIcon("advisor"),
  },
  {
    kind: "shell",
    href: "/dashboard/twin",
    label: "Digital Twin",
    icon: getSidebarIcon("twin"),
  },
  {
    kind: "shell",
    href: "/dashboard/brain",
    label: "Business Brain",
    icon: getSidebarIcon("brain"),
  },
  {
    kind: "shell",
    href: "/dashboard/health",
    label: "Business Health",
    icon: getSidebarIcon("health"),
  },
  {
    kind: "shell",
    href: "/dashboard/benchmarks",
    label: "Benchmarks",
    icon: getSidebarIcon("benchmarks"),
  },
  {
    kind: "shell",
    href: "/dashboard/insights",
    label: "Insights",
    icon: getSidebarIcon("analytics"),
  },
  {
    kind: "shell",
    href: "/dashboard/reports",
    label: "Reports",
    icon: getSidebarIcon("reports"),
  },
];

/** PLATFORM ADMIN — customer org config. Staff use PLATFORM_CONFIG + DIGITALGATE operator sections. */
function getPlatformAdminSection(options?: {
  showCommandCentre?: boolean;
  foundingCustomerMode?: boolean;
}): NavIaSection {
  const settingsItem: AppNavTreeItem = {
    kind: "app",
    id: "platform-settings",
    name: "Settings",
    icon: getSidebarIcon("settings"),
    tier: "internal",
    enabled: true,
    routes: [
      { path: "/dashboard/settings", label: "Overview" },
      { path: "/dashboard/settings/appearance", label: "Appearance" },
      { path: "/dashboard/settings/billing", label: "Billing" },
      { path: "/dashboard/settings/connected-services", label: "Connected Services" },
      { path: "/dashboard/settings/connectors", label: "Connectors" },
      { path: "/dashboard/settings/api", label: "API" },
      { path: "/dashboard/settings/audit", label: "Audit Log" },
    ],
    primaryHref: "/dashboard/settings",
  };

  const links: PlatformShellNavItem[] = options?.foundingCustomerMode
    ? [
        {
          kind: "shell",
          href: "/dashboard/apps",
          label: "Apps",
          icon: getSidebarIcon("apps"),
        },
      ]
    : [
        {
          kind: "shell",
          href: "/dashboard/apps",
          label: "Apps",
          icon: getSidebarIcon("apps"),
        },
        {
          kind: "shell",
          href: "/dashboard/marketplace",
          label: "Marketplace",
          icon: getSidebarIcon("marketplace"),
        },
        {
          kind: "shell",
          href: "/dashboard/network",
          label: "Network",
          icon: getSidebarIcon("network"),
        },
      ];

  const trailingLinks: PlatformShellNavItem[] = options?.showCommandCentre
    ? []
    : [
        {
          kind: "shell",
          href: "/support",
          label: "Support",
          icon: getSidebarIcon("advisor"),
        },
      ];

  return {
    id: "platformAdmin",
    label: options?.showCommandCentre
      ? PLATFORM_CONFIG_NAV_SECTION_LABEL
      : PLATFORM_ADMIN_NAV_SECTION_LABEL,
    links,
    apps: [settingsItem],
    trailingLinks,
  };
}

/** DigitalGate staff — Operator OS (run DigitalGate, not customer industry ops). */
function getDigitalGateOperatorSection(): NavIaSection {
  const operatorApp = (
    id: string,
    name: string,
    iconKey: string,
    primaryHref: string,
    routes: AppRoute[],
  ): AppNavTreeItem => ({
    kind: "app",
    id,
    name,
    icon: getSidebarIcon(iconKey),
    tier: "internal",
    enabled: true,
    routes,
    primaryHref,
  });

  const commandCentre = getCommandCentreNavItem();

  return {
    id: "digitalgate",
    label: DIGITALGATE_OPERATOR_NAV_SECTION_LABEL,
    sublabel: DIGITALGATE_OPERATOR_SUBLABEL,
    links: [],
    apps: [
      {
        kind: "app",
        id: commandCentre.id,
        name: "Command Centre",
        icon: commandCentre.icon,
        tier: "internal",
        enabled: true,
        routes: commandCentre.routes,
        primaryHref: commandCentre.primaryHref,
      },
      operatorApp("dg-organisations", "Organisations", "team", "/command/clients", [
        { path: "/command/clients", label: "All organisations" },
      ]),
      operatorApp("dg-sales", "Sales", "prospecting", "/apps/prospecting", [
        { path: "/apps/prospecting", label: "Prospecting & Opportunity Engine" },
        { path: "/apps/prospecting/discovery", label: "Business Discovery" },
        { path: "/apps/prospecting/pipeline", label: "Pipeline" },
        { path: "/apps/prospecting/activity", label: "Activity" },
        { path: "/command/founding", label: "Founding 10" },
        { path: "/command/sales-week", label: "Sales Week" },
        { path: "/command/opportunities", label: "Opportunities" },
      ]),
      operatorApp("dg-partners", "Partners", "partner-portal", "/command/partners", [
        { path: "/command/partners", label: "Resellers" },
        { path: "/command/referrals", label: "Referrals" },
        { path: "/command/commissions", label: "Commissions" },
      ]),
      operatorApp("dg-delivery", "Delivery", "partner-portal", "/command/delivery", [
        { path: "/command/delivery", label: "Dashboard" },
        { path: "/command/delivery/onboarding", label: "Onboarding" },
        { path: "/command/delivery/invitations", label: "Invitations" },
        { path: "/command/delivery/projects", label: "Projects" },
        { path: "/command/delivery/tasks", label: "Tasks" },
        { path: "/command/delivery/customers", label: "Customers" },
        { path: "/command/delivery/plans", label: "Implementation plans" },
        { path: "/command/delivery/training", label: "Training" },
        { path: "/command/delivery/qa", label: "QA & Go-Live" },
        { path: "/command/delivery/team", label: "Team" },
        { path: "/command/delivery/activity", label: "Activity" },
        { path: "/command/delivery/documents", label: "Documents" },
        { path: "/command/delivery/reports", label: "Reports" },
      ]),
      operatorApp("dg-customer-intelligence", "Customer Intelligence", "brain", "/command/customer-intelligence/overview", [
        { path: "/command/customer-intelligence/overview", label: "Overview" },
        { path: "/command/customer-intelligence/health", label: "Customer health" },
        { path: "/command/customer-intelligence/adoption", label: "Adoption" },
        { path: "/command/customer-intelligence/engagement", label: "Engagement" },
        { path: "/command/customer-intelligence/at-risk", label: "At risk" },
        { path: "/command/customer-intelligence/expansion", label: "Expansion signals" },
      ]),
      operatorApp("dg-platform-intelligence", "Platform Intelligence", "advisor", "/command/platform-intelligence/overview", [
        { path: "/command/platform-intelligence/overview", label: "Overview" },
        { path: "/command/platform-intelligence/health", label: "Platform health" },
        { path: "/command/platform-intelligence/connectors", label: "Connector health" },
        { path: "/command/platform-intelligence/automation", label: "Automation health" },
        { path: "/command/platform-intelligence/ai-usage", label: "AI usage" },
        { path: "/command/platform-intelligence/activity", label: "System activity" },
        { path: "/command/platform-intelligence/service-status", label: "Service status" },
        { path: "/command/platform-intelligence/diagnostics", label: "Diagnostics" },
      ]),
      operatorApp("dg-commercial", "Commercial", "commerce", "/command/revenue", [
        { path: "/command/revenue", label: "Revenue / MRR" },
        { path: "/command/commercial/subscriptions", label: "Subscriptions" },
        { path: "/command/opportunities/expansion", label: "Expansion opportunities" },
      ]),
      operatorApp("dg-product", "Product", "flags", "/command/product/overview", [
        { path: "/command/product/overview", label: "Overview" },
        { path: "/command/flags", label: "Feature flags" },
        { path: "/command/product/roadmap", label: "Roadmap" },
        { path: "/command/product/releases", label: "Releases" },
        { path: "/command/product/feedback", label: "Feedback" },
      ]),
      operatorApp("dg-support", "Support", "advisor", "/support", [
        { path: "/support", label: "Support centre" },
        { path: "/support/tickets", label: "Tickets" },
        { path: "/support/escalations", label: "Escalations" },
        { path: "/support/help", label: "Knowledge base" },
      ]),
    ],
    trailingLinks: [
      {
        kind: "shell",
        href: "/command/docs",
        label: "Platform Docs",
        icon: getSidebarIcon("reports"),
      },
    ],
  };
}

const APPS_PLATFORM_NAV: PlatformShellNavItem = {
  kind: "shell",
  href: "/dashboard/apps",
  label: "Apps",
  icon: getSidebarIcon("apps"),
};

const SHELL_PLATFORM_NAV: PlatformShellNavItem = {
  kind: "shell",
  href: "/dashboard/settings",
  label: "Settings",
  icon: getSidebarIcon("settings"),
  routes: SETTINGS_NAV_ROUTES,
};

/** @deprecated Prefer IA sections — flat workspace list for legacy consumers */
const SHELL_WORKSPACE_NAV: PlatformShellNavItem[] = [...CORE_LINKS];

const SHELL_NAV: PlatformShellNavItem[] = [
  ...SHELL_WORKSPACE_NAV,
  APPS_PLATFORM_NAV,
  SHELL_PLATFORM_NAV,
];

export const CORE_NAV_SECTION_LABEL = "Core";
export const INFRASTRUCTURE_NAV_SECTION_LABEL = "Infrastructure";
export const GROW_NAV_SECTION_LABEL = "Growth";
export const INTELLIGENCE_NAV_SECTION_LABEL = "Intelligence";
export const INDUSTRY_NAV_SECTION_LABEL = "Industry";
export const PLATFORM_ADMIN_NAV_SECTION_LABEL = "Platform Admin";
/** Staff operator OS — DigitalGate runs DigitalGate (not a customer tenant). */
export const DIGITALGATE_OPERATOR_NAV_SECTION_LABEL = "DigitalGate";
export const DIGITALGATE_OPERATOR_SUBLABEL = "Platform Operator";
/** Staff tenant platform config — Apps, Settings, Billing, etc. */
export const PLATFORM_CONFIG_NAV_SECTION_LABEL = "Platform";
export const PARTNERS_NAV_SECTION_LABEL = "Partners";
export const PARTNER_NAV_SECTION_LABEL = "Partner";
export const COMMAND_CENTRE_NAV_SECTION_LABEL = "Command Centre";

/** @deprecated Prefer CORE_NAV_SECTION_LABEL */
export const BUSINESS_WORKSPACE_SECTION_LABEL = CORE_NAV_SECTION_LABEL;
/** @deprecated Prefer CORE_NAV_SECTION_LABEL */
export const OPERATE_NAV_SECTION_LABEL = CORE_NAV_SECTION_LABEL;
/** @deprecated Prefer PLATFORM_ADMIN_NAV_SECTION_LABEL */
export const ECOSYSTEM_NAV_SECTION_LABEL = PLATFORM_ADMIN_NAV_SECTION_LABEL;
/** @deprecated Prefer PLATFORM_ADMIN_NAV_SECTION_LABEL */
export const PLATFORM_NAV_SECTION_LABEL = PLATFORM_ADMIN_NAV_SECTION_LABEL;

export function getPlatformShellNavigation(): PlatformShellNavItem[] {
  return SHELL_NAV;
}

/** @deprecated Flat nav — prefer getCategorizedPlatformNavigation */
export function getPlatformNavigation(): AppNavItem[] {
  return [
    ...SHELL_NAV,
    ...platformApps.customerApps().flatMap((a) => a.manifest.navigation),
  ];
}

function toTreeItem(app: RegisteredApp, enabledIds: string[]): AppNavTreeItem {
  const { manifest } = app;
  const overlay = SIDEBAR_APP_DISPLAY[manifest.id];
  const routes = overlay?.routes ?? manifest.routes;
  const primaryHref =
    manifest.navigation[0]?.href ?? routes[0]?.path ?? "/dashboard";

  return {
    kind: "app",
    id: manifest.id,
    name: overlay?.name ?? manifest.name,
    icon: getSidebarIcon(manifest.id, manifest.navigation[0]?.icon),
    tier: manifest.tier,
    enabled: isAppEnabled(manifest.id, enabledIds),
    routes,
    primaryHref,
  };
}

function sortByOrder(apps: AppNavTreeItem[], order: readonly string[]): AppNavTreeItem[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...apps].sort((a, b) => {
    const ra = rank.get(a.id) ?? 999;
    const rb = rank.get(b.id) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

function countIndustryTemplatesForAppId(appId: string): number {
  let count = 0;
  for (const platform of INDUSTRY_PLATFORMS) {
    count += platform.specialisations.filter((s) => s.appId === appId).length;
  }
  return count;
}

function withTemplateQuery(path: string, templateId?: string): string {
  if (!templateId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}template=${encodeURIComponent(templateId)}`;
}

function industryTemplateNavItem(
  base: AppNavTreeItem,
  spec: IndustrySpecialisation,
  platform?: IndustryPlatform,
): AppNavTreeItem {
  const primaryHref = withTemplateQuery(base.primaryHref, spec.templateId);
  return {
    ...base,
    id: `${base.id}--${spec.id}`,
    name: spec.label,
    icon: platform?.icon || base.icon,
    primaryHref,
    routes: base.routes.map((route) => ({
      ...route,
      path: withTemplateQuery(route.path, spec.templateId),
    })),
  };
}

/**
 * One sidebar app per Industry module or purchased Template add-on.
 * RE and PM are separate apps; Services Electrician and Cleaning are separate apps.
 */
function buildIndustryNavApps(
  enabledIndustryApps: AppNavTreeItem[],
  industrySelectionIds: string[] = [],
): AppNavTreeItem[] {
  const selectedSpecs: IndustrySpecialisation[] = [];
  const seenSpecIds = new Set<string>();

  for (const rawId of industrySelectionIds) {
    const resolved = resolveIndustrySpecialisation(rawId);
    if (!resolved || seenSpecIds.has(resolved.specialisation.id)) continue;
    seenSpecIds.add(resolved.specialisation.id);
    selectedSpecs.push(resolved.specialisation);
  }

  const items: AppNavTreeItem[] = [];

  for (const app of sortByOrder(enabledIndustryApps, INDUSTRY_APP_ORDER)) {
    const resolved = resolveIndustryFromAppId(app.id);
    const templateCount = countIndustryTemplatesForAppId(app.id);
    const specsForApp = selectedSpecs.filter((spec) => spec.appId === app.id);

    if (templateCount > 1) {
      if (specsForApp.length > 0) {
        for (const spec of specsForApp) {
          items.push(industryTemplateNavItem(app, spec, resolved?.platform));
        }
      } else {
        items.push({
          ...app,
          name: resolved?.platform.label ?? app.name,
          icon: resolved?.platform.icon || app.icon,
        });
      }
      continue;
    }

    items.push({
      ...app,
      name: resolved?.specialisation.label ?? app.name,
      icon: resolved?.platform.icon || app.icon,
    });
  }

  return items;
}

export interface CategorizedPlatformNavigation {
  /** @deprecated Prefer `ia.core` — kept for EnabledAppsProvider compatibility */
  shell: PlatformShellNavItem[];
  /** @deprecated Prefer `ia.platformAdmin` — Settings routes still filtered here */
  platform: PlatformShellNavItem;
  /** Apps catalog — under Platform Admin */
  appsPlatform: PlatformShellNavItem;
  /** @deprecated Prefer `ia.core` / `ia.grow` */
  tiers: AppNavTierGroup[];
  tools: PlatformToolsNavGroup;
  /** DigitalGate staff only — rendered under DigitalGate operator section */
  commandCentre: PlatformToolNavItem | null;
  /**
   * Advisor IA —
   * CORE · INFRASTRUCTURE · INDUSTRY · GROWTH · INTELLIGENCE · DIGITALGATE · PARTNER · PLATFORM
   */
  ia: {
    core: NavIaSection;
    infrastructure: NavIaSection;
    industry: NavIaSection;
    grow: NavIaSection;
    intelligence: NavIaSection;
    /** Staff operator OS — Command Centre and platform operations */
    digitalgate: NavIaSection;
    partners: NavIaSection;
    partner: NavIaSection;
    platformAdmin: NavIaSection;
    /** @deprecated Alias of core */
    business: NavIaSection;
    /** @deprecated Empty — merged into core */
    operate: NavIaSection;
    /** @deprecated Alias of platformAdmin */
    ecosystem: NavIaSection;
  };
}

import type { PartnerType } from "../partners/types";
import {
  DELIVERY_PARTNER_NAV,
  RESELLER_PARTNER_NAV,
  STAFF_PARTNERS_NAV,
} from "../partners/delivery-workspace";

function getStaffPartnersNavItems(): AppNavTreeItem[] {
  const sections = [
    { id: "partners-resellers", section: STAFF_PARTNERS_NAV.resellers, icon: "⇄" },
    { id: "partners-referrals", section: STAFF_PARTNERS_NAV.referrals, icon: "⇄" },
    { id: "partners-commissions", section: STAFF_PARTNERS_NAV.commissions, icon: "▤" },
    { id: "partners-delivery", section: STAFF_PARTNERS_NAV.delivery, icon: "⚙" },
  ] as const;

  return sections.map(({ id, section, icon }) => ({
    kind: "app" as const,
    id,
    name: section.label,
    icon,
    tier: "internal" as const,
    enabled: true,
    routes: [...section.routes],
    primaryHref: section.primaryHref,
  }));
}

export function getPartnerWorkspaceShellLinks(partnerType?: PartnerType | null): PlatformShellNavItem[] {
  if (partnerType === "IMPLEMENTATION_PARTNER") {
    return DELIVERY_PARTNER_NAV.delivery.routes.map((route) => ({
      kind: "shell" as const,
      href: route.path,
      label: route.label,
      icon: getSidebarIcon("partner-portal"),
    }));
  }

  return [
    ...RESELLER_PARTNER_NAV.resellers.routes.map((route) => ({
      kind: "shell" as const,
      href: route.path,
      label: route.label,
      icon: getSidebarIcon(
        route.path.includes("referral")
          ? "referrals"
          : route.path.includes("commission")
            ? "commerce"
            : "partner-portal",
      ),
    })),
  ];
}

function getCommandCentreNavItem(): PlatformToolNavItem {
  return {
    kind: "tool",
    id: commandCentreApp.id,
    name: commandCentreApp.name,
    icon: getSidebarIcon(commandCentreApp.id, commandCentreApp.icon),
    primaryHref: "/command",
    routes: [
      { path: "/command", label: "Priorities" },
      { path: "/command/platform-health", label: "Alerts" },
    ],
  };
}

/**
 * Categorized sidebar tree — Intelligent Layer IA.
 * Staff Command Centre nests under Intelligence (not a sixth top-level section).
 * Growth Apps (including Prospecting) use the same /apps/prospecting/* routes for all orgs.
 */
export function getCategorizedPlatformNavigation(
  enabledIds: string[],
  options?: {
    showCommandCentre?: boolean;
    showPartnerPortal?: boolean;
    showResellerAdmin?: boolean;
    partnerType?: PartnerType | null;
    /** Purchased / applied Industry template ids — separate sidebar app per add-on */
    industrySelectionIds?: string[];
  },
): CategorizedPlatformNavigation {
  const foundingCustomerMode =
    !options?.showCommandCentre && isFoundingCustomerMode(enabledIds);

  const customerApps = platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer");

  const enabledApps = customerApps
    .filter((a) => isAppEnabled(a.manifest.id, enabledIds))
    .filter((a) => !SIDEBAR_HIDDEN_APP_IDS.has(a.manifest.id))
    .map((a) => toTreeItem(a, enabledIds));

  const coreApps = [
    businessNavItem(foundingCustomerMode),
    ...sortByOrder(
      enabledApps.filter((a) => CORE_APP_IDS.has(a.id)),
      CORE_APP_ORDER,
    ),
  ];
  const infrastructureApps = sortByOrder(
    enabledApps.filter((a) => INFRASTRUCTURE_APP_IDS.has(a.id)),
    ["infrastructure"],
  );
  const industryModuleApps = sortByOrder(
    enabledApps.filter((a) => INDUSTRY_APP_IDS.has(a.id)),
    INDUSTRY_APP_ORDER,
  );
  const growApps = sortByOrder(
    enabledApps.filter((a) => GROW_APP_IDS.has(a.id)),
    GROW_APP_ORDER,
  );

  const mapped = new Set([
    ...CORE_APP_IDS,
    ...INFRASTRUCTURE_APP_IDS,
    ...INDUSTRY_APP_IDS,
    ...GROW_APP_IDS,
    ...SIDEBAR_HIDDEN_APP_IDS,
  ]);
  const unmapped = enabledApps.filter((a) => !mapped.has(a.id));
  if (unmapped.length) {
    industryModuleApps.push(...unmapped);
  }

  const industryApps = buildIndustryNavApps(
    industryModuleApps,
    options?.industrySelectionIds ?? [],
  );

  const tiers: AppNavTierGroup[] = APP_TIER_ORDER.map((tier) => ({
    tier,
    label: APP_TIER_LABELS[tier],
    apps: customerApps
      .filter((a) => a.manifest.tier === tier && isAppEnabled(a.manifest.id, enabledIds))
      .map((a) => toTreeItem(a, enabledIds)),
  })).filter((g) => g.apps.length > 0);

  const commandCentre = options?.showCommandCentre ? getCommandCentreNavItem() : null;
  const digitalgateSection = options?.showCommandCentre
    ? getDigitalGateOperatorSection()
    : { id: "digitalgate" as const, label: DIGITALGATE_OPERATOR_NAV_SECTION_LABEL, links: [], apps: [] };

  /** Founding customers experience Intelligence on Overview — not via sidebar navigation. */
  const intelligenceLinks = foundingCustomerMode ? [] : INTELLIGENCE_LINKS;

  /** Staff: Command Centre lives in DigitalGate operator section, not Intelligence. */
  const intelligenceApps: AppNavTreeItem[] = [];

  const settingsNav: PlatformShellNavItem = {
    ...SHELL_PLATFORM_NAV,
    routes: [...(SHELL_PLATFORM_NAV.routes ?? [])],
  };

  const platformAdminSection = getPlatformAdminSection({
    showCommandCentre: options?.showCommandCentre,
    foundingCustomerMode,
  });

  const coreSection: NavIaSection = {
    id: "core",
    label: CORE_NAV_SECTION_LABEL,
    links: [],
    apps: coreApps,
  };

  const emptyOperate: NavIaSection = {
    id: "operate",
    label: CORE_NAV_SECTION_LABEL,
    links: [],
    apps: [],
  };

  return {
    shell: SHELL_WORKSPACE_NAV,
    platform: settingsNav,
    appsPlatform: APPS_PLATFORM_NAV,
    tiers,
    tools: { label: PLATFORM_ADMIN_NAV_SECTION_LABEL, tools: [] },
    commandCentre,
    ia: {
      core: coreSection,
      infrastructure: {
        id: "infrastructure",
        label: INFRASTRUCTURE_NAV_SECTION_LABEL,
        links: [],
        apps: infrastructureApps,
      },
      industry: {
        id: "industry",
        label: INDUSTRY_NAV_SECTION_LABEL,
        links: [],
        apps: industryApps,
      },
      grow: {
        id: "grow",
        label: GROW_NAV_SECTION_LABEL,
        links: [],
        apps: growApps,
      },
      intelligence: {
        id: "intelligence",
        label: INTELLIGENCE_NAV_SECTION_LABEL,
        links: intelligenceLinks,
        apps: intelligenceApps,
      },
      digitalgate: digitalgateSection,
      partners: {
        id: "partners",
        label: PARTNERS_NAV_SECTION_LABEL,
        links: [],
        apps: options?.showResellerAdmin && !options?.showCommandCentre ? getStaffPartnersNavItems() : [],
      },
      partner: {
        id: "partner",
        label: PARTNER_NAV_SECTION_LABEL,
        links: options?.showPartnerPortal
          ? getPartnerWorkspaceShellLinks(options.partnerType)
          : [],
        apps: [],
      },
      platformAdmin: platformAdminSection,
      business: coreSection,
      operate: emptyOperate,
      ecosystem: platformAdminSection,
    },
  };
}

/** All customer apps grouped by tier — for Apps & Platform page (includes disabled). */
export function getAllAppsByTierForCatalog(enabledIds: string[]): AppNavTierGroup[] {
  const customerApps = platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer");

  return APP_TIER_ORDER.filter((t) => t !== "internal").map((tier) => ({
    tier,
    label: APP_TIER_LABELS[tier],
    apps: customerApps
      .filter((a) => a.manifest.tier === tier)
      .map((a) => toTreeItem(a, enabledIds)),
  }));
}
