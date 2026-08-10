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

/** Primary Business Workspace shell — client opens their business, not a CRM */
const SHELL_NAV: PlatformShellNavItem[] = [
  { kind: "shell", href: "/dashboard", label: "Overview", icon: getSidebarIcon("overview") },
  {
    kind: "shell",
    href: "/dashboard/business",
    label: "Business Profile",
    icon: getSidebarIcon("business-profile"),
  },
  { kind: "shell", href: "/dashboard/apps", label: "Apps & Plan", icon: getSidebarIcon("apps") },
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
    routes: SETTINGS_NAV_ROUTES,
  },
];

export const BUSINESS_WORKSPACE_SECTION_LABEL = "Your business";

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

export interface CategorizedPlatformNavigation {
  shell: PlatformShellNavItem[];
  tiers: AppNavTierGroup[];
  tools: PlatformToolsNavGroup;
  /** DigitalGate staff only — Command Centre collapsible section */
  commandCentre: PlatformToolNavItem | null;
}

export const COMMAND_CENTRE_NAV_SECTION_LABEL = "Command Centre";

function getCommandCentreNavItem(): PlatformToolNavItem {
  const manifest = commandCentreApp;
  return {
    kind: "tool",
    id: manifest.id,
    name: manifest.name,
    icon: getSidebarIcon(manifest.id, manifest.icon),
    primaryHref: "/command/opportunities",
    routes: manifest.navigation.map((item) => ({
      path: item.href,
      label: item.label,
    })),
  };
}

/** Categorized sidebar tree — only customer apps that are enabled. */
export function getCategorizedPlatformNavigation(
  enabledIds: string[],
  options?: { showCommandCentre?: boolean },
): CategorizedPlatformNavigation {
  const customerApps = platformApps
    .list()
    .filter((a) => (a.manifest.visibility ?? "customer") === "customer");

  const tiers: AppNavTierGroup[] = APP_TIER_ORDER.map((tier) => ({
    tier,
    label: APP_TIER_LABELS[tier],
    apps: customerApps
      .filter((a) => a.manifest.tier === tier && isAppEnabled(a.manifest.id, enabledIds))
      .map((a) => toTreeItem(a, enabledIds)),
  })).filter((g) => g.apps.length > 0);

  // Command Centre is its own cockpit section in the sidebar — not buried in Business apps.
  const commandCentre = options?.showCommandCentre ? getCommandCentreNavItem() : null;

  const tools: PlatformToolsNavGroup = {
    label: "Settings",
    tools: [],
  };

  return {
    shell: SHELL_NAV,
    tiers,
    tools,
    commandCentre,
  };
}

/** All customer apps grouped by tier — for Apps & Plan page (includes disabled). */
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
