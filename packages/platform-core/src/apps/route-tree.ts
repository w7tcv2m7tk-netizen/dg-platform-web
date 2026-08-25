import type { AppRoute } from "./manifest";

/** Flatten nested AppRoute trees for active-route matching and prefetch. */
export function flattenAppRoutes(routes: AppRoute[]): AppRoute[] {
  const out: AppRoute[] = [];
  for (const route of routes) {
    out.push(route);
    if (route.children?.length) {
      out.push(...flattenAppRoutes(route.children));
    }
  }
  return out;
}
