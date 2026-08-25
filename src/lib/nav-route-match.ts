import type { AppRoute } from "@dg/platform-core";
import { flattenAppRoutes } from "@dg/platform-core";

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

/**
 * Match a nav route against the current pathname.
 * Parent routes (e.g. /dashboard/settings) only match exactly when siblings
 * share the same path prefix — avoids Settings opening on Roadmap/Audit.
 * Group routes with `children` are active when any descendant is active.
 */
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
