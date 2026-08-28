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
  getIndustry,
  getIndustryPrimaryHref,
  getTemplate,
  listIndustries,
  resolveIndustryEntitlements,
} from "../industry";
import {
  ACQUISITION_PORTAL_HREF,
  ACQUISITION_PORTAL_ROUTES,
} from "../partners/portal-routes";

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
 * Core — run the business (profile + operate apps + infrastructure + intelligence).
 * Infrastructure is a Core capability, not a separate IA pillar.
 */
const CORE_APP_ORDER = [
  "crm",
  "communications",
  "documents",
  "commerce",
  "websites",
  "infrastructure",
] as const;

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
 * Automation $49 · Analytics $49 · Social $79 · Reputation Free.
 * Advanced AI Communications is a Core add-on (voice_ai), not a Growth App.
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
  "reviews",
] as const;

/** Hidden from sidebar IA — marketing undecided; opportunities live in CRM; advanced comms nests under Core Communications */
const SIDEBAR_HIDDEN_APP_IDS = new Set([
  "marketing",
  "opportunities",
  "ai-communications",
]);

const CORE_APP_IDS = new Set<string>(CORE_APP_ORDER);
const INDUSTRY_APP_IDS = new Set<string>(INDUSTRY_APP_ORDER);
const GROW_APP_IDS = new Set<string>(GROW_APP_ORDER);

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
      { path: "/apps/crm", label: "Overview" },
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
      { path: "/apps/documents", label: "Overview" },
      { path: "/apps/documents/library", label: "Library" },
      { path: "/apps/documents/templates", label: "Templates" },
      { path: "/apps/documents/signing", label: "Signing" },
    ],
  },
  communications: {
    name: "Communications",
    routes: [
      // Core channels · advanced AI surfaces · Outreach / Templates / Signatures.
      { path: "/apps/communications", label: "Inbox", matchAlso: ["/apps/communications/inbox"] },
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
      { path: "/apps/ai-communications/voice", label: "Voice Agents" },
      {
        path: "/apps/ai-communications/call-centre",
        label: "Call Centre",
        matchAlso: ["/apps/ai-communications/call-centre/"],
      },
      { path: "/apps/ai-communications/agents", label: "Agent Builder" },
      { path: "/apps/ai-communications/knowledge", label: "Knowledge" },
      {
        path: "/apps/ai-communications/inbox",
        label: "AI Inbox",
        matchAlso: ["/apps/communications/ai"],
      },
      { path: "/apps/communications/outreach", label: "Outreach" },
      { path: "/apps/communications/templates", label: "Templates" },
      { path: "/apps/communications/signatures", label: "Signatures" },
      { path: "/apps/ai-communications/settings", label: "AI Settings" },
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
 * CORE · Intelligence — Overview is the customer entry; other surfaces unlock
 * progressively in AppContextNav after the customer visits them from the hub.
 * Twin / Brain / Benchmarks remain supporting layers (hub + matchAlso), not tabs.
 */
function intelligenceNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "intelligence",
    name: "Intelligence",
    icon: getSidebarIcon("intelligence"),
    tier: "core",
    enabled: true,
    primaryHref: "/dashboard/intelligence",
    routes: [
      {
        path: "/dashboard/intelligence",
        label: "Overview",
        matchAlso: ["/dashboard/twin", "/dashboard/brain", "/dashboard/benchmarks"],
      },
      { path: "/dashboard/health", label: "Business Health" },
      { path: "/dashboard/insights", label: "Insights" },
      { path: "/dashboard/advisor", label: "AI Advisor" },
      {
        path: "/dashboard/reports",
        label: "Reports",
        matchAlso: ["/dashboard/reports/business-performance"],
      },
    ],
  };
}

/** @deprecated Intelligence is a single Core app — section kept empty for IA shape. */
const INTELLIGENCE_LINKS: PlatformShellNavItem[] = [];

function platformAppsNavItem(foundingCustomerMode: boolean): AppNavTreeItem {
  return {
    kind: "app",
    id: "platform-apps",
    name: "Apps",
    icon: getSidebarIcon("apps"),
    tier: "internal",
    enabled: true,
    primaryHref: "/dashboard/apps",
    routes: foundingCustomerMode
      ? [{ path: "/dashboard/apps", label: "Installed Apps" }]
      : [
          { path: "/dashboard/apps", label: "Installed Apps" },
          { path: "/dashboard/apps/catalogue", label: "App Catalogue" },
          { path: "/dashboard/apps/beta", label: "Beta Programmes" },
        ],
  };
}

function platformMarketplaceNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "platform-marketplace",
    name: "Marketplace",
    icon: getSidebarIcon("marketplace"),
    tier: "internal",
    enabled: true,
    primaryHref: "/dashboard/marketplace",
    routes: [
      { path: "/dashboard/marketplace", label: "Explore" },
      {
        path: "/dashboard/marketplace/apps",
        label: "Apps",
        matchAlso: ["/dashboard/marketplace?category=apps", "/dashboard/marketplace?category=software"],
      },
      {
        path: "/dashboard/marketplace/integrations",
        label: "Integrations",
        matchAlso: ["/dashboard/marketplace?category=integrations"],
      },
      {
        path: "/dashboard/marketplace/partner-services",
        label: "Partners",
        matchAlso: ["/dashboard/marketplace?category=partners"],
      },
    ],
  };
}

/** Customer Network — operate their relationships, not DigitalGate’s ecosystem machinery. */
function customerNetworkNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "platform-network",
    name: "Network",
    icon: getSidebarIcon("network"),
    tier: "internal",
    enabled: true,
    primaryHref: "/dashboard/network",
    routes: [
      { path: "/dashboard/network", label: "Overview" },
      { path: "/dashboard/network/referrals", label: "Referrals" },
      {
        path: "/dashboard/network/refer-earn",
        label: "Refer & Earn",
        matchAlso: ["/dashboard/settings/referrals"],
      },
      {
        path: "/dashboard/network/connections",
        label: "Connections",
        matchAlso: ["/dashboard/network/partners"],
      },
    ],
  };
}

/**
 * Staff Network (Platform pillar) — commercial network *transactions*.
 * Partners (DIGITALGATE) = people & organisations; Network = referrals, commissions, payouts.
 * Do not duplicate partner relationship management here.
 */
function staffNetworkNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "platform-network",
    name: "Network",
    icon: getSidebarIcon("network"),
    tier: "internal",
    enabled: true,
    primaryHref: "/dashboard/network",
    routes: [
      { path: "/dashboard/network", label: "Overview" },
      {
        path: "/dashboard/network/refer-earn",
        label: "Refer & Earn",
        matchAlso: ["/dashboard/settings/referrals"],
      },
      {
        path: "/dashboard/network/connections",
        label: "Connections",
        matchAlso: ["/dashboard/network/partners"],
      },
    ],
  };
}

function platformNetworkNavItem(showCommandCentre: boolean): AppNavTreeItem {
  return showCommandCentre ? staffNetworkNavItem() : customerNetworkNavItem();
}

function platformSettingsNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "platform-settings",
    name: "Settings",
    icon: getSidebarIcon("settings"),
    tier: "internal",
    enabled: true,
    primaryHref: "/dashboard/settings",
    routes: SETTINGS_NAV_ROUTES,
  };
}

