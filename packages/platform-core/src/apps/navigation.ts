import type { AppNavItem, AppRoute, AppTier, RegisteredApp } from "./manifest";
import { commandCentreApp } from "./builtins/command-centre";
import { SETTINGS_NAV_ROUTES } from "./platform-tools";
import { APP_TIER_LABELS, APP_TIER_ORDER, isAppEnabled } from "./org-apps";
import { platformApps } from "./registry";
import { getSidebarIcon } from "./sidebar-icons";
import { INDUSTRY_PLATFORMS, resolveIndustryFromAppId } from "../industry/platform";

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

/** Advisor IA section ids — Core · Infrastructure · Industry · Growth · Intelligence · Partners · Platform Admin */
export type NavIaSectionId =
  | "core"
  | "infrastructure"
  | "industry"
  | "grow"
  | "intelligence"
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
  /** Flat shell links in this section */
  links: PlatformShellNavItem[];
  /** Collapsible installed apps in this section */
  apps: AppNavTreeItem[];
}

/**
 * Core — universal operating layer (profile + CRM / Commerce / Design Studio).
 * Infrastructure is its own top-level section.
 */
const CORE_APP_ORDER = ["crm", "commerce", "websites"] as const;

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
 * Growth — demand Apps. CRM Opportunities is the canonical pipeline object;
 * the Opportunity Engine App is not a second Opportunities destination.
 */
const GROW_APP_ORDER = [
  "ai-visibility",
  "seo",
  "automation",
  "analytics",
  "social",
  "reviews",
  "ai-communications",
] as const;

/** Hidden from sidebar IA — marketing undecided; opportunities live in CRM */
const SIDEBAR_HIDDEN_APP_IDS = new Set(["marketing", "opportunities"]);

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
  seo: { name: "SEO" },
  social: { name: "Social" },
  "ai-communications": { name: "AI Communications" },
  reviews: { name: "Reputation" },
  infrastructure: {
    name: "Infrastructure",
    routes: [
      { path: "/apps/infrastructure/domains", label: "Domains" },
      { path: "/apps/infrastructure/dns", label: "DNS" },
      { path: "/apps/infrastructure/ssl", label: "SSL" },
      { path: "/apps/infrastructure/hosting", label: "Hosting" },
      { path: "/apps/infrastructure/email", label: "Email" },
      { path: "/apps/infrastructure/backup", label: "Backup" },
      { path: "/apps/infrastructure/cloudflare", label: "Cloudflare" },
    ],
  },
};

/** CORE — who you are + universal ops (Twin lives under Intelligence). */
const CORE_LINKS: PlatformShellNavItem[] = [
  { kind: "shell", href: "/dashboard", label: "Overview", icon: getSidebarIcon("overview") },
  {
    kind: "shell",
    href: "/dashboard/business",
    label: "Business Profile",
    icon: getSidebarIcon("business-profile"),
  },
  {
    kind: "shell",
    href: "/dashboard/goals",
    label: "Goals",
    icon: getSidebarIcon("goals"),
  },
  {
    kind: "shell",
    href: "/dashboard/settings/team",
    label: "Team",
    icon: getSidebarIcon("team"),
  },
];

/**
 * INTELLIGENCE — decision surfaces (not a shop of apps).
 * Command Centre (staff) is injected as a collapsible app at the top of this section.
 */
const INTELLIGENCE_LINKS: PlatformShellNavItem[] = [
  {
    kind: "shell",
    href: "/dashboard/twin",
    label: "Digital Twin",
    icon: getSidebarIcon("twin"),
  },
  {
    kind: "shell",
    href: "/dashboard/advisor",
    label: "AI Advisor",
    icon: getSidebarIcon("advisor"),
  },
  {
    kind: "shell",
    href: "/dashboard/health",
    label: "Business Health",
    icon: getSidebarIcon("health"),
  },
  {
    kind: "shell",
    href: "/apps/analytics",
    label: "Insights",
    icon: getSidebarIcon("analytics"),
  },
  {
    kind: "shell",
    href: "/dashboard/benchmarks",
    label: "Benchmarks",
    icon: getSidebarIcon("benchmarks"),
  },
  {
    kind: "shell",
    href: "/dashboard/brain",
    label: "Business Brain",
    icon: getSidebarIcon("brain"),
  },
];

