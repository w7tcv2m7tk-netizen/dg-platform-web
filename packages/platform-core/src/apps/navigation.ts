import type { AppNavItem, AppRoute, AppTier, RegisteredApp } from "./manifest";
import { APP_TIER_LABELS, APP_TIER_ORDER, isAppEnabled } from "./org-apps";
import { platformApps } from "./registry";

export interface PlatformShellNavItem extends AppNavItem {
  kind: "shell";
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

const SHELL_NAV: PlatformShellNavItem[] = [
  { kind: "shell", href: "/dashboard", label: "Overview", icon: "◉" },
  { kind: "shell", href: "/dashboard/apps", label: "Apps & plan", icon: "▦" },
];

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
    icon: manifest.icon,
    tier: manifest.tier,
    enabled: isAppEnabled(manifest.id, enabledIds),
    routes: manifest.routes,
    primaryHref,
  };
}

/** Categorized sidebar tree — only customer apps that are enabled. */
export function getCategorizedPlatformNavigation(enabledIds: string[]): {
  shell: PlatformShellNavItem[];
  tiers: AppNavTierGroup[];
} {
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

  return { shell: SHELL_NAV, tiers };
}

/** All customer apps grouped by tier — for Apps & plan page (includes disabled). */
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