/** PLATFORM — Apps · Marketplace · Network · Settings (ecosystem admin, not product features). */
function getPlatformAdminSection(options?: {
  showCommandCentre?: boolean;
  foundingCustomerMode?: boolean;
}): NavIaSection {
  const foundingCustomerMode = options?.foundingCustomerMode ?? false;
  const showCommandCentre = options?.showCommandCentre ?? false;

  const apps = foundingCustomerMode
    ? [platformAppsNavItem(true)]
    : [
        platformAppsNavItem(false),
        platformMarketplaceNavItem(),
        platformNetworkNavItem(showCommandCentre),
        platformSettingsNavItem(),
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
    links: [],
    apps,
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
      operatorApp("dg-sales", "Sales", "prospecting", "/apps/prospecting", [
        { path: "/apps/prospecting", label: "Overview" },
        { path: "/apps/prospecting/discovery", label: "Discovery" },
        {
          path: "/apps/prospecting/pipeline",
          label: "Pipeline",
          matchAlso: ["/command/opportunities", "/command/opportunities/expansion"],
        },
        {
          path: "/command/growth-engine",
          label: "Growth Engine™",
          matchAlso: [
            "/command/growth-engine/pipeline",
            "/command/growth-engine/audits",
            "/command/growth-engine/reports",
            "/command/growth-engine/follow-ups",
            "/command/growth-engine/proposals",
            "/command/growth-engine/conversions",
          ],
        },
        { path: "/command/founding", label: "Founding 10" },
        { path: "/command/sales-week", label: "Sales Week" },
      ]),
      operatorApp(
        "dg-partners",
        OPERATOR_PARTNERS_NAV.label,
        "partner-portal",
        OPERATOR_PARTNERS_NAV.primaryHref,
        getOperatorPartnersNavRoutes(),
      ),
      operatorApp(
        "dg-customer-intelligence",
        "Customer Intelligence",
        "brain",
        "/command/clients",
        [
          {
            path: "/command/clients",
            label: "Portfolio",
            matchAlso: [
              "/command/customer-intelligence/overview",
              "/command/customer-intelligence/adoption",
            ],
          },
          { path: "/command/customer-intelligence/health", label: "Client Health" },
          {
            path: "/command/customer-intelligence/engagement",
            label: "Client Activity",
          },
          {
            path: "/command/customer-intelligence/expansion",
            label: "Opportunities",
          },
          {
            path: "/command/customer-intelligence/at-risk",
            label: "Attention Required",
          },
        ],
      ),
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
/** Customer + staff tenant config pillar — Apps · Marketplace · Network · Settings */
export const PLATFORM_ADMIN_NAV_SECTION_LABEL = "Platform";
/** Staff operator OS — DigitalGate runs DigitalGate (not a customer tenant). */
export const DIGITALGATE_OPERATOR_NAV_SECTION_LABEL = "DigitalGate";
export const DIGITALGATE_OPERATOR_SUBLABEL = "Platform Operator";
/** Staff tenant platform config — same label as customer Platform pillar */
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

function pathWithoutQuery(href: string): string {
  return href.split("?")[0] ?? href;
}

function unionAppRoutes(routes: AppRoute[]): AppRoute[] {
  const out: AppRoute[] = [];
  const seen = new Set<string>();
  for (const route of routes) {
    if (seen.has(route.path)) continue;
    seen.add(route.path);
    out.push(route);
  }
  return out;
}

/**
 * One sidebar row per entitled Industry App (Property, Services, …).
 * Templates are switched in-context — not separate sidebar apps.
 */
function buildIndustryNavApps(
  enabledIndustryApps: AppNavTreeItem[],
  industrySelectionIds: string[] = [],
): AppNavTreeItem[] {
  const enabledAppIds = enabledIndustryApps.map((a) => a.id);
  const byAppId = new Map(enabledIndustryApps.map((a) => [a.id, a]));
  const { industries } = resolveIndustryEntitlements({
    enabledAppIds,
    purchasedApps: industrySelectionIds,
    planPreviewIndustryApps: industrySelectionIds,
  });

  const items: AppNavTreeItem[] = [];
  const consumedAppIds = new Set<string>();

  // Catalogue order matches INDUSTRY_PLATFORMS
  for (const industry of listIndustries()) {
    const entitlement = industries.find((e) => e.industryId === industry.id);
    if (!entitlement?.entitled) continue;

    const activeTemplateIds = entitlement.activeTemplateIds;
    const primaryHref =
      getIndustryPrimaryHref(industry.id, activeTemplateIds) ??
      `/apps/industry/${industry.slug}`;

    const collected: AppRoute[] = [];
    for (const templateId of activeTemplateIds) {
      const template = getTemplate(templateId);
      if (!template) continue;
      if (template.appId) {
        consumedAppIds.add(template.appId);
        const app = byAppId.get(template.appId);
        if (app?.routes.length) {
          collected.push(...app.routes);
        }
      }
      const href = pathWithoutQuery(template.primaryHref);
      collected.push({ path: href, label: template.name });
    }

    if (collected.length === 0) {
      const fallback = getIndustry(industry.id);
      const included = fallback?.templates.find((t) => t.isDefaultIncluded) ?? fallback?.templates[0];
      if (included?.appId) {
        consumedAppIds.add(included.appId);
        const app = byAppId.get(included.appId);
        if (app?.routes.length) collected.push(...app.routes);
      }
      collected.push({
        path: pathWithoutQuery(primaryHref),
        label: industry.name,
      });
    }

    items.push({
      kind: "app",
      id: `industry--${industry.id}`,
      name: industry.name,
      icon: industry.icon,
      tier: "business",
      enabled: true,
      primaryHref: pathWithoutQuery(primaryHref),
      routes: unionAppRoutes(collected),
    });
  }

  // Preserve unexpected enabled apps that did not fold into an Industry row
  for (const app of sortByOrder(enabledIndustryApps, INDUSTRY_APP_ORDER)) {
    if (consumedAppIds.has(app.id)) continue;
    // Skip Gen 2 modules that belong to an entitled industry we already emitted
    const template = getTemplate(app.id);
    if (template && items.some((i) => i.id === `industry--${template.industryId}`)) {
      continue;
    }
    items.push(app);
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
   * Customer pillars: CORE · INDUSTRY · GROWTH · PLATFORM
   * Staff also: DIGITALGATE (operator) · PARTNER
   * `infrastructure` / `intelligence` IA slots remain for compatibility (usually empty).
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
  getOperatorPartnersNavRoutes,
  OPERATOR_PARTNERS_NAV,
} from "../partners/delivery-workspace";

function getStaffPartnersNavItems(): AppNavTreeItem[] {
  return [
    {
      kind: "app" as const,
      id: "partners-operator",
      name: OPERATOR_PARTNERS_NAV.label,
      icon: "⇄",
      tier: "internal" as const,
      enabled: true,
      routes: getOperatorPartnersNavRoutes(),
      primaryHref: OPERATOR_PARTNERS_NAV.primaryHref,
    },
  ];
}

export function getPartnerWorkspaceShellLinks(partnerType?: PartnerType | null): PlatformShellNavItem[] {
  return getPartnerWorkspaceApps(partnerType).flatMap((app) =>
    app.routes.map((route) => ({
      kind: "shell" as const,
      href: route.path,
      label: route.label,
      icon: app.icon,
    })),
  );
}

/** Partner portal as apps so AppContextNav matches staff Core/CRM pattern. */
export function getPartnerWorkspaceApps(partnerType?: PartnerType | null): AppNavTreeItem[] {
  if (partnerType === "IMPLEMENTATION_PARTNER") {
    return [
      {
        kind: "app",
        id: "partner-delivery",
        name: "Delivery Partners",
        icon: getSidebarIcon("partner-portal"),
        tier: "internal",
        enabled: true,
        routes: [
          ...DELIVERY_PARTNER_NAV.delivery.routes,
          { path: ACQUISITION_PORTAL_ROUTES.profile, label: "Profile" },
        ],
        primaryHref: DELIVERY_PARTNER_NAV.delivery.primaryHref,
      },
    ];
  }

  return [
    {
      kind: "app",
      id: "partner-portal",
      name: "Acquisition Partners",
      icon: getSidebarIcon("partner-portal"),
      tier: "internal",
      enabled: true,
      routes: [
        { path: ACQUISITION_PORTAL_HREF, label: "Dashboard" },
        { path: ACQUISITION_PORTAL_ROUTES.referrals, label: "Referrals" },
        { path: ACQUISITION_PORTAL_ROUTES.commissions, label: "Commissions" },
        { path: ACQUISITION_PORTAL_ROUTES.playbook, label: "Playbook" },
        { path: ACQUISITION_PORTAL_ROUTES.demo, label: "Demo" },
        { path: ACQUISITION_PORTAL_ROUTES.resources, label: "Resources" },
        { path: ACQUISITION_PORTAL_ROUTES.terms, label: "Terms" },
        { path: ACQUISITION_PORTAL_ROUTES.profile, label: "Profile" },
      ],
      primaryHref: ACQUISITION_PORTAL_HREF,
    },
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
      { path: "/command/advisor", label: "AI Advisor" },
      {
        path: "/command/platform-health",
        label: "Alerts",
        matchAlso: ["/command/platform-health/diagnostics"],
      },
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
    /** Purchased / applied Industry template ids — entitlements for Industry sidebar rows */
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
    // Intelligence last in Core — Overview is the brain entry (hidden in founding slim mode).
    ...(foundingCustomerMode ? [] : [intelligenceNavItem()]),
  ];
  /** Empty — Infrastructure is listed under CORE */
  const infrastructureApps: AppNavTreeItem[] = [];
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
  const intelligenceLinks = INTELLIGENCE_LINKS;

  /** Intelligence is a Core app; this section stays empty so the sidebar does not duplicate it. */
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
        links: [],
        apps: options?.showPartnerPortal
          ? getPartnerWorkspaceApps(options.partnerType)
          : [],
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