/** PLATFORM ADMIN — activate / configure the platform (flat). */
function getPlatformAdminLinks(options?: { showCommandCentre?: boolean }): PlatformShellNavItem[] {
  const links: PlatformShellNavItem[] = [
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
    {
      kind: "shell",
      href: "/dashboard/settings",
      label: "Settings",
      icon: getSidebarIcon("settings"),
    },
    {
      kind: "shell",
      href: "/dashboard/settings/billing",
      label: "Billing",
      icon: getSidebarIcon("settings"),
    },
    {
      kind: "shell",
      href: "/dashboard/settings/connectors",
      label: "Connectors",
      icon: getSidebarIcon("settings"),
    },
    {
      kind: "shell",
      href: "/dashboard/settings/api",
      label: "API",
      icon: getSidebarIcon("settings"),
    },
    {
      kind: "shell",
      href: "/dashboard/settings/audit",
      label: "Audit Log",
      icon: getSidebarIcon("settings"),
    },
    {
      kind: "shell",
      href: "/dashboard/settings/roadmap",
      label: "Roadmap",
      icon: getSidebarIcon("reports"),
    },
    {
      kind: "shell",
      href: "/support",
      label: "Support",
      icon: getSidebarIcon("advisor"),
    },
  ];

  if (options?.showCommandCentre) {
    links.push({
      kind: "shell",
      href: "/command/docs",
      label: "Platform Docs",
      icon: getSidebarIcon("reports"),
    });
  }

  return links;
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
  const primaryHref = routes[0]?.path ?? manifest.navigation[0]?.href ?? "/dashboard";

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

/**
 * Group enabled industry modules under the twelve Industry Platform labels,
 * ordered to match INDUSTRY_PLATFORMS.
 */
function buildIndustryNavApps(enabledIndustryApps: AppNavTreeItem[]): AppNavTreeItem[] {
  const byPlatform = new Map<string, AppNavTreeItem[]>();

  for (const app of enabledIndustryApps) {
    const resolved = resolveIndustryFromAppId(app.id);
    const platformId = resolved?.platform.id ?? `unmapped-${app.id}`;
    const list = byPlatform.get(platformId) ?? [];
    list.push(app);
    byPlatform.set(platformId, list);
  }

  const grouped: AppNavTreeItem[] = [];

  for (const platform of INDUSTRY_PLATFORMS) {
    const apps = byPlatform.get(platform.id);
    if (!apps?.length) continue;

    if (apps.length === 1) {
      grouped.push({
        ...apps[0],
        name: platform.label,
        icon: platform.icon || apps[0].icon,
      });
      continue;
    }

    const routes: AppRoute[] = apps.flatMap((app) =>
      app.routes.map((route) => ({
        ...route,
        label: `${app.name} · ${route.label}`,
      })),
    );

    grouped.push({
      kind: "app",
      id: `industry-${platform.id}`,
      name: platform.label,
      icon: platform.icon || apps[0].icon,
      tier: apps[0].tier,
      enabled: true,
      routes,
      primaryHref: apps[0].primaryHref,
    });
  }

  // Any modules that did not resolve to a platform (defensive)
  for (const [platformId, apps] of byPlatform) {
    if (INDUSTRY_PLATFORMS.some((p) => p.id === platformId)) continue;
    grouped.push(...sortByOrder(apps, INDUSTRY_APP_ORDER));
  }

  return grouped;
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
  /** DigitalGate staff only — rendered under Intelligence */
  commandCentre: PlatformToolNavItem | null;
  /**
   * Advisor IA —
   * CORE · INFRASTRUCTURE · INDUSTRY · GROWTH · INTELLIGENCE · PARTNERS · PARTNER · PLATFORM ADMIN
   */
  ia: {
    core: NavIaSection;
    infrastructure: NavIaSection;
    industry: NavIaSection;
    grow: NavIaSection;
    intelligence: NavIaSection;
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

function getStaffProspectingNavItem(): AppNavTreeItem {
  return {
    kind: "app",
    id: "prospecting",
    name: "Prospecting",
    icon: "◎",
    tier: "internal",
    enabled: true,
    routes: [
      { path: "/command/growth-engine", label: "Prospects" },
      { path: "/command/growth-engine/pipeline", label: "Pipeline" },
      { path: "/command/growth-engine/discovery", label: "Discovery" },
      { path: "/command/growth-engine/follow-ups", label: "Activity" },
    ],
    primaryHref: "/command/growth-engine",
  };
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
      { path: "/command/advisor", label: "Recommended Actions" },
      { path: "/command/platform-health", label: "Alerts" },
      { path: "/command/sales-week", label: "Sales Week" },
      { path: "/command/founding", label: "Founding 10" },
    ],
  };
}

/**
 * Categorized sidebar tree — Intelligent Layer IA.
 * Staff Command Centre nests under Intelligence (not a sixth top-level section).
 */
export function getCategorizedPlatformNavigation(
  enabledIds: string[],
  options?: {
    showCommandCentre?: boolean;
    showPartnerPortal?: boolean;
    showResellerAdmin?: boolean;
    partnerType?: PartnerType | null;
  },
): CategorizedPlatformNavigation {
  const customerApps = platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer");

  const enabledApps = customerApps
    .filter((a) => isAppEnabled(a.manifest.id, enabledIds))
    .filter((a) => !SIDEBAR_HIDDEN_APP_IDS.has(a.manifest.id))
    .map((a) => toTreeItem(a, enabledIds));

  const analyticsEnabled = isAppEnabled("analytics", enabledIds);

  const coreApps = sortByOrder(
    enabledApps.filter((a) => CORE_APP_IDS.has(a.id)),
    CORE_APP_ORDER,
  );
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
  if (options?.showCommandCentre) {
    growApps.unshift(getStaffProspectingNavItem());
  }

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

  const industryApps = buildIndustryNavApps(industryModuleApps);

  const tiers: AppNavTierGroup[] = APP_TIER_ORDER.map((tier) => ({
    tier,
    label: APP_TIER_LABELS[tier],
    apps: customerApps
      .filter((a) => a.manifest.tier === tier && isAppEnabled(a.manifest.id, enabledIds))
      .map((a) => toTreeItem(a, enabledIds)),
  })).filter((g) => g.apps.length > 0);

  const commandCentre = options?.showCommandCentre ? getCommandCentreNavItem() : null;

  const intelligenceLinks = INTELLIGENCE_LINKS.filter((link) => {
    if (link.href === "/apps/analytics") {
      return analyticsEnabled;
    }
    return true;
  });

  const intelligenceApps: AppNavTreeItem[] = commandCentre
    ? [
        {
          kind: "app",
          id: commandCentre.id,
          name: commandCentre.name,
          icon: commandCentre.icon,
          tier: "internal",
          enabled: true,
          routes: commandCentre.routes,
          primaryHref: commandCentre.primaryHref,
        },
      ]
    : [];

  const settingsNav: PlatformShellNavItem = {
    ...SHELL_PLATFORM_NAV,
    routes: [
      ...(SHELL_PLATFORM_NAV.routes ?? []),
      ...(options?.showCommandCentre
        ? [{ path: "/command/docs", label: "Platform Docs" }]
        : []),
    ],
  };

  const platformAdminLinks = getPlatformAdminLinks({
    showCommandCentre: options?.showCommandCentre,
  });

  const coreSection: NavIaSection = {
    id: "core",
    label: CORE_NAV_SECTION_LABEL,
    links: CORE_LINKS,
    apps: coreApps,
  };

  const emptyOperate: NavIaSection = {
    id: "operate",
    label: CORE_NAV_SECTION_LABEL,
    links: [],
    apps: [],
  };

  const platformAdminSection: NavIaSection = {
    id: "platformAdmin",
    label: PLATFORM_ADMIN_NAV_SECTION_LABEL,
    links: platformAdminLinks,
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
      partners: {
        id: "partners",
        label: PARTNERS_NAV_SECTION_LABEL,
        links: [],
        apps: options?.showResellerAdmin ? getStaffPartnersNavItems() : [],
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
