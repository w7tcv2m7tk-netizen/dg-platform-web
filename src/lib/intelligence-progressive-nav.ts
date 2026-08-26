import type { AppRoute } from "@dg/platform-core";
import { routeIsActive } from "@/lib/nav-route-match";

const STORAGE_KEY = "dg-intelligence-revealed-routes";

/** Capability tabs that unlock after the customer visits them from Overview. */
const PROGRESSIVE_PATHS = [
  "/dashboard/health",
  "/dashboard/insights",
  "/dashboard/advisor",
  "/dashboard/reports",
] as const;

function readUnlocked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeUnlocked(paths: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...paths]));
  } catch {
    /* ignore quota / private mode */
  }
}

function isProgressiveRoute(route: AppRoute): boolean {
  return PROGRESSIVE_PATHS.some(
    (path) => route.path === path || route.path.startsWith(`${path}/`),
  );
}

/**
 * Customer Intelligence subnav: Overview is always visible; Advisor / Health /
 * Insights / Reports appear after the customer opens them (usually from the hub).
 */
export function progressiveIntelligenceRoutes(
  routes: AppRoute[],
  pathname: string,
): AppRoute[] {
  const unlocked = readUnlocked();
  let changed = false;

  for (const path of PROGRESSIVE_PATHS) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (!unlocked.has(path)) {
        unlocked.add(path);
        changed = true;
      }
    }
  }
  if (changed) writeUnlocked(unlocked);

  return routes.filter((route) => {
    if (!isProgressiveRoute(route)) return true;
    if (unlocked.has(route.path)) return true;
    return routeIsActive(pathname, route.path, routes);
  });
}
