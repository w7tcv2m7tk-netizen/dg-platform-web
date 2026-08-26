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
  "/dashboard/intelligence",
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
  let best: AppRoute | null = null;
  let bestLen = -1;
  for (const route of flattenAppRoutes(routes)) {
    if (!routeIsActive(pathname, route.path, routes)) continue;
    const len = route.path.length;
    if (len > bestLen) {
      best = route;
      bestLen = len;
    }
  }
  return best;
}

/** Specificity score — longer matching route paths win (avoids /command stealing child apps). */
function matchSpecificity(pathname: string, routes: AppRoute[]): number {
  let best = -1;
  for (const route of flattenAppRoutes(routes)) {
    if (!routeIsActive(pathname, route.path, routes)) continue;
    best = Math.max(best, route.path.length);
    for (const also of route.matchAlso ?? []) {
      if (pathname === also || pathname.startsWith(`${also}/`)) {
        best = Math.max(best, also.length);
      }
    }
  }
  return best;
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
    (link.href.startsWith("/dashboard/") ||
    link.href.startsWith("/command/") ||
    link.href.startsWith("/partner/")
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
 * Prefers the most specific matching app (longest route path) so shared prefixes
 * like `/command` never steal Organisations / Commercial / Product / etc.
 */
export function resolveActiveAppNavigation(
  pathname: string,
  ia: CategorizedPlatformNavigation["ia"],
): ResolvedActiveNav | null {
  let best: ResolvedActiveNav | null = null;
  let bestScore = -1;

  for (const key of IA_SECTION_ORDER) {
    const section = ia[key];

    const intelligenceMatch = resolveIntelligenceGroup(pathname, section);
    if (intelligenceMatch) {
      const score = matchSpecificity(pathname, intelligenceMatch.routes);
      if (score > bestScore) {
        best = intelligenceMatch;
        bestScore = score;
      }
    }

    for (const app of section.apps) {
      const match = matchAppItem(pathname, section, app);
      if (!match) continue;
      // Single-route apps: no horizontal subnav (sidebar is enough).
      if (match.routes.length <= 1) continue;
      const score = matchSpecificity(pathname, match.routes);
      if (score > bestScore) {
        best = match;
        bestScore = score;
      }
    }

    for (const link of [...section.links, ...(section.trailingLinks ?? [])]) {
      const match = matchShellLink(pathname, section, link);
      if (!match) continue;
      const score = matchSpecificity(pathname, match.routes);
      if (score > bestScore) {
        best = match;
        bestScore = score;
      }
    }
  }

  return best;
}
