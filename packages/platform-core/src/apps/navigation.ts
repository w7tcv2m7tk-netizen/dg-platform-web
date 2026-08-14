import type { AppNavItem, AppRoute, AppTier, RegisteredApp } from "./manifest";
import { commandCentreApp } from "./builtins/command-centre";
import { SETTINGS_NAV_ROUTES } from "./platform-tools";
import { APP_TIER_LABELS, APP_TIER_ORDER, isAppEnabled } from "./org-apps";
import { platformApps } from "./registry";
import { getSidebarIcon } from "./sidebar-icons";

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

/** Advisor IA section ids — docs/foundations/INTELLIGENT-LAYER.md */
export type NavIaSectionId =
  | "business"
  | "operate"
  | "grow"
  | "intelligence"
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
 * Operate app order — property ecosystem first, then other Industry Apps.
 * Core operate apps lead the section.
 */
const OPERATE_APP_ORDER = [
  "crm",
  "commerce",
  "websites",
  "infrastructure",
  "real-estate",
  "accommodation",
  "property-management",
  "commercial",
  "services",
  "finance",
  "automotive",
  "creator",
] as const;

/** Grow — Opportunities + Growth Apps (not sold as “intelligence SKUs”) */
const GROW_APP_ORDER = [
  "opportunities",
  "ai-visibility",
  "seo",
  "automation",
  "analytics",
  "social",
  "reviews",
  "marketing",
  "ai-communications",
] as const;

const OPERATE_APP_IDS = new Set<string>(OPERATE_APP_ORDER);
const GROW_APP_IDS = new Set<string>(GROW_APP_ORDER);

/**
 * BUSINESS — who you are / commercial control.
 * Twin lives on Overview (Business Command); Goals deferred until product exists.
 */
const BUSINESS_LINKS: PlatformShellNavItem[] = [
  { kind: "shell", href: "/dashboard", label: "Overview", icon: getSidebarIcon("overview") },
  {
    kind: "shell",
    href: "/dashboard/business",
    label: "Business Profile",
    icon: getSidebarIcon("business-profile"),
  },
  {
    kind: "shell",
    href: "/dashboard/settings/team",
    label: "Team",
    icon: getSidebarIcon("team"),
  },
  {
    kind: "shell",
    href: "/dashboard/apps",
    label: "Apps & Platform",
    icon: getSidebarIcon("apps"),
  },
];

/** ECOSYSTEM — keep Marketplace ≠ Network ≠ Refer & Earn distinct */
const ECOSYSTEM_LINKS: PlatformShellNavItem[] = [
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
    href: "/dashboard/settings/referrals",
    label: "Refer & Earn",
    icon: getSidebarIcon("referrals"),
  },
];

/**
 * INTELLIGENCE — decision surfaces (not a shop of apps).
 * Business Health currently shares Overview (/dashboard) — do not duplicate that link here.
 * Opportunity Engine UI lives under Grow; Insights seeds this section.
 * Customer Advisor / Benchmarks deepen later on existing surfaces.
 */
const INTELLIGENCE_LINKS: PlatformShellNavItem[] = [
  {
    kind: "shell",
    href: "/apps/analytics",
    label: "Insights",
    icon: getSidebarIcon("analytics"),
  },
];

const SHELL_PLATFORM_NAV: PlatformShellNavItem = {
  kind: "shell",
  href: "/dashboard/settings",
  label: "Settings",
  icon: getSidebarIcon("settings"),
  routes: SETTINGS_NAV_ROUTES,
};

/** @deprecated Prefer IA sections — flat workspace list for legacy consumers */
const SHELL_WORKSPACE_NAV: PlatformShellNavItem[] = [
  ...BUSINESS_LINKS,
  ...ECOSYSTEM_LINKS,
];

const SHELL_NAV: PlatformShellNavItem[] = [...SHELL_WORKSPACE_NAV, SHELL_PLATFORM_NAV];

