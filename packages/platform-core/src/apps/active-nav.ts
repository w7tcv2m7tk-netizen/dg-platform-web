import type { AppRoute } from "./manifest";
import type {
  AppNavTreeItem,
  CategorizedPlatformNavigation,
  NavIaSection,
  NavIaSectionId,
  PlatformShellNavItem,
} from "./navigation";
import { flattenAppRoutes } from "./route-tree";

type ParsedNavLocation = {
  pathname: string;
  search: URLSearchParams;
};

function parseNavLocation(value: string): ParsedNavLocation {
  const queryIndex = value.indexOf("?");
  if (queryIndex < 0) return { pathname: value, search: new URLSearchParams() };
  return {
    pathname: value.slice(0, queryIndex),
    search: new URLSearchParams(value.slice(queryIndex + 1)),
  };
}

function routeOwnsLocation(location: string, routePath: string, exact = false): boolean {
  const current = parseNavLocation(location);
  const target = parseNavLocation(routePath);

  for (const [key, value] of target.search.entries()) {
    if (current.search.get(key) !== value) return false;
  }

  if (current.pathname === target.pathname) return true;
  if (exact) return false;
  return current.pathname.startsWith(`${target.pathname}/`);
}

function locationPathname(location: string): string {
  return parseNavLocation(location).pathname;
}

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

/** Match a nav route against the current location. Route query params are constraints. */
export function routeIsActive(location: string, routePath: string, routes: AppRoute[]): boolean {
  if (routeOwnsLocation(location, routePath, true)) return true;

  const route = findRoute(routes, routePath);
  if (
    route?.matchAlso?.some((prefix) => routeOwnsLocation(location, prefix, false))
  ) {
    return true;
  }

  if (route?.children?.length) {
    return itemHasActiveRoute(location, route.children);
  }

  // Hub landings (exact: true) never claim child paths.
  if (route?.exact) return false;

  const leafRoutes = flattenAppRoutes(routes).filter((r) => !r.children?.length);
  // Only yield to siblings that actually own this location, including any query
  // constraint declared by that sibling.
  const siblingOwnsPath = leafRoutes.some(
    (r) => r.path !== routePath && routeOwnsLocation(location, r.path, false),
  );
  if (siblingOwnsPath) return false;

  return routeOwnsLocation(location, routePath, false);
}

export function itemHasActiveRoute(pathname: string, routes: AppRoute[]): boolean {
  for (const route of routes) {
    if (routeIsActive(pathname, route.path, routes)) return true;
  }
  return false;
}

function shellLinkActive(location: string, href: string, routes?: AppRoute[]): boolean {
  if (routes?.length) return itemHasActiveRoute(location, routes);
  const pathname = locationPathname(location);
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

function isIntelligencePath(location: string): boolean {
  const pathname = locationPathname(location);
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

/**
 * How strongly this route set owns the pathname.
 *
 * Primary ownership (pathname equals / is under a declared route.path) always
 * outranks matchAlso-only aliases so cross-section aliases cannot steal chrome.
 * When scoring matchAlso, use the matched alias length — never the longer
 * declared alien path.
 */
function matchSpecificity(location: string, routes: AppRoute[]): number {
  let bestPrimary = -1;
  let bestAlias = -1;

  for (const route of flattenAppRoutes(routes)) {
    if (routeOwnsLocation(location, route.path, route.exact === true)) {
      // Query-constrained child routes naturally outrank generic routes because
      // their declared path is longer.
      bestPrimary = Math.max(bestPrimary, route.path.length);
    }

    for (const also of route.matchAlso ?? []) {
      if (routeOwnsLocation(location, also, false)) {
        bestAlias = Math.max(bestAlias, also.length);
      }
    }
  }

  if (bestPrimary >= 0) {
    return 1_000_000 + bestPrimary;
  }
  return bestAlias;
}

function matchAppItem(
  location: string,
  section: NavIaSection,
  item: AppNavTreeItem,
): ResolvedActiveNav | null {
  if (!itemHasActiveRoute(location, item.routes)) return null;
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    itemKind: "app",
    itemId: item.id,
    itemName: item.name,
    routes: item.routes,
    activeRoute: resolveActiveRoute(location, item.routes),
  };
}

function matchShellLink(
  location: string,
  section: NavIaSection,
  link: PlatformShellNavItem,
): ResolvedActiveNav | null {
  if (!shellLinkActive(location, link.href, link.routes)) return null;
  const routes =
    link.routes ??
    (link.href.startsWith("/dashboard/") ||
    link.href.startsWith("/command/") ||
    link.href.startsWith("/partner/")
      ? [{ path: link.href, label: link.label }]
      : []);
  // Single-route shell links (e.g. Platform Docs) still own chrome — AppContextNav
  // hides horizontal tabs when routes.length <= 1.
  if (routes.length === 0) return null;
  return {
    sectionId: section.id,
    sectionLabel: section.label,
    itemKind: "shell",
    itemId: link.href,
    itemName: link.label,
    routes,
    activeRoute: resolveActiveRoute(location, routes),
  };
}

function resolveIntelligenceGroup(
  location: string,
  section: NavIaSection,
): ResolvedActiveNav | null {
  if (!isIntelligencePath(location) || section.links.length === 0) return null;
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
    activeRoute: resolveActiveRoute(location, routes),
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
  location: string,
  ia: CategorizedPlatformNavigation["ia"],
): ResolvedActiveNav | null {
  let best: ResolvedActiveNav | null = null;
  let bestScore = -1;

  for (const key of IA_SECTION_ORDER) {
    const section = ia[key];

    const intelligenceMatch = resolveIntelligenceGroup(location, section);
    if (intelligenceMatch) {
      const score = matchSpecificity(location, intelligenceMatch.routes);
      if (score > bestScore) {
        best = intelligenceMatch;
        bestScore = score;
      }
    }

    for (const app of section.apps) {
      const match = matchAppItem(location, section, app);
      if (!match) continue;
      // Single-route apps: no horizontal subnav (sidebar is enough) —
      // except Industry, where Template switcher still needs context.
      if (match.routes.length <= 1 && section.id !== "industry") continue;
      const score = matchSpecificity(location, match.routes);
      if (score > bestScore) {
        best = match;
        bestScore = score;
      }
    }

    for (const link of [...section.links, ...(section.trailingLinks ?? [])]) {
      const match = matchShellLink(location, section, link);
      if (!match) continue;
      const score = matchSpecificity(location, match.routes);
      if (score > bestScore) {
        best = match;
        bestScore = score;
      }
    }
  }

  return best;
}
