import type { AppRoute } from "./manifest";
import type {
  AppNavTreeItem,
  CategorizedPlatformNavigation,
  NavIaSection,
  NavIaSectionId,
  PlatformShellNavItem,
} from "./navigation";
import { flattenAppRoutes } from "./route-tree";

function findRoute(routes: AppRoute[], routePath: string): AppRoute | undefined {
  for (const route of routes) {
    if (route.path === routePath) return route;
    if (route.children?.length) {
      const nested = findRoute(route.children, routePath);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Match a nav route against the current pathname. */
export function routeIsActive(pathname: string, routePath: string, routes: AppRoute[]): boolean {
  if (pathname === routePath) return true;

  const route = findRoute(routes, routePath);
  if (
    route?.matchAlso?.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  if (route?.children?.length) {
    return itemHasActiveRoute(pathname, route.children);
  }

  const leafRoutes = flattenAppRoutes(routes).filter((r) => !r.children?.length);
  const hasSiblingUnderPrefix = leafRoutes.some(
    (r) => r.path !== routePath && r.path.startsWith(`${routePath}/`),
  );
  if (hasSiblingUnderPrefix) return false;

  return pathname.startsWith(`${routePath}/`);
}

export function itemHasActiveRoute(pathname: string, routes: AppRoute[]): boolean {
  for (const route of routes) {
    if (routeIsActive(pathname, route.path, routes)) return true;
  }
  return false;
}

function shellLinkActive(pathname: string, href: string, routes?: AppRoute[]): boolean {
  if (routes?.length) return itemHasActiveRoute(pathname, routes);
  if (pathname === href) return true;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/settings") {
    return pathname === "/dashboard/settings";
  }
  return pathname.startsWith(`${href}/`);
}

export type ActiveNavItemKind = "app" | "shell" | "intelligence";

export type ResolvedActiveNav = {
  sectionId: NavIaSectionId;
  sectionLabel: string;
  itemKind: ActiveNavItemKind;
  itemId: string;
  itemName: string;
  routes: AppRoute[];
  activeRoute: AppRoute | null;
};

const INTELLIGENCE_PATH_PREFIXES = [
  "/dashboard/advisor",
  "/dashboard/twin",
  "/dashboard/brain",
  "/dashboard/health",
  "/dashboard/benchmarks",
  "/dashboard/insights",
  "/dashboard/reports",
] as const;

function isIntelligencePath(pathname: string): boolean {
  return INTELLIGENCE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function resolveActiveRoute(pathname: string, routes: AppRoute[]): AppRoute | null {
  for (const route of flattenAppRoutes(routes)) {
    if (routeIsActive(pathname, route.path, routes)) return route;
  }
  return null;
}

function matchAppItem(
  pathname: string,
  section: NavIaSection,
  item: AppNavTreeItem,
): ResolvedActiveNav | null {
  if (!itemHasActiveRoute(pathname, item.routes)) return null;
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    itemKind: "app",
    itemId: item.id,
    itemName: item.name,
    routes: item.routes,
    activeRoute: resolveActiveRoute(pathname, item.routes),
  };
}

function matchShellLink(
  pathname: string,
  section: NavIaSection,
  link: PlatformShellNavItem,
): ResolvedActiveNav | null {
  if (!shellLinkActive(pathname, link.href, link.routes)) return null;
  const routes =
    link.routes ??
    (link.href.startsWith("/dashboard/") || link.href.startsWith("/command/")
      ? [{ path: link.href, label: link.label }]
      : []);
  if (routes.length <= 1) return null;
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    itemKind: "shell",
    itemId: link.href,
    itemName: link.label,
    routes,
    activeRoute: resolveActiveRoute(pathname, routes),
  };
}

function resolveIntelligenceGroup(
  pathname: string,
  section: NavIaSection,
): ResolvedActiveNav | null {
  if (!isIntelligencePath(pathname) || section.links.length === 0) return null;
  const routes: AppRoute[] = section.links.map((link) => ({
    path: link.href,
    label: link.label,
  }));
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    itemKind: "intelligence",
    itemId: "intelligence-surfaces",
    itemName: section.label,
    routes,
    activeRoute: resolveActiveRoute(pathname, routes),
  };
}

const IA_SECTION_ORDER: (keyof CategorizedPlatformNavigation["ia"])[] = [
  "digitalgate",
  "core",
  "infrastructure",
  "industry",
  "grow",
  "intelligence",
  "partners",
  "partner",
  "platformAdmin",
];

/**
 * Resolve the active sidebar application and its horizontal sub-navigation
 * for the current pathname. Returns null when no multi-route context applies.
 */
export function resolveActiveAppNavigation(
  pathname: string,
  ia: CategorizedPlatformNavigation["ia"],
): ResolvedActiveNav | null {
  for (const key of IA_SECTION_ORDER) {
    const section = ia[key];

    const intelligenceMatch = resolveIntelligenceGroup(pathname, section);
    if (intelligenceMatch) return intelligenceMatch;

    for (const app of section.apps) {
      const match = matchAppItem(pathname, section, app);
      if (match && match.routes.length > 1) return match;
      if (match && match.routes.length === 1) continue;
    }

    for (const link of section.links) {
      const match = matchShellLink(pathname, section, link);
      if (match) return match;
    }

    for (const link of section.trailingLinks ?? []) {
      const match = matchShellLink(pathname, section, link);
      if (match) return match;
    }
  }

  return null;
}