export const BUSINESS_WORKSPACE_SECTION_LABEL = "Business";
export const OPERATE_NAV_SECTION_LABEL = "Operate";
export const GROW_NAV_SECTION_LABEL = "Grow";
export const INTELLIGENCE_NAV_SECTION_LABEL = "Intelligence";
export const ECOSYSTEM_NAV_SECTION_LABEL = "Ecosystem";
export const PLATFORM_NAV_SECTION_LABEL = "Platform";
export const COMMAND_CENTRE_NAV_SECTION_LABEL = "Command Centre";

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
  const primaryHref = manifest.routes[0]?.path ?? manifest.navigation[0]?.href ?? "/dashboard";

  return {
    kind: "app",
    id: manifest.id,
    name: manifest.name,
    icon: getSidebarIcon(manifest.id, manifest.navigation[0]?.icon),
    tier: manifest.tier,
    enabled: isAppEnabled(manifest.id, enabledIds),
    routes: manifest.routes,
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

export interface CategorizedPlatformNavigation {
  /** @deprecated Prefer `ia.business` — kept for EnabledAppsProvider compatibility */
  shell: PlatformShellNavItem[];
  /** Settings / admin — rendered after IA sections */
  platform: PlatformShellNavItem;
  /** @deprecated Prefer `ia.operate` / `ia.grow` */
  tiers: AppNavTierGroup[];
  tools: PlatformToolsNavGroup;
  /** DigitalGate staff only — Command Centre collapsible section */
  commandCentre: PlatformToolNavItem | null;
  /** Advisor IA — BUSINESS · OPERATE · GROW · INTELLIGENCE · ECOSYSTEM */
  ia: {
    business: NavIaSection;
    operate: NavIaSection;
    grow: NavIaSection;
    intelligence: NavIaSection;
    ecosystem: NavIaSection;
  };
}

function getCommandCentreNavItem(): PlatformToolNavItem {
  const manifest = commandCentreApp;
  return {
    kind: "tool",
    id: manifest.id,
    name: manifest.name,
    icon: getSidebarIcon(manifest.id, manifest.icon),
    primaryHref: "/command",
    routes: manifest.navigation.map((item) => ({
      path: item.href,
      label: item.label,
    })),
  };
}

/**
 * Categorized sidebar tree — Intelligent Layer IA.
 * Staff Command Centre stays separate (DigitalGate-runs-DigitalGate).
 */
export function getCategorizedPlatformNavigation(
  enabledIds: string[],
  options?: { showCommandCentre?: boolean },
): CategorizedPlatformNavigation {
  const customerApps = platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer");

  const enabledApps = customerApps
    .filter((a) => isAppEnabled(a.manifest.id, enabledIds))
    .map((a) => toTreeItem(a, enabledIds));

  const operateApps = sortByOrder(
    enabledApps.filter((a) => OPERATE_APP_IDS.has(a.id)),
    OPERATE_APP_ORDER,
  );
  const growApps = sortByOrder(
    enabledApps.filter((a) => GROW_APP_IDS.has(a.id)),
    GROW_APP_ORDER,
  );
  // Any future customer app not mapped falls into Operate
  const mapped = new Set([...OPERATE_APP_IDS, ...GROW_APP_IDS]);
  const unmapped = enabledApps.filter((a) => !mapped.has(a.id));
  if (unmapped.length) {
    operateApps.push(...unmapped);
  }

  const tiers: AppNavTierGroup[] = APP_TIER_ORDER.map((tier) => ({
    tier,
    label: APP_TIER_LABELS[tier],
    apps: customerApps
      .filter((a) => a.manifest.tier === tier && isAppEnabled(a.manifest.id, enabledIds))
      .map((a) => toTreeItem(a, enabledIds)),
  })).filter((g) => g.apps.length > 0);

  const commandCentre = options?.showCommandCentre ? getCommandCentreNavItem() : null;

  const intelligenceLinks = INTELLIGENCE_LINKS.filter((link) => {
    if (link.href === "/apps/analytics") return isAppEnabled("analytics", enabledIds);
    return true;
  });

  return {
    shell: SHELL_WORKSPACE_NAV,
    platform: SHELL_PLATFORM_NAV,
    tiers,
    tools: { label: PLATFORM_NAV_SECTION_LABEL, tools: [] },
    commandCentre,
    ia: {
      business: {
        id: "business",
        label: BUSINESS_WORKSPACE_SECTION_LABEL,
        links: BUSINESS_LINKS,
        apps: [],
      },
      operate: {
        id: "operate",
        label: OPERATE_NAV_SECTION_LABEL,
        links: [],
        apps: operateApps,
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
        apps: [],
      },
      ecosystem: {
        id: "ecosystem",
        label: ECOSYSTEM_NAV_SECTION_LABEL,
        links: ECOSYSTEM_LINKS,
        apps: [],
      },
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
