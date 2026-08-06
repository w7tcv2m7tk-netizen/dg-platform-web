import type { AppRoute } from "@dg/platform-core";

/**
 * Match a nav route against the current pathname.
 * Parent routes (e.g. /dashboard/settings) only match exactly when siblings
 * share the same path prefix — avoids Settings opening on Roadmap/Audit.
 */
export function routeIsActive(pathname: string, routePath: string, routes: AppRoute[]): boolean {
  if (pathname === routePath) return true;

  const hasSiblingUnderPrefix = routes.some(
    (r) => r.path !== routePath && r.path.startsWith(`${routePath}/`),
  );
  if (hasSiblingUnderPrefix) return false;

  return pathname.startsWith(`${routePath}/`);
}

export function itemHasActiveRoute(pathname: string, routes: AppRoute[]): boolean {
  return routes.some((r) => routeIsActive(pathname, r.path, routes));
}
